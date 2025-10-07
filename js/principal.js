const API_URL = 'http://localhost:3001/api';
let socket;

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

// Función para cargar datos del usuario en la barra lateral
async function cargarDatosUsuario(usuario) {
  const avatarSidebar = document.querySelector('.user-avatar img');
  if (avatarSidebar) {
    avatarSidebar.src = usuario.foto || 'img/perfil_default.png';
    avatarSidebar.alt = usuario.usuario;
  }
}

// Función para conectar WebSocket
function conectarWebSocket(usuario) {
  socket = io('http://localhost:3001');
  
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

  // Configurar cambio de avatar (si lo tienes)
  configurarCambioAvatar();
}

// Función para configurar cambio de avatar
function configurarCambioAvatar() {
  const avatarImgs = document.querySelectorAll('.user-avatar img, .create-post .avatar');
  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'image/*';
  uploadInput.style.display = 'none';
  document.body.appendChild(uploadInput);

  avatarImgs.forEach(img => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => {
      // Por ahora solo abre el selector, luego implementas la subida
      uploadInput.click();
    });
  });

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Aquí puedes implementar la subida de imagen al backend
    alert('Función de cambio de avatar en desarrollo. Por ahora usa la imagen por defecto.');
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