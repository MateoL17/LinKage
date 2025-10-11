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
app.use('/api', perfilRoutes);
app.use('/api/upload', uploadRoutes);

// =============================================
// RUTAS DE AUTENTICACIÓN
// =============================================
app.post('/api/register', async (req, res) => {
  try {
    const { usuario, email, password } = req.body;

    console.log('📝 Intentando registrar usuario:', { usuario, email });

    if (!usuario || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const usuarioExistente = await User.findOne({ 
      $or: [{ usuario }, { email }] 
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'El usuario o email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = new User({
      usuario,
      email,
      password: hashedPassword
    });

    await nuevoUsuario.save();

    console.log('✅ Usuario registrado exitosamente:', usuario);

    res.status(201).json({ 
      mensaje: 'Usuario registrado exitosamente',
      usuario: {
        usuario: nuevoUsuario.usuario,
        email: nuevoUsuario.email,
        foto: nuevoUsuario.foto
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

    console.log('🔐 LOGIN INTENTADO - Usuario:', usuario);
    console.log('🔐 LOGIN INTENTADO - Password length:', password ? password.length : 'null');

    if (!usuario || !password) {
      console.log('❌ Login fallido: Usuario o password vacíos');
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    console.log('🔍 Buscando usuario en BD:', usuario);
    const usuarioEncontrado = await User.findOne({ usuario });
    
    if (!usuarioEncontrado) {
      console.log('❌ Usuario no encontrado en BD:', usuario);
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    console.log('✅ Usuario encontrado, verificando contraseña...');
    const passwordValida = await bcrypt.compare(password, usuarioEncontrado.password);
    
    if (!passwordValida) {
      console.log('❌ Contraseña incorrecta para usuario:', usuario);
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    console.log('✅ Credenciales válidas, generando token...');
    const token = jwt.sign(
      { 
        usuario: usuarioEncontrado.usuario, 
        id: usuarioEncontrado._id,
        email: usuarioEncontrado.email 
      },
      process.env.JWT_SECRET || 'secreto_temporal',
      { expiresIn: '24h' }
    );

    console.log('✅ Login exitoso para:', usuario);

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
    console.error('❌ ERROR CRÍTICO en login:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
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
