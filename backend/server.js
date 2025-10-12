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

// Importar modelos
import User from './models/User.js';
import Post from './models/Post.js';
import Message from './models/Message.js';

// Importar rutas
import perfilRoutes from './routes/perfil.js';
import uploadRoutes from './routes/upload.js';
import descubrirRoutes from './routes/descubrir.js';
import mensajesRoutes from './routes/mensajes.js';

// Importar GridFS
import { initializeGridFS } from './config/gridfs.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Solución para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta raíz del proyecto (sube un nivel desde /backend)
const projectRoot = path.join(__dirname, '..');

// =============================================
// CONFIGURACIÓN CORS MEJORADA
// =============================================
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (como mobile apps, curl, postman)
    if (!origin) {
      console.log('🌐 Request sin origin - Permitido');
      return callback(null, true);
    }
    
    // Lista de dominios permitidos (actualizada)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://192.168.100.6:3000',
      'http://192.168.100.6:3001',
      'https://*.ngrok.io',
      'http://*.ngrok.io',
      'https://*.ngrok-free.app',
      'http://*.ngrok-free.app',
      'https://*.ngrok-free.dev',
      'http://*.ngrok-free.dev'
    ];

    console.log('🔍 Verificando CORS para origen:', origin);

    // Verificar si el origen está permitido
    const isAllowed = allowedOrigins.some(allowed => {
      // Coincidencia exacta
      if (origin === allowed) {
        console.log('✅ Origen permitido (coincidencia exacta):', origin);
        return true;
      }
      
      // Coincidencia con wildcard para ngrok
      if (allowed.includes('*') && origin.includes(allowed.replace('*.', ''))) {
        console.log('✅ Origen permitido (wildcard):', origin);
        return true;
      }
      
      // Coincidencia parcial para subdominios de ngrok
      if ((allowed.includes('ngrok.io') && origin.includes('ngrok.io')) ||
          (allowed.includes('ngrok-free.app') && origin.includes('ngrok-free.app')) ||
          (allowed.includes('ngrok-free.dev') && origin.includes('ngrok-free.dev'))) {
        console.log('✅ Origen permitido (subdominio ngrok):', origin);
        return true;
      }
      
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('🚫 Origen bloqueado por CORS:', origin);
      console.log('📋 Orígenes permitidos:', allowedOrigins);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// =============================================
// CONFIGURAR SOCKET.IO ANTES DE LOS MIDDLEWARE
// =============================================
const io = new Server(server, {
  cors: corsOptions
});

// =============================================
// MIDDLEWARE
// =============================================
app.use(cors(corsOptions));

// Middleware para preflight requests
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// SERVIR ARCHIVOS ESTÁTICOS
app.use(express.static(projectRoot));
app.use('/css', express.static(path.join(projectRoot, 'css')));
app.use('/js', express.static(path.join(projectRoot, 'js')));
app.use('/img', express.static(path.join(projectRoot, 'img')));

// Middleware temporal para debug de CORS
app.use((req, res, next) => {
  console.log('🌐 Request recibida:', {
    method: req.method,
    url: req.url,
    origin: req.get('origin'),
    host: req.get('host')
  });
  next();
});

// =============================================
// MIDDLEWARE DE AUTENTICACIÓN
// =============================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secreto_temporal', (err, user) => {
    if (err) {
      console.error('❌ Error verificando token:', err.message);
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/LinKage';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Conectado a MongoDB - Base de datos: LinKage');
    try {
      await initializeGridFS();
      console.log('✅ GridFS inicializado y listo');
    } catch (error) {
      console.error('❌ Error crítico: No se pudo inicializar GridFS:', error);
    }
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
  });

// =============================================
// USAR RUTAS
// =============================================

app.use('/api/perfil', perfilRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/usuarios', descubrirRoutes);
app.use('/api/mensajes', mensajesRoutes);
app.use('/api', descubrirRoutes);
app.use('/api', perfilRoutes);

// =============================================
// RUTAS DE AUTENTICACIÓN
// =============================================
app.post('/api/register', async (req, res) => {
  try {
    const { usuario, email, password, rol } = req.body; // <- incluye rol

    if (!usuario || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const usuarioExistente = await User.findOne({ $or: [{ usuario }, { email }] });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El usuario o email ya está registrado' });
    }

    const nuevoUsuario = new User({
      usuario,
      email,
      password,
      rol: rol || 'usuario' // <- por defecto "usuario"
    });

    await nuevoUsuario.save();

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      usuario: {
        usuario: nuevoUsuario.usuario,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol
      }
    });
  } catch (error) {
    console.error('❌ Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;

    console.log('🔐 LOGIN DETALLADO - Usuario:', usuario);
    console.log('🔐 Password recibida:', password ? `"${password}" (${password.length} chars)` : 'null');

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const usuarioEncontrado = await User.findOne({ usuario });
    
    if (!usuarioEncontrado) {
      console.log('❌ Usuario no encontrado en BD');
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    console.log('🔍 Usuario encontrado en BD');
    console.log('📝 Password en BD (hash):', usuarioEncontrado.password);
    console.log('🔑 Comparando contraseñas...');

    // DEBUG: Verificar el hash
    const passwordValida = await bcrypt.compare(password, usuarioEncontrado.password);
    
    console.log('✅ Resultado comparación bcrypt:', passwordValida);

    if (!passwordValida) {
      console.log('❌ BCRYPT: Las contraseñas NO coinciden');
      console.log('🔍 DEBUG - Input password:', password);
      console.log('🔍 DEBUG - Stored hash:', usuarioEncontrado.password);
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    console.log('✅ BCRYPT: Contraseñas coinciden - Login exitoso');

    const token = jwt.sign(
      { 
        usuario: usuarioEncontrado.usuario, 
        id: usuarioEncontrado._id,
        email: usuarioEncontrado.email,
        rol: usuarioEncontrado.rol
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
        foto: usuarioEncontrado.foto,
        biografia: usuarioEncontrado.biografia
      }
    });

  } catch (error) {
    console.error('❌ ERROR en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor Linkage funcionando',
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
    timestamp: new Date().toISOString()
  });
});

// Routes - Posts
app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Solicitando posts...');
    const posts = await Post.find().sort({ fecha: -1 }).limit(50);
    console.log(`✅ Enviando ${posts.length} posts`);
    res.json(posts);
  } catch (error) {
    console.error('❌ Error obteniendo posts:', error);
    res.status(500).json({ error: 'Error obteniendo posts' });
  }
});

