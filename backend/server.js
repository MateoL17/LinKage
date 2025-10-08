import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

dotenv.config();

const app = express();
const server = createServer(app);

// Solución para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Ruta raíz del proyecto (sube un nivel desde /backend)
const projectRoot = path.join(__dirname, '..');

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// ✅ SERVIR ARCHIVOS ESTÁTICOS DESDE LA CARPETA RAIZ DEL PROYECTO
app.use(express.static(projectRoot));

// ✅ SERVIR ARCHIVOS ESTÁTICOS ESPECÍFICOS
app.use('/css', express.static(path.join(projectRoot, 'css')));
app.use('/js', express.static(path.join(projectRoot, 'js')));
app.use('/img', express.static(path.join(projectRoot, 'img')));

// Conexión a MongoDB Local - BASE DE DATOS: LinKage
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/LinKage';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB - Base de datos: LinKage'))
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    console.log('💡 Verifica que:');
    console.log('   1. MongoDB esté ejecutándose');
    console.log('   2. La base de datos "LinKage" exista');
    console.log('   3. La URI sea: mongodb://localhost:27017/LinKage');
  });

// Esquemas de MongoDB
const userSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  foto: { type: String, default: 'img/perfil_default.png' },
  fechaRegistro: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  usuario: { type: String, required: true },
  contenido: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 }
});

const messageSchema = new mongoose.Schema({
  emisor: { type: String, required: true },
  receptor: { type: String, required: true },
  contenido: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  leido: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);
const Message = mongoose.model('Message', messageSchema);

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secreto_temporal', (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// Routes - Autenticación
app.post('/api/register', async (req, res) => {
  try {
    const { usuario, email, password } = req.body;

    // Validaciones básicas
    if (!usuario || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar si el usuario ya existe
    const usuarioExistente = await User.findOne({ 
      $or: [{ usuario }, { email }] 
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'El usuario o email ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const nuevoUsuario = new User({
      usuario,
      email,
      password: hashedPassword
    });

    await nuevoUsuario.save();

    res.status(201).json({ 
      mensaje: 'Usuario registrado exitosamente',
      usuario: {
        usuario: nuevoUsuario.usuario,
        email: nuevoUsuario.email,
        foto: nuevoUsuario.foto
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Buscar usuario
    const usuarioEncontrado = await User.findOne({ usuario });
    if (!usuarioEncontrado) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuarioEncontrado.password);
    if (!passwordValida) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    // Generar token
    const token = jwt.sign(
      { 
        usuario: usuarioEncontrado.usuario, 
        id: usuarioEncontrado._id,
        email: usuarioEncontrado.email 
      },
      process.env.JWT_SECRET || 'secreto_temporal',
      { expiresIn: '24h' }
    );

    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        usuario: usuarioEncontrado.usuario,
        email: usuarioEncontrado.email,
        foto: usuarioEncontrado.foto
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Routes - Perfil
app.get('/api/perfil', authenticateToken, async (req, res) => {
  try {
    const usuario = await User.findOne(
      { usuario: req.user.usuario },
      'usuario email foto fechaRegistro'
    );
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error obteniendo perfil' });
  }
});

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(projectRoot, 'img/uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.usuario + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB límite
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  }
});

// Ruta para subir foto de perfil
app.post('/api/upload/foto', authenticateToken, upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ninguna imagen' });
    }

    const fotoUrl = '/img/uploads/' + req.file.filename;

    const usuarioActualizado = await User.findOneAndUpdate(
      { usuario: req.user.usuario },
      { foto: fotoUrl },
      { new: true }
    );

    res.json({
      mensaje: 'Foto subida exitosamente',
      foto: fotoUrl,
      usuario: {
        usuario: usuarioActualizado.usuario,
        email: usuarioActualizado.email,
        foto: usuarioActualizado.foto
      }
    });

  } catch (error) {
    console.error('Error subiendo foto:', error);
    res.status(500).json({ error: 'Error subiendo foto' });
  }
});

// Routes - Posts
app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find().sort({ fecha: -1 }).limit(50);
    res.json(posts);
  } catch (error) {
    console.error('Error obteniendo posts:', error);
    res.status(500).json({ error: 'Error obteniendo posts' });
  }
});

app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { contenido } = req.body;

    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({ error: 'El contenido no puede estar vacío' });
    }

    const nuevoPost = new Post({
      usuario: req.user.usuario,
      contenido: contenido.trim()
    });

    await nuevoPost.save();
    
    // Notificar a todos los clientes via WebSocket
    io.emit('nuevoPost', nuevoPost);

    res.status(201).json(nuevoPost);
  } catch (error) {
    console.error('Error creando post:', error);
    res.status(500).json({ error: 'Error creando post' });
  }
});

// Routes - Mensajes
app.get('/api/messages/:receptor', authenticateToken, async (req, res) => {
  try {
    const mensajes = await Message.find({
      $or: [
        { emisor: req.user.usuario, receptor: req.params.receptor },
        { emisor: req.params.receptor, receptor: req.user.usuario }
      ]
    }).sort({ fecha: 1 });

    res.json(mensajes);
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({ error: 'Error obteniendo mensajes' });
  }
});

// Route para obtener usuarios (para el chat)
app.get('/api/usuarios', authenticateToken, async (req, res) => {
  try {
    const usuarios = await User.find(
      { usuario: { $ne: req.user.usuario } },
      'usuario foto'
    );
    res.json(usuarios);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

// Ruta de salud para probar el servidor
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor Linkage funcionando',
    database: 'LinKage',
    timestamp: new Date().toISOString()
  });
});

// ✅ RUTAS PARA LAS PÁGINAS HTML (desde la carpeta raíz del proyecto)
// Redirigir la raíz a sesion.html
app.get('/', (req, res) => {
  res.redirect('/sesion');
});

app.get('/sesion', (req, res) => {
  res.sendFile(path.join(projectRoot, 'sesion.html'));
});

app.get('/principal', (req, res) => {
  res.sendFile(path.join(projectRoot, 'principal.html'));
});

app.get('/terminos', (req, res) => {
  res.sendFile(path.join(projectRoot, 'terminos.html'));
});

// WebSocket para chat en vivo
io.on('connection', (socket) => {
  console.log('🔌 Usuario conectado:', socket.id);

  socket.on('unirseSala', (usuario) => {
    socket.join(usuario);
    console.log(`👤 Usuario ${usuario} unido a la sala`);
  });

  socket.on('enviarMensaje', async (data) => {
    try {
      const { emisor, receptor, contenido } = data;

      if (!emisor || !receptor || !contenido) {
        socket.emit('errorMensaje', { error: 'Datos incompletos' });
        return;
      }

      const nuevoMensaje = new Message({
        emisor,
        receptor,
        contenido: contenido.trim()
      });

      await nuevoMensaje.save();

      // Enviar a ambos usuarios
      io.to(emisor).to(receptor).emit('nuevoMensaje', nuevoMensaje);
      console.log(`💬 Mensaje de ${emisor} a ${receptor}`);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      socket.emit('errorMensaje', { error: 'Error enviando mensaje' });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Usuario desconectado:', socket.id);
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor Linkage ejecutándose en http://localhost:${PORT}`);
  console.log(`📁 Sirviendo archivos desde: ${projectRoot}`);
  console.log(`📊 MongoDB: ${MONGODB_URI}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Configurado' : 'Usando valor por defecto'}`);
  console.log(`📍 Iniciando siempre en: http://localhost:${PORT}/sesion`);
});