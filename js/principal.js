// FUNCIÓN PARA DETECTAR API URL DINÁMICAMENTE
function getApiUrl() {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Si estamos en localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  // Si estamos en la IP local
  else if (hostname === '192.168.100.6') {
    return 'http://192.168.100.6:3001/api';
  }
  // Si estamos en ngrok o dominio externo
  else if (hostname.includes('ngrok.io') || hostname.includes('localhost.run') || hostname.includes('ngrok-free.app') || hostname.includes('ngrok-free.dev')) {
    return `${protocol}//${hostname}/api`;
  }
  // Por defecto, usar el mismo host
  else {
    return `${protocol}//${hostname}:3001/api`;
  }
}

const API_URL = getApiUrl();
let socket;

console.log('🔗 API URL:', API_URL);
console.log('📍 Hostname:', window.location.hostname);

// ================= CLASES NUEVAS INTEGRADAS =================

// Clase para manejar WebSockets corregida
class SocketManager {
    constructor() {
        this.socket = null;
        this.SOCKET_URL = this.getSocketUrl();
        this.postIdsProcesados = new Set();
    }

    getSocketUrl() {
        const { hostname, protocol } = window.location;
        
        if (hostname.includes('ngrok.io') || 
            hostname.includes('ngrok-free.app') ||
            hostname.includes('ngrok-free.dev')) {
            return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${hostname}`;
        }
        
        // Para localhost y red local
        if (hostname === '192.168.100.6') {
            return 'http://192.168.100.6:3001';
        }
        
        return 'http://localhost:3001';
    }

    connect(usuario) {
        try {
            console.log('🔌 Conectando WebSocket a:', this.SOCKET_URL);
            
            this.socket = io(this.SOCKET_URL, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });

            // Unirse a la sala del usuario
            this.socket.emit('unirseSala', usuario);

            // Escuchar nuevos mensajes
            this.socket.on('nuevoMensaje', (mensaje) => {
                agregarMensajeAlChat(mensaje);
            });

            // MEJORADO: Escuchar nuevos posts - SIEMPRE AL INICIO
            this.socket.on('nuevoPost', (post) => {
                console.log('📨 Nuevo post recibido via WebSocket:', post.contenido, 'fecha:', new Date(post.fecha).toLocaleString());
                
                // Verificar si ya procesamos este post
                if (post._id && this.postIdsProcesados.has(post._id)) {
                    console.log('📝 Post ya procesado, omitiendo...');
                    return;
                }
                
                if (post._id) {
                    this.postIdsProcesados.add(post._id);
                }
                
                // Reemplazar post temporal si existe
                reemplazarPostTemporal(post);
                
                // Agregar post real SIEMPRE AL INICIO
                agregarPostAlFeed(post, true);
            });

            this.socket.on('connect', () => {
                console.log('✅ WebSocket conectado exitosamente');
                console.log('🔗 Socket ID:', this.socket.id);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('🔌 WebSocket desconectado:', reason);
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Error conectando WebSocket:', error);
            });

        } catch (error) {
            console.error('❌ Error inicializando WebSocket:', error);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log('🔌 WebSocket desconectado manualmente');
        }
    }

    enviarMensaje(mensajeData) {
        if (this.socket) {
            this.socket.emit('enviarMensaje', mensajeData);
        } else {
            console.error('WebSocket no conectado');
        }
    }
}

// Clase para manejar sesión corregida
class SessionManager {
    constructor() {
        this.init();
    }

    init() {
        this.verificarAutenticacion();
        this.setupLogout();
    }

    verificarAutenticacion() {
        const token = localStorage.getItem('token');
        const usuario = localStorage.getItem('usuarioActivo');
        
        if (!token || !usuario) {
            console.log('🔐 No autenticado, redirigiendo a login...');
            this.cerrarSesion();
            return;
        }

        try {
            const usuarioData = JSON.parse(usuario);
            this.mostrarUsuario(usuarioData);
        } catch (error) {
            console.error('❌ Error parseando usuario:', error);
            this.cerrarSesion();
        }
    }

    mostrarUsuario(usuario) {
        const userElement = document.getElementById('userDisplay');
        const avatarElement = document.getElementById('userAvatar');
        
        if (userElement) {
            userElement.textContent = `@${usuario.usuario}`;
        }
        
        if (avatarElement && usuario.foto) {
            avatarElement.src = corregirUrlAvatar(usuario.foto);
        }
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.cerrarSesion();
            });
        }
        
        // También configurar el botón .logout si existe
        const logoutBtnOld = document.querySelector('.logout');
        if (logoutBtnOld) {
            logoutBtnOld.addEventListener('click', (e) => {
                e.preventDefault();
                this.cerrarSesion();
            });
        }
    }

    cerrarSesion() {
        console.log('🚪 Cerrando sesión...');
        
        // Desconectar WebSocket primero
        if (window.socketManager) {
            window.socketManager.disconnect();
        }
        
        // Limpiar localStorage COMPLETAMENTE
        localStorage.removeItem('token');
        localStorage.removeItem('usuarioActivo');
        localStorage.removeItem('user');
        
        // Limpiar sessionStorage por si acaso
        sessionStorage.clear();
        
        console.log('✅ Sesión cerrada, redirigiendo...');
        
        // Redirigir a sesion.html con parámetro para evitar redirección automática
        setTimeout(() => {
            window.location.href = 'sesion.html?logout=true';
        }, 100);
    }
}

// ================= INICIALIZACIÓN =================

// Crear instancias globales
window.socketManager = new SocketManager();
window.sessionManager = new SessionManager();

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem('token');
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));

  // Verificar autenticación
  if (!token || !usuarioActivo) {
    window.location.href = "sesion.html";
    return;
  }

  console.log('👤 Usuario activo al cargar:', usuarioActivo);

  // Actualizar avatares inmediatamente
  if (usuarioActivo.foto) {
    actualizarAvataresEnInterfaz(corregirUrlAvatar(usuarioActivo.foto));
  }
  
  // Cargar datos actualizados del usuario
  await cargarDatosUsuario(usuarioActivo);
  
  // Conectar WebSocket
  window.socketManager.connect(usuarioActivo.usuario);

  // Cargar posts iniciales
  console.log('🔄 Cargando posts iniciales...');
  await cargarPosts();
  
  // Verificar el orden después de cargar
  setTimeout(verificarOrdenPosts, 1000);
  
  await cargarUsuariosParaChat();
  configurarEventos();
  
  console.log('✅ Aplicación completamente cargada');
});

// FUNCIÓN PARA CAMBIAR ENTRE SECCIONES
function configurarNavegacion() {
  const menuLinks = document.querySelectorAll('.menu a[data-section]');
  const sections = document.querySelectorAll('.content-section');
  
  menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remover clase active de todos los enlaces y secciones
      menuLinks.forEach(l => l.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      // Agregar clase active al enlace clickeado
      link.classList.add('active');
      
      // Mostrar la sección correspondiente
      const sectionId = link.getAttribute('data-section');
      const targetSection = document.getElementById(sectionId);
      if (targetSection) {
        targetSection.classList.add('active');
        
        // Cargar datos específicos de la sección si es necesario
        if (sectionId === 'perfil') {
          cargarPostsUsuario();
        } else if (sectionId === 'mensajes') {
          cargarConversaciones();
        }
      }
    });
  });
}

// FUNCIÓN PARA ACTUALIZAR INFORMACIÓN DEL USUARIO EN SIDEBAR
function actualizarInfoUsuario(usuario) {
  console.log('🔄 Actualizando info usuario en sidebar:', usuario);
  
  // Actualizar nombre de usuario en el sidebar
  const usernameElement = document.querySelector('.user-info .username');
  if (usernameElement) {
    usernameElement.textContent = `@${usuario.usuario}`;
    console.log('✅ Nombre de usuario actualizado en sidebar:', usuario.usuario);
  } else {
    console.error('❌ No se encontró el elemento .user-info .username');
  }
  
  // Actualizar avatares en el sidebar y crear post
  const avatarSidebar = document.querySelector('.user-avatar img');
  const avatarCreatePost = document.querySelector('.create-post .avatar');
  
  if (avatarSidebar && usuario.foto) {
    avatarSidebar.src = corregirUrlAvatar(usuario.foto);
    avatarSidebar.alt = usuario.usuario;
    console.log('✅ Avatar sidebar actualizado');
  }
  
  if (avatarCreatePost && usuario.foto) {
    avatarCreatePost.src = corregirUrlAvatar(usuario.foto);
    avatarCreatePost.alt = usuario.usuario;
    console.log('✅ Avatar crear post actualizado');
  }
}

// FUNCIÓN PARA VERIFICAR Y CORREGIR URLS DE AVATAR
function corregirUrlAvatar(url, usuario = '') {
  if (!url) return 'img/perfil_default.png';
  
  // Si es una URL de la API de avatar, dejarla como está
  if (url.includes('/api/upload/avatar/')) {
    return url;
  }
  
  // Si es una ruta de uploads antigua, convertir a nueva API
  if (url.includes('/img/uploads/') && usuario) {
    return `${API_URL}/upload/avatar/${usuario}`;
  }
  
  // Si la URL ya es completa, dejarla como está
  if (url.startsWith('http') || url.startsWith('/')) {
    return url;
  }
  
  // Si es una ruta relativa sin slash inicial, agregarlo
  if (!url.startsWith('/')) {
    return '/' + url;
  }
  
  return url;
}

// FUNCIÓN CARGAR DATOS DEL USUARIO
async function cargarDatosUsuario(usuario) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/perfil`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const perfil = await response.json();
      
      // Actualizar localStorage con datos actualizados
      localStorage.setItem('usuarioActivo', JSON.stringify(perfil));
      
      // Actualizar interfaz COMPLETA
      actualizarInfoUsuario(perfil);
      actualizarSeccionPerfil(perfil);
      actualizarAvataresEnInterfaz(perfil.foto);
      
      return perfil;
    }
  } catch (error) {
    console.error('Error cargando perfil:', error);
    // Usar datos de localStorage como fallback
    actualizarInfoUsuario(usuario);
    actualizarSeccionPerfil(usuario);
    if (usuario.foto) {
      actualizarAvataresEnInterfaz(usuario.foto);
    }
  }
}

