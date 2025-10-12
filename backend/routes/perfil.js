import express from 'express';
import jwt from 'jsonwebtoken';
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
      console.error('❌ Error verificando token:', err);
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    console.log('✅ Usuario autenticado:', user.usuario);
    next();
  });
};

// Ruta para obtener datos del perfil del usuario autenticado
router.get('/perfil', authenticateToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      usuario: usuario.usuario,
      email: usuario.email,
      foto: usuario.foto,
      biografia: usuario.biografia,
      fechaRegistro: usuario.fechaRegistro
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error obteniendo perfil: ' + error.message });
  }
});

// Ruta para obtener datos del usuario "general" (si es necesario)
router.get('/general', authenticateToken, async (req, res) => {
  try {
    // Crear un perfil "general" simulado
    res.json({
      usuario: 'general',
      foto: '/img/perfil_default.png',
      biografia: 'Chat general de la comunidad',
      fechaRegistro: new Date()
    });
  } catch (error) {
    console.error('Error obteniendo perfil general:', error);
    res.status(500).json({ error: 'Error obteniendo perfil general' });
  }
});

// Ruta para obtener usuario por nombre de usuario - NUEVA RUTA
router.get('/usuarios/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    
    console.log('🔍 Buscando usuario:', username);

    const usuario = await User.findOne({ usuario: username });
    
    if (!usuario) {
      console.log('❌ Usuario no encontrado:', username);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('✅ Usuario encontrado:', usuario.usuario);

    res.json({
      usuario: usuario.usuario,
      foto: usuario.foto,
      biografia: usuario.biografia,
      email: usuario.email,
      fechaRegistro: usuario.fechaRegistro
    });
  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error obteniendo usuario: ' + error.message });
  }
});

// Ruta alternativa para obtener perfil de otro usuario
router.get('/perfil/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    
    console.log('🔍 Buscando perfil de:', username);

    const usuario = await User.findOne({ usuario: username });
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      usuario: usuario.usuario,
      foto: usuario.foto,
      biografia: usuario.biografia,
      fechaRegistro: usuario.fechaRegistro
    });
  } catch (error) {
    console.error('Error obteniendo perfil de usuario:', error);
    res.status(500).json({ error: 'Error obteniendo perfil: ' + error.message });
  }
});

// Ruta para actualizar perfil
router.put('/perfil', authenticateToken, async (req, res) => {
  try {
    const { email, biografia } = req.body;
    const usuarioId = req.user.id;

    console.log('📝 Actualizando perfil para usuario ID:', usuarioId);
    console.log('📝 Datos recibidos:', { email, biografia });

    if (!email) {
      return res.status(400).json({ error: 'El email es requerido' });
    }

    const usuarioExistente = await User.findById(usuarioId);
    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioActualizado = await User.findByIdAndUpdate(
      usuarioId,
      { 
        email: email,
        biografia: biografia || ''
      },
      { new: true, runValidators: true }
    );

    console.log('✅ Perfil actualizado en MongoDB:', {
      usuario: usuarioActualizado.usuario,
      email: usuarioActualizado.email,
      biografia: usuarioActualizado.biografia
    });

    res.json({
      mensaje: 'Perfil actualizado exitosamente',
      email: usuarioActualizado.email,
      biografia: usuarioActualizado.biografia
    });
  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'El email ya está en uso' });
    }
    
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

export default router;
