// backend/routes/mensajes.js
import express from 'express';
import jwt from 'jsonwebtoken';
import Mensaje from '../models/Message.js';
import User from '../models/User.js';

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
      console.error('❌ Error verificando token en mensajes:', err);
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Ruta para obtener conversaciones
router.get('/conversaciones', authenticateToken, async (req, res) => {
  try {
    const usuarioActivo = await User.findById(req.user.id);
    
    if (!usuarioActivo) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`🔍 Buscando conversaciones para: @${usuarioActivo.usuario}`);

    // Obtener mensajes donde el usuario es emisor o receptor
    const mensajes = await Mensaje.find({
      $or: [
        { emisor: usuarioActivo.usuario },
        { receptor: usuarioActivo.usuario }
      ]
    }).sort({ fecha: -1 });

    // Agrupar por conversación
    const conversacionesMap = new Map();

    mensajes.forEach(mensaje => {
      const otroUsuario = mensaje.emisor === usuarioActivo.usuario 
        ? mensaje.receptor 
        : mensaje.emisor;
      
      // ✅ EXCLUIR el chat general
      if (otroUsuario === 'general' || otroUsuario === '@general') {
        return;
      }
      
      if (!conversacionesMap.has(otroUsuario)) {
        conversacionesMap.set(otroUsuario, {
          usuario: otroUsuario,
          ultimoMensaje: mensaje.contenido,
          ultimaVez: new Date(mensaje.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          fecha: mensaje.fecha
        });
      }
    });

    const conversaciones = Array.from(conversacionesMap.values())
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    console.log(`💬 ${conversaciones.length} conversaciones encontradas para @${usuarioActivo.usuario}`);

    res.json(conversaciones);
  } catch (error) {
    console.error('❌ Error obteniendo conversaciones:', error);
    res.status(500).json({ error: 'Error obteniendo conversaciones: ' + error.message });
  }
});

// Ruta para obtener mensajes de una conversación específica
router.get('/conversacion/:usuario', authenticateToken, async (req, res) => {
  try {
    const { usuario } = req.params;
    const usuarioActivo = await User.findById(req.user.id);
    
    if (!usuarioActivo) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log(`📨 Cargando mensajes entre @${usuarioActivo.usuario} y @${usuario}`);

    const mensajes = await Mensaje.find({
      $or: [
        { emisor: usuarioActivo.usuario, receptor: usuario },
        { emisor: usuario, receptor: usuarioActivo.usuario }
      ]
    }).sort({ fecha: 1 });

    console.log(`✅ ${mensajes.length} mensajes cargados para conversación con @${usuario}`);

    // Enriquecer mensajes con información de usuario
    const mensajesEnriquecidos = await Promise.all(
      mensajes.map(async (mensaje) => {
        let fotoEmisor;
        
        if (mensaje.emisor === usuarioActivo.usuario) {
          fotoEmisor = usuarioActivo.foto;
        } else {
          const usuarioEmisor = await User.findOne({ usuario: mensaje.emisor });
          fotoEmisor = usuarioEmisor?.foto || '/img/perfil_default.png';
        }
        
        return {
          _id: mensaje._id,
          emisor: mensaje.emisor,
          receptor: mensaje.receptor,
          contenido: mensaje.contenido,
          fecha: mensaje.fecha,
          foto: fotoEmisor
        };
      })
    );

    res.json(mensajesEnriquecidos);
  } catch (error) {
    console.error('❌ Error obteniendo mensajes de conversación:', error);
    res.status(500).json({ error: 'Error obteniendo mensajes: ' + error.message });
  }
});

// Ruta para enviar mensaje
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { emisor, receptor, contenido } = req.body;
    
    console.log(`📨 Mensaje de @${emisor} a @${receptor}: ${contenido}`);

    // Validar que el contenido no esté vacío
    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    // Verificar que el receptor existe (excepto para chat general)
    if (receptor !== 'general' && receptor !== '@general') {
      const usuarioReceptor = await User.findOne({ usuario: receptor });
      if (!usuarioReceptor) {
        return res.status(404).json({ error: 'Usuario receptor no encontrado' });
      }
    }

    // Crear mensaje
    const nuevoMensaje = new Mensaje({
      emisor,
      receptor,
      contenido: contenido.trim(),
      fecha: new Date()
    });

    await nuevoMensaje.save();

    console.log('✅ Mensaje guardado en base de datos:', nuevoMensaje._id);

    // Obtener información del emisor para enriquecer la respuesta
    const usuarioEmisor = await User.findOne({ usuario: emisor });
    
    const mensajeEnriquecido = {
      _id: nuevoMensaje._id,
      emisor: nuevoMensaje.emisor,
      receptor: nuevoMensaje.receptor,
      contenido: nuevoMensaje.contenido,
      fecha: nuevoMensaje.fecha,
      foto: usuarioEmisor?.foto || '/img/perfil_default.png'
    };

    res.json({
      mensaje: 'Mensaje enviado exitosamente',
      mensaje: mensajeEnriquecido
    });

  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Datos del mensaje inválidos' });
    }
    
    res.status(500).json({ error: 'Error enviando mensaje: ' + error.message });
  }
});

// Ruta para enviar mensaje privado
router.post('/enviar', authenticateToken, async (req, res) => {
  try {
    const { emisor, receptor, contenido } = req.body;
    
    console.log(`📨 Mensaje privado de @${emisor} a @${receptor}: ${contenido}`);

    // Validar que el contenido no esté vacío
    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    // Verificar que el receptor existe
    const usuarioReceptor = await User.findOne({ usuario: receptor });
    if (!usuarioReceptor) {
      return res.status(404).json({ error: 'Usuario receptor no encontrado' });
    }

    // Crear mensaje
    const nuevoMensaje = new Mensaje({
      emisor,
      receptor,
      contenido: contenido.trim(),
      fecha: new Date()
    });

    await nuevoMensaje.save();

    console.log('✅ Mensaje privado guardado en base de datos:', nuevoMensaje._id);

    // Obtener información del emisor para enriquecer la respuesta
    const usuarioEmisor = await User.findOne({ usuario: emisor });
    
    const mensajeEnriquecido = {
      _id: nuevoMensaje._id,
      emisor: nuevoMensaje.emisor,
      receptor: nuevoMensaje.receptor,
      contenido: nuevoMensaje.contenido,
      fecha: nuevoMensaje.fecha,
      foto: usuarioEmisor?.foto || '/img/perfil_default.png'
    };

    res.json({
      success: true,
      mensaje: 'Mensaje enviado exitosamente',
      mensaje: mensajeEnriquecido
    });

  } catch (error) {
    console.error('❌ Error enviando mensaje privado:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Datos del mensaje inválidos' });
    }
    
    res.status(500).json({ error: 'Error enviando mensaje: ' + error.message });
  }
});

export default router;