// FUNCIÓN PARA ACTUALIZAR SECCIÓN DE PERFIL
function actualizarSeccionPerfil(usuario) {
  console.log('🔄 Actualizando sección perfil:', usuario);
  
  const profileUsername = document.querySelector('.profile-info h2');
  const profileBio = document.querySelector('.profile-bio');
  const profileAvatar = document.querySelector('.avatar-large');
  const settingsUsername = document.querySelector('#configuracion input[type="text"]');
  const settingsEmail = document.querySelector('#configuracion input[type="email"]');
  const settingsBio = document.querySelector('#configuracion textarea');
  
  if (profileUsername) profileUsername.textContent = `@${usuario.usuario}`;
  if (profileBio) profileBio.textContent = usuario.biografia || 'Biografía del usuario...';
  if (profileAvatar) {
    profileAvatar.src = corregirUrlAvatar(usuario.foto);
    profileAvatar.alt = usuario.usuario;
  }
  if (settingsUsername) settingsUsername.value = usuario.usuario;
  if (settingsEmail) settingsEmail.value = usuario.email || 'usuario@ejemplo.com';
  if (settingsBio) settingsBio.value = usuario.biografia || 'Biografía del usuario...';
  
  console.log('✅ Sección perfil actualizada');
}

// FUNCIÓN PARA CARGAR POSTS
async function cargarPosts() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/posts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const posts = await response.json();
      const postsContainer = document.querySelector('.posts-container');
      
      // Limpiar posts existentes COMPLETAMENTE
      if (postsContainer) {
        postsContainer.innerHTML = '';
      }

      // ORDENAR POSTS: más recientes PRIMERO (orden descendente)
      const postsOrdenados = posts.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      console.log('📝 Posts cargados:', postsOrdenados.length);
      console.log('📅 Orden (más reciente primero):', postsOrdenados.map(p => ({
        contenido: p.contenido,
        fecha: new Date(p.fecha).toLocaleString()
      })));

      // ✅ CORREGIDO: Agregar posts en orden INVERSO (más antiguos primero, luego más recientes)
      // Esto es porque al agregar al inicio, el orden se invierte
      for (let i = postsOrdenados.length - 1; i >= 0; i--) {
        const post = postsOrdenados[i];
        
        if (!post.usuarioFoto) {
          const foto = await obtenerFotoUsuario(post.usuario);
          post.usuarioFoto = foto;
        }
        
        agregarPostAlFeed(post, true); // TRUE = agregar al inicio
      }
    }
  } catch (error) {
    console.error('Error cargando posts:', error);
  }
}