app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { contenido } = req.body;

    if (!contenido || contenido.trim().length === 0) {
      return res.status(400).json({ error: 'El contenido no puede estar vacío' });
    }

    const usuario = await User.findOne({ usuario: req.user.usuario });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const nuevoPost = new Post({
      usuario: req.user.usuario,
      contenido: contenido.trim(),
      usuarioFoto: usuario.foto
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

// ✅ RUTAS DE LIKES/DISLIKES - AGREGAR EN SERVER.JS
app.post('/api/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }

    const usuario = req.body.usuario;

    // Si ya dio like, quitar like
    if (post.usuariosQueDieronLike.includes(usuario)) {
      post.usuariosQueDieronLike = post.usuariosQueDieronLike.filter(u => u !== usuario);
      post.likes = Math.max(0, post.likes - 1);
    } 
    // Si dio dislike, cambiar a like
    else if (post.usuariosQueDieronDislike.includes(usuario)) {
      post.usuariosQueDieronDislike = post.usuariosQueDieronDislike.filter(u => u !== usuario);
      post.dislikes = Math.max(0, post.dislikes - 1);
      post.usuariosQueDieronLike.push(usuario);
      post.likes += 1;
    }
    // Si no ha interactuado, agregar like
    else {
      post.usuariosQueDieronLike.push(usuario);
      post.likes += 1;
    }

    await post.save();

    res.json({
      likes: post.likes,
      dislikes: post.dislikes,
      usuarioDioLike: post.usuariosQueDieronLike.includes(usuario),
      usuarioDioDislike: post.usuariosQueDieronDislike.includes(usuario)
    });
  } catch (error) {
    console.error('❌ Error en like:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/posts/:id/dislike', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post no encontrado' });
    }

    const usuario = req.body.usuario;

    // Si ya dio dislike, quitar dislike
    if (post.usuariosQueDieronDislike.includes(usuario)) {
      post.usuariosQueDieronDislike = post.usuariosQueDieronDislike.filter(u => u !== usuario);
      post.dislikes = Math.max(0, post.dislikes - 1);
    } 
    // Si dio like, cambiar a dislike
    else if (post.usuariosQueDieronLike.includes(usuario)) {
      post.usuariosQueDieronLike = post.usuariosQueDieronLike.filter(u => u !== usuario);
      post.likes = Math.max(0, post.likes - 1);
      post.usuariosQueDieronDislike.push(usuario);
      post.dislikes += 1;
    }
    // Si no ha interactuado, agregar dislike
    else {
      post.usuariosQueDieronDislike.push(usuario);
      post.dislikes += 1;
    }

    await post.save();

    res.json({
      likes: post.likes,
      dislikes: post.dislikes,
      usuarioDioLike: post.usuariosQueDieronLike.includes(usuario),
      usuarioDioDislike: post.usuariosQueDieronDislike.includes(usuario)
    });
  } catch (error) {
    console.error('❌ Error en dislike:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener posts de un usuario específico
app.get('/api/posts/usuario/:usuario', authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find({ usuario: req.params.usuario }).sort({ fecha: -1 });
    res.json(posts);
  } catch (error) {
    console.error('Error obteniendo posts del usuario:', error);
    res.status(500).json({ error: 'Error obteniendo posts del usuario' });
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

// Obtener información del usuario actual (según token)
app.get('/api/usuarioActual', authenticateToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id).select('-password');
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(usuario);
  } catch (error) {
    console.error('❌ Error obteniendo usuario actual:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// Route para obtener usuarios (para el chat)
app.get('/api/usuarios', authenticateToken, async (req, res) => {
  try {
    const usuarios = await User.find(
      { usuario: { $ne: req.user.usuario } },
      'usuario foto biografia'
    );
    res.json(usuarios);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

// Ruta de información del servidor
app.get('/api/info', (req, res) => {
  res.json({
    status: 'online',
    server: 'Linkage Backend',
    clientIp: req.ip,
    clientHost: req.get('host'),
    origin: req.get('origin'),
    timestamp: new Date().toISOString(),
    environment: process.env.APP_ENV || 'development',
    cors: {
      allowed: true,
      origin: req.get('origin')
    }
  });
});

// Ruta de salud para probar el servidor
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor Linkage funcionando',
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
    timestamp: new Date().toISOString(),
    environment: process.env.APP_ENV || 'development',
    cors: req.get('origin') || 'No origin header'
  });
});

// RUTAS PARA LAS PÁGINAS HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'sesion.html'));
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

// =============================================
// WEBSOCKET PARA CHAT EN VIVO - DESPUÉS DE DEFINIR io
// =============================================
io.on('connection', (socket) => {
  console.log('🔌 Usuario conectado via WebSocket:', socket.id);

  socket.on('unirseSala', (usuario) => {
    socket.join(usuario);
    console.log(`👤 Usuario ${usuario} unido a la sala`);
  });

  // ✅ AGREGAR: Evento para unirse a conversación específica
  socket.on('unirseConversacion', (data) => {
    socket.join(data.conversacion);
    console.log(`💬 Usuario ${data.usuario} unido a conversación con @${data.conversacion}`);
  });

  // ✅ AGREGAR: Evento para salir de conversación
  socket.on('salirConversacion', (data) => {
    socket.leave(data.conversacion);
    console.log(`💬 Usuario ${data.usuario} salió de conversación con @${data.conversacion}`);
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

      io.to(emisor).to(receptor).emit('nuevoMensaje', nuevoMensaje);
      console.log(`💬 Mensaje de ${emisor} a ${receptor}`);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      socket.emit('errorMensaje', { error: 'Error enviando mensaje' });
    }
  });

  // AGREGAR: Evento específico para mensajes privados
  socket.on('enviarMensajePrivado', async (data) => {
  try {
    const { emisor, receptor, contenido } = data;

    console.log(`📨 [WebSocket] Mensaje privado de @${emisor} a @${receptor}: ${contenido}`);

    // Validación más permisiva
    if (!contenido || contenido.trim().length === 0) {
      socket.emit('errorMensaje', { error: 'El mensaje no puede estar vacío' });
      return;
    }

    if (!emisor || !receptor) {
      socket.emit('errorMensaje', { error: 'Emisor o receptor faltante' });
      return;
    }

    // Verificar que el receptor existe
    const usuarioReceptor = await User.findOne({ usuario: receptor });
    if (!usuarioReceptor) {
      socket.emit('errorMensaje', { error: 'Usuario receptor no encontrado' });
      return;
    }

    // Crear y guardar mensaje
    const nuevoMensaje = new Message({
      emisor,
      receptor,
      contenido: contenido.trim(),
      fecha: new Date()
    });

    await nuevoMensaje.save();

    console.log('✅ Mensaje privado guardado en BD:', nuevoMensaje._id);

    // Enriquecer con información del usuario emisor
    const usuarioEmisor = await User.findOne({ usuario: emisor });
    const mensajeEnriquecido = {
      _id: nuevoMensaje._id,
      emisor: nuevoMensaje.emisor,
      receptor: nuevoMensaje.receptor,
      contenido: nuevoMensaje.contenido,
      fecha: nuevoMensaje.fecha,
      foto: usuarioEmisor?.foto || 'img/perfil_default.png'
    };

    // DEBUG: Log para verificar a quién se envía
    console.log(`📤 Enviando mensaje a salas: @${emisor} y @${receptor}`);
    
    // Emitir a ambos usuarios - CORREGIDO
    socket.to(emisor).to(receptor).emit('nuevoMensajePrivado', mensajeEnriquecido);
    // También enviar al emisor
    socket.emit('nuevoMensajePrivado', mensajeEnriquecido);
    
    console.log(`✅ Mensaje privado entregado de @${emisor} a @${receptor}`);

  } catch (error) {
    console.error('❌ Error enviando mensaje privado:', error);
    socket.emit('errorMensaje', { error: 'Error enviando mensaje: ' + error.message });
  }
});

  socket.on('disconnect', () => {
    console.log('🔌 Usuario desconectado:', socket.id);
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error('❌ Error global:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: error.message
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('🚀 SERVIDOR LINKAGE INICIADO');
  console.log('='.repeat(60));
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📱 Red Local: http://192.168.100.6:${PORT}`);
  console.log(`🌐 Externo: Disponible via ngrok`);
  console.log(`📊 MongoDB: ${MONGODB_URI}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Configurado' : 'Usando valor por defecto'}`);
  console.log(`🔄 Entorno: ${process.env.APP_ENV || 'development'}`);
  console.log(`🌍 CORS: Habilitado para múltiples orígenes`);
  console.log(`🔌 WebSocket: Socket.io inicializado`);
  console.log('='.repeat(60));
  console.log('💡 Para acceso externo ejecuta: npm run ngrok');
  console.log('='.repeat(60));
});
