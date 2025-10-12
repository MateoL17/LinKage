import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Match from '../models/Match.js';

const router = express.Router();

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secreto_temporal', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Ruta para obtener usuarios para descubrir
router.get('/descubrir', authenticateToken, async (req, res) => {
  try {
    const usuarioActivo = await User.findById(req.user.id);
    
    if (!usuarioActivo) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener todos los usuarios excepto el actual
    const usuarios = await User.find({ 
      _id: { $ne: req.user.id } 
    }).select('usuario foto biografia fechaNacimiento nombre');

    console.log(`👥 ${usuarios.length} usuarios encontrados para descubrir`);

    res.json(usuarios);
  } catch (error) {
    console.error('❌ Error obteniendo usuarios para descubrir:', error);
    res.status(500).json({ error: 'Error obteniendo usuarios: ' + error.message });
  }
});

// Ruta para dar like - CORREGIDA
router.post('/like', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 ENDPOINT /like EJECUTÁNDOSE');
    console.log('📨 Headers:', req.headers);
    console.log('📦 Body recibido:', req.body);
    
    const { usuarioReceptor, usuarioEmisor } = req.body;
    
    if (!usuarioReceptor || !usuarioEmisor) {
      console.error('❌ Datos incompletos en el body');
      return res.status(400).json({ 
        error: 'Datos incompletos',
        recibido: req.body 
      });
    }

    console.log(`❤ Like de @${usuarioEmisor} a @${usuarioReceptor}`);

    // Verificar que el usuario receptor existe
    const receptor = await User.findOne({ usuario: usuarioReceptor });
    if (!receptor) {
      console.error('❌ Usuario receptor no encontrado:', usuarioReceptor);
      return res.status(404).json({ error: 'Usuario receptor no encontrado' });
    }

    // Verificar que el usuario emisor existe
    const emisor = await User.findOne({ usuario: usuarioEmisor });
    if (!emisor) {
      console.error('❌ Usuario emisor no encontrado:', usuarioEmisor);
      return res.status(404).json({ error: 'Usuario emisor no encontrado' });
    }

    console.log('✅ Ambos usuarios encontrados en la base de datos');

    // CONTINÚA CON EL RESTO DEL CÓDIGO ORIGINAL...
    // Verificar si ya existe un match entre estos usuarios
    const matchExistente = await Match.existeMatch(usuarioEmisor, usuarioReceptor);
    
    let matchReciproco = false;
    let matchCreado = null;

    if (matchExistente) {
      console.log('🔄 Match existente encontrado, verificando reciprocidad...');
      
      // Si ya existe un match, verificar si podemos hacerlo recíproco
      if (matchExistente.usuario1 === usuarioEmisor) {
        matchExistente.usuario1Acepto = true;
      } else if (matchExistente.usuario2 === usuarioEmisor) {
        matchExistente.usuario2Acepto = true;
      }
      
      await matchExistente.save();
      
      // Verificar si ahora es match recíproco
      matchReciproco = matchExistente.esMatchReciproco();
      matchCreado = matchExistente;
      
    } else {
      console.log('🆕 Creando nuevo match...');
      // Crear nuevo match
      matchCreado = await Match.crearMatch(usuarioEmisor, usuarioReceptor);
      
      // Verificar si hay un like recíproco
      const likeReciproco = await Match.existeMatch(usuarioReceptor, usuarioEmisor);
      if (likeReciproco) {
        if (likeReciproco.usuario1 === usuarioReceptor) {
          likeReciproco.usuario1Acepto = true;
        } else {
          likeReciproco.usuario2Acepto = true;
        }
        await likeReciproco.save();
        matchReciproco = likeReciproco.esMatchReciproco();
      }
    }

    console.log(`✅ Like procesado. Match recíproco: ${matchReciproco}`);

    res.json({
      success: true,
      mensaje: matchReciproco ? '¡Match encontrado!' : 'Like enviado correctamente',
      match: matchReciproco,
      matchReciproco: matchReciproco,
      data: matchCreado
    });

  } catch (error) {
    console.error('❌ Error en endpoint /like:', error);
    
    if (error.code === 11000) {
      console.error('❌ Error de duplicado en MongoDB');
      return res.status(400).json({ 
        error: 'Ya existe un match entre estos usuarios' 
      });
    }
    
    res.status(500).json({ 
      error: 'Error enviando like: ' + error.message 
    });
  }
});

// Ruta para obtener usuarios que me dieron like - CORREGIDA
router.get('/quienes-me-dieron-like', authenticateToken, async (req, res) => {
  try {
    const usuarioActivo = await User.findById(req.user.id);
    
    if (!usuarioActivo) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener likes unidireccionales donde el usuario activo es el receptor
    const likesRecibidos = await Match.obtenerLikesUnidireccionales(usuarioActivo.usuario);
    
    console.log(`❤ ${likesRecibidos.length} usuarios me dieron like`);

    // Obtener información de los usuarios que dieron like
    const usuariosConLike = await Promise.all(
      likesRecibidos.map(async (match) => {
        const usuarioLike = match.usuario1 === usuarioActivo.usuario ? match.usuario2 : match.usuario1;
        const usuarioInfo = await User.findOne({ usuario: usuarioLike });
        
        return usuarioInfo ? {
          usuario: usuarioInfo.usuario,
          foto: usuarioInfo.foto,
          biografia: usuarioInfo.biografia,
          fechaLike: match.fechaMatch
        } : null;
      })
    );

    // Filtrar resultados nulos
    const resultados = usuariosConLike.filter(usuario => usuario !== null);

    res.json(resultados);
  } catch (error) {
    console.error('❌ Error obteniendo likes recibidos:', error);
    res.status(500).json({ error: 'Error obteniendo likes: ' + error.message });
  }
});

// Ruta para obtener matches - CORREGIDA
router.get('/matches', authenticateToken, async (req, res) => {
  try {
    const usuarioActivo = await User.findById(req.user.id);
    
    if (!usuarioActivo) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener matches recíprocos
    const matchesReciprocos = await Match.find({
      $or: [
        { usuario1: usuarioActivo.usuario },
        { usuario2: usuarioActivo.usuario }
      ],
      usuario1Acepto: true,
      usuario2Acepto: true,
      activo: true
    });

    console.log(`💜 ${matchesReciprocos.length} matches recíprocos encontrados`);

    // Obtener información de los usuarios en los matches
    const matchesConInfo = await Promise.all(
      matchesReciprocos.map(async (match) => {
        const usuarioMatch = match.usuario1 === usuarioActivo.usuario ? match.usuario2 : match.usuario1;
        const usuarioInfo = await User.findOne({ usuario: usuarioMatch });
        
        return usuarioInfo ? {
          usuario: usuarioInfo.usuario,
          foto: usuarioInfo.foto,
          biografia: usuarioInfo.biografia,
          fechaMatch: match.fechaMatch
        } : null;
      })
    );

    // Filtrar resultados nulos
    const resultados = matchesConInfo.filter(match => match !== null);

    res.json(resultados);
  } catch (error) {
    console.error('❌ Error obteniendo matches:', error);
    res.status(500).json({ error: 'Error obteniendo matches: ' + error.message });
  }
});

export default router;