// FUNCIÓN PARA VERIFICAR EL ORDEN ACTUAL
function verificarOrdenPosts() {
  const postsContainer = document.querySelector('.posts-container');
  if (!postsContainer) return;
  
  const posts = postsContainer.querySelectorAll('.post');
  console.log('📊 Verificando orden actual de posts:');
  
  posts.forEach((post, index) => {
    const contenido = post.querySelector('p').textContent;
    const fecha = post.querySelector('small').textContent;
    console.log(`   ${index + 1}. ${contenido} - ${fecha}`);
  });
}

// FUNCIÓN AUXILIAR PARA OBTENER FOTO DE USUARIO
async function obtenerFotoUsuario(usuario) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/usuarios`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const usuarios = await response.json();
      const usuarioEncontrado = usuarios.find(u => u.usuario === usuario);
      return usuarioEncontrado?.foto || 'img/perfil_default.png';
    }
  } catch (error) {
    console.error('Error obteniendo foto de usuario:', error);
  }
  return 'img/perfil_default.png';
}

// FUNCIÓN PARA CARGAR POSTS DEL USUARIO (para sección perfil)
async function cargarPostsUsuario() {
  try {
    const token = localStorage.getItem('token');
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    const response = await fetch(`${API_URL}/posts/usuario/${usuarioActivo.usuario}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const posts = await response.json();
      const userPostsContainer = document.querySelector('.user-posts');
      
      if (userPostsContainer) {
        userPostsContainer.innerHTML = '';
        
        if (posts.length === 0) {
          userPostsContainer.innerHTML = '<p class="no-posts">Aún no has publicado nada.</p>';
          return;
        }

        // Ordenar posts del usuario por fecha (más recientes primero)
        const postsOrdenados = posts.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        postsOrdenados.forEach(post => {
          const postElement = document.createElement('div');
          postElement.className = 'user-post';
          postElement.innerHTML = `
            <div class="post-content">
              <p>${post.contenido}</p>
              <small>${new Date(post.fecha).toLocaleString()}</small>
              <div class="post-stats">
                <span class="likes-stat">👍 ${post.likes || 0}</span>
                <span class="dislikes-stat">👎 ${post.dislikes || 0}</span>
              </div>
            </div>
          `;
          userPostsContainer.appendChild(postElement);
        });
      }
    }
  } catch (error) {
    console.error('Error cargando posts del usuario:', error);
  }
}

