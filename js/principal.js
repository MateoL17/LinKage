// ✅ FUNCIÓN MEJORADA PARA DETECTAR API URL DINÁMICAMENTE
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

  // Cargar datos del usuario en la barra lateral
  await cargarDatosUsuario(usuarioActivo);
  
  // Conectar WebSocket
  conectarWebSocket(usuarioActivo.usuario);

  // Cargar datos iniciales
  await cargarPosts();
  await cargarUsuariosParaChat();
  configurarEventos();
});

// ✅ FUNCIÓN MEJORADA PARA CARGAR DATOS DEL USUARIO
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
      
      // Actualizar interfaz
      const avatarSidebar = document.querySelector('.user-avatar img');
      if (avatarSidebar) {
        avatarSidebar.src = perfil.foto || 'img/perfil_default.png';
        avatarSidebar.alt = perfil.usuario;
      }

      const avatarCreatePost = document.querySelector('.create-post .avatar');
      if (avatarCreatePost) {
        avatarCreatePost.src = perfil.foto || 'img/perfil_default.png';
      }

      return perfil;
    }
  } catch (error) {
    console.error('Error cargando perfil:', error);
    // Usar datos de localStorage como fallback
    const avatarSidebar = document.querySelector('.user-avatar img');
    if (avatarSidebar) {
      avatarSidebar.src = usuario.foto || 'img/perfil_default.png';
      avatarSidebar.alt = usuario.usuario;
    }
  }
}

// ✅ FUNCIÓN MEJORADA PARA CONECTAR WEBSOCKET
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

// Función para cargar posts
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
      const feed = document.querySelector('.feed');
      
      // Limpiar posts existentes (excepto el de crear post)
      const postsExistentes = feed.querySelectorAll('.post:not(.create-post)');
      postsExistentes.forEach(post => post.remove());

      // Agregar posts
      posts.forEach(post => {
        agregarPostAlFeed(post);
      });
    }
  } catch (error) {
    console.error('Error cargando posts:', error);
  }
}

// Función para agregar post al feed
function agregarPostAlFeed(post) {
  const feed = document.querySelector('.feed');
  const createPost = feed.querySelector('.create-post');
  
  const postElement = document.createElement('div');
  postElement.className = 'post';
  postElement.innerHTML = `
    <img src="${post.foto || 'img/perfil_default.png'}" alt="Perfil" class="avatar">
    <div class="post-content">
      <h3>@${post.usuario}</h3>
      <p>${post.contenido}</p>
      <small>${new Date(post.fecha).toLocaleString()}</small>
    </div>
  `;
  
  feed.insertBefore(postElement, createPost.nextSibling);
}

// Función para cargar usuarios para el chat
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
      // Aquí puedes implementar una lista de usuarios para chat
      console.log('Usuarios disponibles para chat:', usuarios);
    }
  } catch (error) {
    console.error('Error cargando usuarios:', error);
  }
}

// Función para enviar post
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
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error enviando el post: ' + error.message);
  }
}

// Función para enviar mensaje
function enviarMensaje(contenido, receptor = 'general') {
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
  
  socket.emit('enviarMensaje', {
    emisor: usuarioActivo.usuario,
    receptor: receptor,
    contenido: contenido
  });
}

// Función para agregar mensaje al chat
function agregarMensajeAlChat(mensaje) {
  const chatBox = document.querySelector('.chat-box');
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  messageElement.innerHTML = `
    <strong>@${mensaje.emisor}:</strong> ${mensaje.contenido}
    <small>${new Date(mensaje.fecha).toLocaleTimeString()}</small>
  `;
  
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Configurar eventos del DOM
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

    // Permitir enviar con Enter
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
        enviarMensaje(contenido, 'general'); // Por ahora chat general
        msgInput.value = '';
      }
    });

    // Permitir enviar con Enter
    msgInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        enviarMsgBtn.click();
      }
    });
  }

  // Configurar cambio de avatar
  configurarCambioAvatar();
}

// ✅ FUNCIÓN MEJORADA PARA CONFIGURAR CAMBIO DE AVATAR
function configurarCambioAvatar() {
  const avatarImgs = document.querySelectorAll('.user-avatar img, .create-post .avatar');
  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'image/*';
  uploadInput.style.display = 'none';
  document.body.appendChild(uploadInput);

  avatarImgs.forEach(img => {
    img.style.cursor = 'pointer';
    img.title = 'Haz clic para cambiar tu avatar';
    img.addEventListener('click', () => {
      uploadInput.click();
    });
  });

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ✅ IMPLEMENTACIÓN COMPLETA DEL CAMBIO DE AVATAR
    await cambiarAvatar(file);
  });
}

// ✅ FUNCIÓN PARA CAMBIAR AVATAR
async function cambiarAvatar(file) {
  try {
    const token = localStorage.getItem('token');
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona una imagen válida.');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 5MB.');
      return;
    }

    // Mostrar indicador de carga
    const avatarImgs = document.querySelectorAll('.user-avatar img, .create-post .avatar');
    avatarImgs.forEach(img => {
      img.style.opacity = '0.5';
    });

    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append('foto', file);

    // Enviar al servidor
    const response = await fetch(`${API_URL}/upload/foto`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      // Actualizar en localStorage
      usuarioActivo.foto = data.foto;
      localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActivo));
      
      // Actualizar todas las imágenes de perfil en la interfaz
      actualizarAvataresEnInterfaz(data.foto);
      
      alert('¡Avatar actualizado exitosamente!');
    } else {
      alert('Error: ' + (data.error || 'No se pudo cambiar el avatar'));
    }

  } catch (error) {
    console.error('Error cambiando avatar:', error);
    alert('Error al cambiar el avatar. Intenta nuevamente.');
  } finally {
    // Restaurar opacidad
    const avatarImgs = document.querySelectorAll('.user-avatar img, .create-post .avatar');
    avatarImgs.forEach(img => {
      img.style.opacity = '1';
    });
  }
}

// ✅ FUNCIÓN PARA ACTUALIZAR AVATARES EN LA INTERFAZ
function actualizarAvataresEnInterfaz(nuevaFotoUrl) {
  // Actualizar en la barra lateral
  const avatarSidebar = document.querySelector('.user-avatar img');
  if (avatarSidebar) {
    avatarSidebar.src = nuevaFotoUrl;
  }

  // Actualizar en el área de crear post
  const avatarCreatePost = document.querySelector('.create-post .avatar');
  if (avatarCreatePost) {
    avatarCreatePost.src = nuevaFotoUrl;
  }

  // Actualizar en posts existentes del usuario actual
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
  const postsUsuario = document.querySelectorAll('.post');
  postsUsuario.forEach(post => {
    const usernameElement = post.querySelector('h3');
    if (usernameElement && usernameElement.textContent === `@${usuarioActivo.usuario}`) {
      const avatarPost = post.querySelector('.avatar');
      if (avatarPost) {
        avatarPost.src = nuevaFotoUrl;
      }
    }
  });
}

// Cerrar sesión
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.querySelector('.logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('usuarioActivo');
      if (socket) socket.disconnect();
      window.location.href = 'sesion.html';
    });
  }
});
