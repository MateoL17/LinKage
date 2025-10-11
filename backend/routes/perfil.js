import express from 'express';
import jwt from 'jsonwebtoken'; // ← IMPORTAR DIRECTAMENTE
import User from '../models/User.js';

const router = express.Router();

// Middleware de autenticación CORREGIDO
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  // Usar jwt directamente
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

// Ruta para actualizar perfil
router.put('/perfil', authenticateToken, async (req, res) => {
  try {
    const { email, biografia } = req.body;
    const usuarioId = req.user.id;

    console.log('📝 Actualizando perfil para usuario ID:', usuarioId);
    console.log('📝 Datos recibidos:', { email, biografia });

    // Validar datos requeridos
    if (!email) {
      return res.status(400).json({ error: 'El email es requerido' });
    }

    // Verificar que el usuario existe
    const usuarioExistente = await User.findById(usuarioId);
    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar en la base de datos
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

// Ruta para obtener datos del perfil
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

export default router;