// FUNCIÓN PARA AGREGAR POST AL FEED
function agregarPostAlFeed(post, agregarAlInicio = true) {
  const postsContainer = document.querySelector('.posts-container');
  
  if (!postsContainer) {
    console.error('❌ No se encontró el contenedor de posts');
    return;
  }

  console.log('➕ Agregando post:', post.contenido, 'al inicio:', agregarAlInicio, 'fecha:', new Date(post.fecha).toLocaleString());

  const postElement = document.createElement('div');
  postElement.className = 'post';
  postElement.dataset.postId = post._id;
  
  if (post.temporal) {
    postElement.classList.add('temporal');
  }
  
  // Determinar si el usuario ya dio like o dislike
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
  const usuarioDioLike = post.usuariosQueDieronLike?.includes(usuarioActivo.usuario);
  const usuarioDioDislike = post.usuariosQueDieronDislike?.includes(usuarioActivo.usuario);
  
  postElement.innerHTML = `
    <img src="${corregirUrlAvatar(post.usuarioFoto, post.usuario)}" alt="${post.usuario}" class="avatar">
    <div class="post-content">
      <h3>@${post.usuario}</h3>
      <p>${post.contenido}</p>
      <small>${new Date(post.fecha).toLocaleString()}</small>
      <div class="post-actions">
        <button class="like-btn ${usuarioDioLike ? 'active' : ''}" data-post-id="${post._id}">
          <span class="like-icon">👍</span>
          <span class="like-count">${post.likes || 0}</span>
        </button>
        <button class="dislike-btn ${usuarioDioDislike ? 'active' : ''}" data-post-id="${post._id}">
          <span class="dislike-icon">👎</span>
          <span class="dislike-count">${post.dislikes || 0}</span>
        </button>
      </div>
    </div>
  `;

  // Agregar event listeners a los botones
  const likeBtn = postElement.querySelector('.like-btn');
  const dislikeBtn = postElement.querySelector('.dislike-btn');
  
  likeBtn.addEventListener('click', () => manejarLike(post._id));
  dislikeBtn.addEventListener('click', () => manejarDislike(post._id));

  // SIEMPRE agregar nuevos posts al INICIO
  if (agregarAlInicio && postsContainer.firstChild) {
    postsContainer.insertBefore(postElement, postsContainer.firstChild);
  } else {
    postsContainer.appendChild(postElement);
  }
  
  console.log('✅ Post agregado correctamente');
}

// FUNCIÓN PARA MANEJAR LIKE
async function manejarLike(postId) {
  try {
    const token = localStorage.getItem('token');
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    
    const response = await fetch(`${API_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        usuario: usuarioActivo.usuario
      })
    });

    if (response.ok) {
      const resultado = await response.json();
      console.log('✅ Like registrado:', resultado);
      
      // Actualizar la interfaz
      actualizarInterfazLikes(postId, resultado.likes, resultado.dislikes, resultado.usuarioDioLike, resultado.usuarioDioDislike);
    } else {
      console.error('❌ Error dando like');
    }
  } catch (error) {
    console.error('❌ Error dando like:', error);
  }
}

// FUNCIÓN PARA MANEJAR DISLIKE
async function manejarDislike(postId) {
  try {
    const token = localStorage.getItem('token');
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    
    const response = await fetch(`${API_URL}/posts/${postId}/dislike`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        usuario: usuarioActivo.usuario
      })
    });

    if (response.ok) {
      const resultado = await response.json();
      console.log('✅ Dislike registrado:', resultado);
      
      // Actualizar la interfaz
      actualizarInterfazLikes(postId, resultado.likes, resultado.dislikes, resultado.usuarioDioLike, resultado.usuarioDioDislike);
    } else {
      console.error('❌ Error dando dislike');
    }
  } catch (error) {
    console.error('❌ Error dando dislike:', error);
  }
}

// FUNCIÓN PARA ACTUALIZAR INTERFAZ DE LIKES
function actualizarInterfazLikes(postId, likes, dislikes, usuarioDioLike, usuarioDioDislike) {
  const postElement = document.querySelector(`[data-post-id="${postId}"]`);
  
  if (postElement) {
    const likeBtn = postElement.querySelector('.like-btn');
    const dislikeBtn = postElement.querySelector('.dislike-btn');
    const likeCount = postElement.querySelector('.like-count');
    const dislikeCount = postElement.querySelector('.dislike-count');
    
    // Actualizar contadores
    likeCount.textContent = likes || 0;
    dislikeCount.textContent = dislikes || 0;
    
    // Actualizar estados de botones
    likeBtn.classList.toggle('active', usuarioDioLike);
    dislikeBtn.classList.toggle('active', usuarioDioDislike);
  }
}

// FUNCIÓN PARA CARGAR CONVERSACIONES
async function cargarConversaciones() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/mensajes/conversaciones`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const conversaciones = await response.json();
      actualizarListaConversaciones(conversaciones);
    }
  } catch (error) {
    console.error('Error cargando conversaciones:', error);
    // Mostrar conversaciones de ejemplo
    mostrarConversacionesEjemplo();
  }
}

