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
  else if (hostname.includes('ngrok.io') || hostname.includes('localhost.run')) {
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

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem('token');
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));

  // Verificar autenticación
  if (!token || !usuarioActivo) {
    window.location.href = "sesion.html";
    return;
  }

  console.log('👤 Usuario activo al cargar:', usuarioActivo);

  // Actualizar avatares inmediatamente con datos de localStorage
  if (usuarioActivo.foto) {
    actualizarAvataresEnInterfaz(corregirUrlAvatar(usuarioActivo.foto));
  }
  
  // Cargar datos actualizados del usuario
  await cargarDatosUsuario(usuarioActivo);
  
  // Conectar WebSocket
  conectarWebSocket(usuarioActivo.usuario);

  // Cargar datos iniciales
  await cargarPosts();
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

// FUNCIÓN MEJORADA PARA CONECTAR WEBSOCKET
function conectarWebSocket(usuario) {
  // Determinar la URL del WebSocket dinámicamente
  let socketUrl = 'http://localhost:3001';
  const hostname = window.location.hostname;
  
  if (hostname === '192.168.100.6') {
    socketUrl = 'http://192.168.100.6:3001';
  } else if (hostname.includes('ngrok.io')) {
    socketUrl = `https://${hostname}`;
  }

  console.log('🔌 Conectando WebSocket a:', socketUrl);
  
  socket = io(socketUrl, {
    transports: ['websocket', 'polling']
  });
  
  // Unirse a la sala del usuario
  socket.emit('unirseSala', usuario);

  // Escuchar nuevos mensajes
  socket.on('nuevoMensaje', (mensaje) => {
    agregarMensajeAlChat(mensaje);
  });

  // Escuchar nuevos posts
  socket.on('nuevoPost', (post) => {
    agregarPostAlFeed(post);
  });

  socket.on('connect', () => {
    console.log('✅ Conectado al servidor WebSocket');
  });

  socket.on('disconnect', () => {
    console.log('❌ Desconectado del servidor WebSocket');
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Error conectando WebSocket:', error);
  });
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
      
      // Limpiar posts existentes
      if (postsContainer) {
        postsContainer.innerHTML = '';
      }

      // Agregar posts
      posts.forEach(post => {
        // Asegurarse de que el post tenga la foto del usuario
        if (!post.usuarioFoto) {
          // Si no tiene foto, intentar obtenerla del usuario
          obtenerFotoUsuario(post.usuario).then(foto => {
            post.usuarioFoto = foto;
            agregarPostAlFeed(post);
          });
        } else {
          agregarPostAlFeed(post);
        }
      });
    }
  } catch (error) {
    console.error('Error cargando posts:', error);
  }
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

        posts.forEach(post => {
          const postElement = document.createElement('div');
          postElement.className = 'post';
          postElement.innerHTML = `
            <img src="${post.foto || 'img/perfil_default.png'}" alt="${post.usuario}" class="avatar">
            <div class="post-content">
              <h3>@${post.usuario}</h3>
              <p>${post.contenido}</p>
              <small>${new Date(post.fecha).toLocaleString()}</small>
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
function agregarPostAlFeed(post) {
  const postsContainer = document.querySelector('.posts-container');
  
  if (!postsContainer) return;
  
  const postElement = document.createElement('div');
  postElement.className = 'post';
  postElement.innerHTML = `
    <img src="${corregirUrlAvatar(post.usuarioFoto, post.usuario)}" alt="${post.usuario}" class="avatar">
    <div class="post-content">
      <h3>@${post.usuario}</h3>
      <p>${post.contenido}</p>
      <small>${new Date(post.fecha).toLocaleString()}</small>
    </div>
  `;
  
  postsContainer.appendChild(postElement);
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
    console.log('Post enviado:', nuevoPost);
    
    // Agregar el post al feed inmediatamente
    agregarPostAlFeed(nuevoPost);
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error enviando el post: ' + error.message);
  }
}

// FUNCIÓN PARA ENVIAR MENSAJE
function enviarMensaje(contenido, receptor = 'general') {
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
  
  if (socket) {
    socket.emit('enviarMensaje', {
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
    crearPostBtn.addEventListener('click', () => {
      const contenido = postTextarea.value.trim();
      if (contenido) {
        enviarPost(contenido);
        postTextarea.value = '';
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
  
  // Configurar cerrar sesión
  configurarCerrarSesion();
}

// ✅ FUNCIÓN PARA CONFIGURAR BOTONES DE DESCUBRIR
function configurarBotonesDescubrir() {
  const likeBtn = document.querySelector('.discover .like');
  const dislikeBtn = document.querySelector('.discover .dislike');
  
  if (likeBtn) {
    likeBtn.addEventListener('click', () => {
      alert('❤ ¡Te gusta este perfil!');
      // Aquí podrías implementar la lógica para guardar el like
      cargarNuevoPerfilDescubrir();
    });
  }
  
  if (dislikeBtn) {
    dislikeBtn.addEventListener('click', () => {
      alert('✖ No te interesa este perfil');
      // Aquí podrías implementar la lógica para guardar el dislike
      cargarNuevoPerfilDescubrir();
    });
  }
}

// ✅ FUNCIÓN PARA CARGAR NUEVO PERFIL EN DESCUBRIR
function cargarNuevoPerfilDescubrir() {
  const profileCard = document.querySelector('.profile-card');
  if (profileCard) {
    profileCard.innerHTML = `
      <img src="/img/perfil_default.png" alt="Perfil">
      <h3>Nuevo Usuario, 25</h3>
      <p>Buscando nuevas amistades y conexiones 🌟</p>
      <div class="buttons">
        <button class="dislike">✖</button>
        <button class="like">❤</button>
      </div>
    `;
    
    // Reconfigurar los eventos para los nuevos botones
    configurarBotonesDescubrir();
  }
}

// ✅ FUNCIÓN MEJORADA PARA CONFIGURAR CAMBIO DE AVATAR
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

  // Actualizar en el área de crear post
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

// ✅ FUNCIÓN PARA CONFIGURAR CERRAR SESIÓN
function configurarCerrarSesion() {
  const logoutBtn = document.querySelector('.logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuarioActivo');
        if (socket) socket.disconnect();
        window.location.href = 'sesion.html';
      }
    });
  }
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
  `;

  const styleSheet = document.createElement('style');
  styleSheet.id = 'global-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Inyectar estilos globales al cargar
injectGlobalStyles();
