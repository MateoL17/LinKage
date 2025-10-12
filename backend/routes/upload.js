import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { gfs, initializeGridFS } from '../config/gridfs.js';
import User from '../models/User.js';
import Post from '../models/Post.js';

const router = express.Router();
const { ObjectId } = mongoose.Types;

// Middleware de autenticación - RENOMBRAR A "auth" para consistencia
const auth = (req, res, next) => {
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

// Configuración de multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  }
});

// Middleware para verificar GridFS
const ensureGridFS = async (req, res, next) => {
  try {
    if (!gfs) {
      console.log('🔄 GridFS no inicializado, intentando inicializar...');
      await initializeGridFS();
    }
    
    if (!gfs) {
      return res.status(500).json({ error: 'Sistema de archivos no disponible' });
    }
    
    next();
  } catch (error) {
    console.error('❌ Error inicializando GridFS:', error);
    return res.status(500).json({ error: 'Error inicializando sistema de archivos' });
  }
};

// ✅ SUBIR AVATAR - VERSIÓN DEFINITIVA
router.post('/avatar', auth, ensureGridFS, upload.single('foto'), async (req, res) => {
  let uploadStream = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ninguna imagen' });
    }

    if (!gfs) {
      return res.status(500).json({ error: 'Sistema de archivos no disponible' });
    }

    const usuario = await User.findOne({ usuario: req.user.usuario });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('📤 Subiendo avatar para usuario:', usuario.usuario);

    // Eliminar avatar anterior si existe
    if (usuario.avatarFileId) {
      try {
        await gfs.delete(new ObjectId(usuario.avatarFileId));
        console.log('🗑️ Avatar anterior eliminado:', usuario.avatarFileId);
      } catch (deleteError) {
        console.log('ℹ️ No se pudo eliminar avatar anterior:', deleteError.message);
      }
    }

    // Crear nombre único para el archivo
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const filename = `avatar-${usuario.usuario}-${timestamp}-${randomSuffix}`;

    console.log('📝 Creando upload stream para:', filename);

    // ✅ ENFOQUE CORREGIDO: Usar uploadStream.id directamente
    uploadStream = gfs.openUploadStream(filename, {
      metadata: {
        usuario: req.user.usuario,
        uploadDate: new Date(),
        mimeType: req.file.mimetype,
        originalName: req.file.originalname
      }
    });

    // Guardar el fileId ANTES de empezar la escritura
    const fileId = uploadStream.id;
    console.log('🆔 File ID generado:', fileId);

    if (!fileId) {
      throw new Error('No se pudo generar el ID del archivo');
    }

    // ✅ USAR UNA PROMESA PARA MANEJAR LA SUBIDA
    const uploadResult = await new Promise((resolve, reject) => {
      uploadStream.on('finish', () => {
        console.log('✅ Upload completado para fileId:', fileId);
        resolve({ success: true, fileId });
      });

      uploadStream.on('error', (error) => {
        console.error('❌ Error en upload stream:', error);
        reject(new Error(`Error subiendo archivo: ${error.message}`));
      });

      // Escribir el buffer
      uploadStream.end(req.file.buffer, (error) => {
        if (error) {
          console.error('❌ Error escribiendo buffer:', error);
          reject(new Error(`Error escribiendo archivo: ${error.message}`));
        } else {
          console.log('✅ Buffer escrito correctamente');
        }
      });
    });

    console.log('✅ Archivo subido a GridFS. FileId:', uploadResult.fileId);

    // Buscar el archivo recién subido para verificar
    const files = await gfs.find({ _id: new ObjectId(uploadResult.fileId) }).toArray();
    if (files.length === 0) {
      throw new Error('El archivo subido no se encontró en GridFS');
    }

    console.log('✅ Archivo verificado en GridFS:', files[0].filename);

    // Actualizar usuario con el nuevo fileId
    const usuarioActualizado = await User.findByIdAndUpdate(
      usuario._id,
      { 
        avatarFileId: uploadResult.fileId,
        foto: `/api/upload/avatar/${req.user.usuario}`
      },
      { new: true }
    );

    console.log('✅ Usuario actualizado con nuevo avatar');

    res.json({
      mensaje: 'Avatar subido exitosamente',
      foto: `/api/upload/avatar/${req.user.usuario}`,
      fileId: uploadResult.fileId,
      usuario: {
        usuario: usuarioActualizado.usuario,
        email: usuarioActualizado.email,
        foto: usuarioActualizado.foto,
        biografia: usuarioActualizado.biografia
      }
    });

  } catch (error) {
    console.error('❌ Error en upload avatar:', error);
    
    // Si hay un error y el stream estaba abierto, intentar limpiar
    if (uploadStream && uploadStream.id) {
      try {
        await gfs.delete(new ObjectId(uploadStream.id));
        console.log('🗑️ Archivo incompleto eliminado:', uploadStream.id);
      } catch (cleanupError) {
        console.log('⚠️ No se pudo limpiar archivo incompleto:', cleanupError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Error al cambiar el avatar: ' + error.message 
    });
  }
});

// ✅ SERVIR AVATAR - CON CACHE DESHABILITADO
router.get('/avatar/:usuario', async (req, res) => {
  try {
    const usuario = await User.findOne({ usuario: req.params.usuario });
    
    if (!usuario || !usuario.avatarFileId) {
      console.log('ℹ️ Usando avatar por defecto para:', req.params.usuario);
      return res.redirect('/img/perfil_default.png');
    }

    // Inicializar GridFS si es necesario
    if (!gfs) {
      await initializeGridFS();
    }

    if (!gfs) {
      console.error('❌ GridFS no disponible para servir avatar');
      return res.redirect('/img/perfil_default.png');
    }

    // Buscar el archivo en GridFS
    const files = await gfs.find({ _id: new ObjectId(usuario.avatarFileId) }).toArray();
    
    if (!files || files.length === 0) {
      console.log('❌ Archivo no encontrado en GridFS:', usuario.avatarFileId);
      return res.redirect('/img/perfil_default.png');
    }

    const file = files[0];
    console.log('✅ Sirviendo avatar desde GridFS:', file.filename);
    
    // Configurar headers - DESHABILITAR CACHE
    res.set('Content-Type', file.metadata?.mimeType || 'image/jpeg');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // Stream el archivo
    const downloadStream = gfs.openDownloadStream(file._id);
    
    downloadStream.on('error', (error) => {
      console.error('❌ Error sirviendo avatar:', error);
      res.redirect('/img/perfil_default.png');
    });

    downloadStream.pipe(res);

  } catch (error) {
    console.error('❌ Error obteniendo avatar:', error);
    res.redirect('/img/perfil_default.png');
  }
});

// ✅ ELIMINAR AVATAR
router.delete('/avatar', auth, ensureGridFS, async (req, res) => {
  try {
    const usuario = await User.findOne({ usuario: req.user.usuario });
    
    if (!usuario || !usuario.avatarFileId) {
      return res.status(404).json({ error: 'No hay avatar para eliminar' });
    }

    console.log('🗑️ Eliminando avatar para usuario:', usuario.usuario);

    // Eliminar de GridFS
    await gfs.delete(new ObjectId(usuario.avatarFileId));

    // Actualizar usuario
    await User.findByIdAndUpdate(usuario._id, {
      avatarFileId: null,
      foto: '/img/perfil_default.png'
    });

    console.log('✅ Avatar eliminado exitosamente');

    res.json({ mensaje: 'Avatar eliminado exitosamente' });

  } catch (error) {
    console.error('❌ Error eliminando avatar:', error);
    res.status(500).json({ error: 'Error eliminando avatar' });
  }
});

export default router;