// FUNCIÓN PARA ACTUALIZAR LISTA DE CONVERSACIONES
function actualizarListaConversaciones(conversaciones) {
  const conversationsList = document.querySelector('.conversations-list');
  
  if (!conversationsList) return;
  
  conversationsList.innerHTML = '';
  
  if (conversaciones.length === 0) {
    conversationsList.innerHTML = '<p class="no-conversations">No tienes conversaciones activas.</p>';
    return;
  }
  
  conversaciones.forEach(conversacion => {
    const conversationElement = document.createElement('div');
    conversationElement.className = 'conversation';
    conversationElement.innerHTML = `
      <img src="${conversacion.foto || 'img/perfil_default.png'}" alt="${conversacion.usuario}" class="avatar">
      <div class="conversation-info">
        <h3>@${conversacion.usuario}</h3>
        <p>${conversacion.ultimoMensaje || 'Inicia una conversación'}</p>
      </div>
      <span class="time">${conversacion.ultimaVez || ''}</span>
    `;
    
    conversationElement.addEventListener('click', () => {
      abrirConversacion(conversacion.usuario);
    });
    
    conversationsList.appendChild(conversationElement);
  });
}

// FUNCIÓN PARA MOSTRAR CONVERSACIONES DE EJEMPLO
function mostrarConversacionesEjemplo() {
  const conversationsList = document.querySelector('.conversations-list');
  
  if (!conversationsList) return;
  
  conversationsList.innerHTML = `
    <div class="conversation">
      <img src="/img/perfil_default.png" alt="Usuario" class="avatar">
      <div class="conversation-info">
        <h3>@sofiadev</h3>
        <p>Último mensaje: ¡Hola! 👋</p>
      </div>
      <span class="time">12:30</span>
    </div>
    <div class="conversation">
      <img src="/img/perfil_default.png" alt="Usuario" class="avatar">
      <div class="conversation-info">
        <h3>@mateolink</h3>
        <p>Último mensaje: ¡Hey! ¿Cómo va todo?</p>
      </div>
      <span class="time">11:45</span>
    </div>
  `;
}

// FUNCIÓN PARA ABRIR CONVERSACIÓN
function abrirConversacion(usuario) {
  alert(`Abriendo conversación con @${usuario}`);
  // Aquí podrías implementar la lógica para cargar los mensajes específicos
}

// FUNCIÓN PARA CARGAR USUARIOS PARA EL CHAT
async function cargarUsuariosParaChat() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/usuarios`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const usuarios = await response.json();
      console.log('Usuarios disponibles para chat:', usuarios);
    }
  } catch (error) {
    console.error('Error cargando usuarios:', error);
  }
}

// FUNCIÓN PARA ENVIAR POST
async function enviarPost(contenido) {
  try {
    const token = localStorage.getItem('token');
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    
    console.log('📤 Enviando post:', contenido);

    // 1. Crear post temporal inmediatamente (para mejor UX)
    const postTemporal = {
      usuario: usuarioActivo.usuario,
      usuarioFoto: usuarioActivo.foto,
      contenido: contenido,
      fecha: new Date().toISOString(),
      temporal: true
    };
    
    // 2. Agregar post temporal AL INICIO del feed inmediatamente
    agregarPostAlFeed(postTemporal, true);
    
    // 3. Enviar al servidor
    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ contenido })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error enviando post');
    }

    const nuevoPost = await response.json();
    console.log('✅ Post enviado al servidor:', nuevoPost);
    
    // 4. El WebSocket se encargará de actualizar el post temporal con el real
    // No necesitamos hacer nada más aquí
    
  } catch (error) {
    console.error('❌ Error enviando post:', error);
    
    // Eliminar post temporal en caso de error
    eliminarPostTemporal(contenido);
    
    mostrarError('Error enviando el post: ' + error.message);
  }
}

// FUNCIÓN PARA ELIMINAR POST TEMPORAL
function eliminarPostTemporal(contenido) {
  const postsContainer = document.querySelector('.posts-container');
  const posts = postsContainer.querySelectorAll('.post.temporal');
  
  posts.forEach(post => {
    const postContent = post.querySelector('p').textContent;
    if (postContent === contenido) {
      post.remove();
      console.log('🗑️ Post temporal eliminado por error');
    }
  });
}

function reemplazarPostTemporal(postReal) {
  const postsContainer = document.querySelector('.posts-container');
  const postsTemporales = postsContainer.querySelectorAll('.post.temporal');
  
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
  
  // Solo reemplazar si el post temporal es del mismo usuario
  postsTemporales.forEach(postTemp => {
    const usuarioTemp = postTemp.querySelector('h3').textContent.replace('@', '');
    const contenidoTemp = postTemp.querySelector('p').textContent;
    
    if (usuarioTemp === usuarioActivo.usuario && contenidoTemp === postReal.contenido) {
      console.log('🔄 Reemplazando post temporal con post real');
      postTemp.remove();
    }
  });
}

// FUNCIÓN PARA ENVIAR MENSAJE
function enviarMensaje(contenido, receptor = 'general') {
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
  
  // Usar la nueva clase SocketManager
  if (window.socketManager) {
    window.socketManager.enviarMensaje({
      emisor: usuarioActivo.usuario,
      receptor: receptor,
      contenido: contenido,
      fecha: new Date().toISOString()
    });
  } else {
    console.error('WebSocket no conectado');
  }
}

// FUNCIÓN MEJORADA PARA AGREGAR MENSAJE AL CHAT
function agregarMensajeAlChat(mensaje) {
  const chatBox = document.querySelector('.chat-box');
  
  if (!chatBox) return;
  
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  messageElement.innerHTML = `
    <img src="${mensaje.foto || 'img/perfil_default.png'}" alt="${mensaje.emisor}" class="avatar-small">
    <div class="message-content">
      <strong>@${mensaje.emisor}:</strong> ${mensaje.contenido}
      <small>${new Date(mensaje.fecha).toLocaleTimeString()}</small>
    </div>
  `;
  
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// FUNCIÓN PARA CONFIGURAR EVENTOS DE CONFIGURACIÓN
function configurarConfiguracion() {
  const saveButton = document.querySelector('.save-settings');
  const editAvatarButton = document.querySelector('.edit-avatar');
  
  if (saveButton) {
    saveButton.addEventListener('click', guardarConfiguracion);
  }
  
  if (editAvatarButton) {
    editAvatarButton.addEventListener('click', () => {
      const uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = 'image/*';
      uploadInput.click();
      
      uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) cambiarAvatar(file);
      });
    });
  }
}

// FUNCIÓN PARA GUARDAR CONFIGURACIÓN
async function guardarConfiguracion() {
  try {
    const token = localStorage.getItem('token');
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    
    if (!token) {
      mostrarError('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
      return;
    }
    
    const email = document.querySelector('#configuracion input[type="email"]').value;
    const biografia = document.querySelector('#configuracion textarea').value;
    
    console.log('📤 Enviando actualización de perfil a:', `${API_URL}/perfil`);
    console.log('📤 Datos:', { email, biografia });
    console.log('📤 Token:', token.substring(0, 20) + '...');
    
    const response = await fetch(`${API_URL}/perfil`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: email,
        biografia: biografia
      })
    });

    console.log('📥 Respuesta del servidor:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Perfil actualizado correctamente:', data);
      
      // Actualizar localStorage
      if (usuarioActivo) {
        usuarioActivo.email = data.email;
        usuarioActivo.biografia = data.biografia;
        localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActivo));
        
        // Actualizar interfaz completa
        actualizarInfoUsuario(usuarioActivo);
        actualizarSeccionPerfil(usuarioActivo);
      }
      
      mostrarExito('¡Configuración guardada exitosamente en la base de datos!');
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      console.error('❌ Error del servidor:', errorData);
      
      if (response.status === 404) {
        mostrarAdvertencia('La función de guardar configuración no está disponible en el servidor. Los cambios se guardaron localmente.');
        guardarConfiguracionLocal(email, biografia);
      } else if (response.status === 401) {
        mostrarError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        setTimeout(() => {
          window.location.href = 'sesion.html';
        }, 2000);
      } else {
        mostrarError('Error: ' + (errorData.error || `Error ${response.status}`));
      }
    }
  } catch (error) {
    console.error('❌ Error guardando configuración:', error);
    mostrarAdvertencia('Error de conexión. Guardando cambios localmente...');
    const email = document.querySelector('#configuracion input[type="email"]').value;
    const biografia = document.querySelector('#configuracion textarea').value;
    guardarConfiguracionLocal(email, biografia);
  }
}

// FUNCIÓN PARA GUARDAR CONFIGURACIÓN LOCALMENTE
function guardarConfiguracionLocal(email, biografia) {
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
  
  usuarioActivo.email = email;
  usuarioActivo.biografia = biografia;
  localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActivo));
  
  // Actualizar interfaz
  actualizarSeccionPerfil(usuarioActivo);
}

// FUNCIONES PARA MOSTRAR MENSAJES MEJORADAS
function mostrarError(mensaje) {
  mostrarMensaje(mensaje, 'mensaje-error');
}

function mostrarExito(mensaje) {
  mostrarMensaje(mensaje, 'mensaje-exito');
}

function mostrarAdvertencia(mensaje) {
  mostrarMensaje(mensaje, 'mensaje-advertencia');
}

function mostrarMensaje(mensaje, tipo) {
  // Limpiar mensajes anteriores
  const mensajesAnteriores = document.querySelectorAll('.mensaje-flotante');
  mensajesAnteriores.forEach(msg => msg.remove());
  
  const mensajeDiv = document.createElement('div');
  mensajeDiv.className = `mensaje-flotante ${tipo}`;
  mensajeDiv.textContent = mensaje;
  mensajeDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    max-width: 300px;
  `;

  if (tipo === 'mensaje-error') {
    mensajeDiv.style.background = 'rgba(220, 53, 69, 0.9)';
    mensajeDiv.style.border = '1px solid #dc3545';
  } else if (tipo === 'mensaje-exito') {
    mensajeDiv.style.background = 'rgba(40, 167, 69, 0.9)';
    mensajeDiv.style.border = '1px solid #28a745';
  } else if (tipo === 'mensaje-advertencia') {
    mensajeDiv.style.background = 'rgba(255, 193, 7, 0.9)';
    mensajeDiv.style.border = '1px solid #ffc107';
    mensajeDiv.style.color = '#000';
  }
  
  document.body.appendChild(mensajeDiv);
  
  // Auto-remover después de 5 segundos
  setTimeout(() => {
    mensajeDiv.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (mensajeDiv.parentNode) {
        mensajeDiv.remove();
      }
    }, 300);
  }, 5000);
}

// CONFIGURAR EVENTOS DEL DOM
function configurarEventos() {
  // Evento para crear post
  const crearPostBtn = document.querySelector('.create-post button');
  const postTextarea = document.querySelector('.create-post textarea');
  
  if (crearPostBtn && postTextarea) {
    crearPostBtn.addEventListener('click', async () => {
      const contenido = postTextarea.value.trim();
      if (contenido) {
        // Limpiar textarea inmediatamente
        postTextarea.value = '';
        
        // Deshabilitar botón temporalmente
        crearPostBtn.disabled = true;
        crearPostBtn.textContent = 'Publicando...';
        
        try {
          await enviarPost(contenido);
        } catch (error) {
          console.error('Error:', error);
        } finally {
          // Rehabilitar botón
          setTimeout(() => {
            crearPostBtn.disabled = false;
            crearPostBtn.textContent = 'Publicar';
          }, 2000);
        }
      } else {
        alert('Por favor, escribe algo para publicar.');
      }
    });

    postTextarea.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        crearPostBtn.click();
      }
    });
  }
  
  // Evento para enviar mensaje
  const enviarMsgBtn = document.querySelector('.send-message button');
  const msgInput = document.querySelector('.send-message input');
  
  if (enviarMsgBtn && msgInput) {
    enviarMsgBtn.addEventListener('click', () => {
      const contenido = msgInput.value.trim();
      if (contenido) {
        enviarMensaje(contenido, 'general');
        msgInput.value = '';
      }
    });

    msgInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        enviarMsgBtn.click();
      }
    });
  }

  // Configurar navegación entre secciones
  configurarNavegacion();
  
  // Configurar eventos de configuración
  configurarConfiguracion();
  
  // Configurar cambio de avatar
  configurarCambioAvatar();
  
  // Configurar botones de like/dislike
  configurarBotonesDescubrir();
}

// ✅ FUNCIÓN PARA CONFIGURAR BOTONES DE DESCUBRIR
function configurarBotonesDescubrir() {
  const likeBtn = document.querySelector('.discover-panel .like');
  const dislikeBtn = document.querySelector('.discover-panel .dislike');
  
  if (likeBtn) {
    likeBtn.addEventListener('click', () => {
      mostrarExito('❤ ¡Te gusta este perfil!');
      // Aquí podrías implementar la lógica para guardar el like
      cargarNuevoPerfilDescubrir();
    });
  }
  
  if (dislikeBtn) {
    dislikeBtn.addEventListener('click', () => {
      mostrarAdvertencia('✖ No te interesa este perfil');
      // Aquí podrías implementar la lógica para guardar el dislike
      cargarNuevoPerfilDescubrir();
    });
  }
}

// ✅ FUNCIÓN PARA CARGAR NUEVO PERFIL EN DESCUBRIR
function cargarNuevoPerfilDescubrir() {
  const profileCard = document.querySelector('.profile-card');
  if (profileCard) {
    const nombres = ['Sofia Martinez', 'Mateo Gonzalez', 'Laura Rodriguez', 'Carlos Lopez'];
    const edades = [22, 25, 24, 23];
    const intereses = ['Amante de la música y los videojuegos 🎮', 'Desarrollador Full Stack 💻', 'Artista digital 🎨', 'Fotógrafo y viajero ✈️'];
    
    const randomIndex = Math.floor(Math.random() * nombres.length);
    
    profileCard.innerHTML = `
      <img src="/img/perfil_default.png" alt="Perfil">
      <h3>${nombres[randomIndex]}, ${edades[randomIndex]}</h3>
      <p>${intereses[randomIndex]}</p>
      <div class="discover-buttons">
        <button class="dislike">✖</button>
        <button class="like">❤</button>
      </div>
    `;
    
    configurarBotonesDescubrir();
  }
}

// FUNCIÓN PARA CONFIGURAR CAMBIO DE AVATAR
function configurarCambioAvatar() {
  const avatarImgs = document.querySelectorAll('.user-avatar img, .create-post .avatar, .avatar-large');
  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'image/*';
  uploadInput.style.display = 'none';
  document.body.appendChild(uploadInput);

  avatarImgs.forEach(img => {
    if (img.classList.contains('avatar-large') || img.parentElement.classList.contains('user-avatar') || img.parentElement.classList.contains('create-post')) {
      img.style.cursor = 'pointer';
      img.title = 'Haz clic para cambiar tu avatar';
      img.addEventListener('click', () => {
        uploadInput.click();
      });
    }
  });

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    await cambiarAvatar(file);
  });
}

// ✅ FUNCIÓN MEJORADA PARA CAMBIAR AVATAR
async function cambiarAvatar(file) {
  try {
    const token = localStorage.getItem('token');
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    
    // Validaciones
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona una imagen válida.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 5MB.');
      return;
    }

    console.log('🔄 Iniciando cambio de avatar...');

    // Mostrar indicador de carga
    const avatarImgs = document.querySelectorAll('.user-avatar img, .create-post .avatar, .avatar-large');
    avatarImgs.forEach(img => {
      img.style.opacity = '0.5';
    });

    // Crear FormData
    const formData = new FormData();
    formData.append('foto', file);

    // Enviar al servidor
    console.log('📤 Enviando avatar al servidor...');
    const response = await fetch(`${API_URL}/upload/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    console.log('📥 Respuesta del servidor:', data);

    if (response.ok) {
      // ✅ ACTUALIZAR CON LA URL CORRECTA DEL SERVIDOR
      const nuevaFotoUrl = `${API_URL}/upload/avatar/${usuarioActivo.usuario}?t=${Date.now()}`;
      
      console.log('🔄 Actualizando con URL:', nuevaFotoUrl);
      
      // Actualizar en localStorage
      usuarioActivo.foto = nuevaFotoUrl;
      localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActivo));
      
      // ✅ FORZAR ACTUALIZACIÓN DE TODOS LOS AVATARES
      actualizarAvataresEnInterfaz(nuevaFotoUrl);
      
      // ✅ RECARGAR LA PÁGINA PARA ASEGURAR LA ACTUALIZACIÓN
      setTimeout(() => {
        mostrarExito('¡Avatar actualizado exitosamente!');
        // Recargar la página para asegurar que todos los componentes se actualicen
        window.location.reload();
      }, 1000);
      
    } else {
      console.error('❌ Error del servidor:', data);
      mostrarError('Error: ' + (data.error || 'No se pudo cambiar el avatar'));
    }

  } catch (error) {
    console.error('❌ Error cambiando avatar:', error);
    mostrarError('Error al cambiar el avatar. Intenta nuevamente.');
  } finally {
    // Restaurar opacidad
    const avatarImgs = document.querySelectorAll('.user-avatar img, .create-post .avatar, .avatar-large');
    avatarImgs.forEach(img => {
      img.style.opacity = '1';
    });
  }
}

// ✅ FUNCIÓN MEJORADA PARA ACTUALIZAR AVATARES EN LA INTERFAZ
function actualizarAvataresEnInterfaz(nuevaFotoUrl) {
  if (!nuevaFotoUrl) {
    console.error('❌ URL de avatar vacía');
    return;
  }
  
  console.log('🔄 Actualizando avatares con:', nuevaFotoUrl);
  
  // Agregar timestamp para evitar cache
  const urlConTimestamp = nuevaFotoUrl + (nuevaFotoUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
  
  // Actualizar en la barra lateral (sidebar)
  const avatarSidebar = document.querySelector('.user-avatar img');
  if (avatarSidebar) {
    avatarSidebar.src = urlConTimestamp;
    avatarSidebar.alt = 'Usuario';
    console.log('✅ Avatar sidebar actualizado');
  }

  // Actualizar en el área de crear post (ahora dentro del círculo)
  const avatarCreatePost = document.querySelector('.create-post .avatar');
  if (avatarCreatePost) {
    avatarCreatePost.src = urlConTimestamp;
    avatarCreatePost.alt = 'Perfil';
    console.log('✅ Avatar crear post actualizado');
  }

  // Actualizar en la sección de perfil (avatar grande)
  const avatarPerfil = document.querySelector('.avatar-large');
  if (avatarPerfil) {
    avatarPerfil.src = urlConTimestamp;
    avatarPerfil.alt = 'Perfil';
    console.log('✅ Avatar perfil actualizado');
  }

  // Actualizar en posts existentes del usuario actual
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
  if (usuarioActivo) {
    const postsUsuario = document.querySelectorAll('.post');
    postsUsuario.forEach(post => {
      const usernameElement = post.querySelector('h3');
      if (usernameElement && usernameElement.textContent === `@${usuarioActivo.usuario}`) {
        const avatarPost = post.querySelector('.avatar');
        if (avatarPost) {
          avatarPost.src = urlConTimestamp;
          avatarPost.alt = usuarioActivo.usuario;
        }
      }
    });
    console.log('✅ Avatares en posts actualizados');
  }

  console.log('✅ Todos los avatares actualizados correctamente');
}

// ✅ CONFIGURACIÓN DE ESTILOS GLOBALES
function injectGlobalStyles() {
  if (document.getElementById('global-styles')) return;

  const styles = `
    .no-posts, .no-conversations {
      text-align: center;
      color: #777;
      font-style: italic;
      padding: 20px;
    }
    
    .post {
      transition: all 0.3s ease;
    }
    
    .post:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(155, 93, 229, 0.2);
    }
    
    .post.temporal {
      opacity: 0.7;
      background: rgba(155, 93, 229, 0.1);
    }
    
    .create-post button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.id = 'global-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Inyectar estilos globales al cargar
injectGlobalStyles();
