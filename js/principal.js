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

// VARIABLES GLOBALES PARA EL CHAT
let conversacionActual = null;
let mensajesCargados = [];

// FUNCIÓN PARA ABRIR CONVERSACIÓN
async function abrirConversacion(usuario) {
  try {
    console.log(`💬 Intentando abrir conversación con @${usuario}`);
    
    conversacionActual = usuario;
    
    // Obtener referencias a los elementos
    const chatArea = document.getElementById('chatArea');
    const noChatSelected = document.getElementById('noChatSelected');
    const chatUserName = document.getElementById('chatUserName');
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatArea || !noChatSelected) {
      console.error('❌ No se encontraron los elementos del chat');
      mostrarError('Error: No se pudo cargar la interfaz de chat');
      return;
    }
    
    // 1. Ocultar "no chat selected" y mostrar área de chat
    noChatSelected.style.display = 'none';
    chatArea.style.display = 'flex';
    
    // 2. Actualizar información del usuario en el header del chat
    chatUserName.textContent = `@${usuario}`;
    
    // 3. Cargar avatar del usuario
    await cargarAvatarUsuarioChat(usuario);
    
    // 4. Limpiar mensajes anteriores y mostrar estado de carga
    chatMessages.innerHTML = `
      <div class="loading-messages">
        <p>Cargando mensajes...</p>
      </div>
    `;
    
    // 5. Cargar mensajes de la conversación
    await cargarMensajesConversacion(usuario);
    
    // 6. Configurar eventos del chat
    configurarEventosChat();
    
    // 7. Enfocar el input de mensaje
    setTimeout(() => {
      const messageInput = document.getElementById('messageInput');
      if (messageInput) {
        messageInput.focus();
      }
    }, 500);
    
    // 8. Unirse a la sala de chat específica (WebSocket)
    if (window.socketManager && window.socketManager.socket) {
      const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
      window.socketManager.socket.emit('unirseConversacion', {
        usuario: usuarioActivo.usuario,
        conversacion: usuario
      });
      console.log(`🔗 Unido a la conversación con @${usuario}`);
    }
    
    console.log(`✅ Conversación abierta correctamente con @${usuario}`);
    
  } catch (error) {
    console.error('❌ Error abriendo conversación:', error);
    mostrarError('Error al abrir la conversación: ' + error.message);
    
    // Restaurar estado en caso de error
    volverAConversaciones();
  }
}

// FUNCIÓN PARA CARGAR AVATAR EN EL CHAT
async function cargarAvatarUsuarioChat(usuario) {
  try {
    const token = localStorage.getItem('token');
    
    // Intentar con la nueva ruta /perfil/:username
    const response = await fetch(`${API_URL}/perfil/${usuario}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const usuarioInfo = await response.json();
      const avatarUrl = corregirUrlAvatar(usuarioInfo.foto, usuario);
      document.getElementById('chatUserAvatar').src = avatarUrl;
    } else {
      // Fallback a avatar por defecto
      document.getElementById('chatUserAvatar').src = 'img/perfil_default.png';
    }
  } catch (error) {
    console.error('Error cargando avatar del usuario:', error);
    document.getElementById('chatUserAvatar').src = 'img/perfil_default.png';
  }
}

// FUNCIÓN PARA CARGAR MENSAJES DE LA CONVERSACIÓN
async function cargarMensajesConversacion(usuario) {
  try {
    const token = localStorage.getItem('token');
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    
    console.log(`📨 Cargando mensajes reales con @${usuario}`);
    
    // Cargar mensajes reales de la API
    const response = await fetch(`${API_URL}/mensajes/conversacion/${usuario}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const chatMessages = document.getElementById('chatMessages');
    
    // Mostrar estado de carga
    chatMessages.innerHTML = '<div class="loading-messages"><p>Cargando mensajes...</p></div>';

    if (response.ok) {
      const mensajes = await response.json();
      
      console.log(`✅ ${mensajes.length} mensajes recibidos de la API`);
      
      // Limpiar mensajes anteriores
      chatMessages.innerHTML = '';
      
      if (mensajes.length === 0) {
        chatMessages.innerHTML = `
          <div class="no-messages">
            <p>No hay mensajes aún. ¡Envía el primero!</p>
          </div>
        `;
        mensajesCargados = [];
        return;
      }
      
      // Ordenar mensajes por fecha (más antiguos primero)
      const mensajesOrdenados = mensajes.sort((a, b) => 
        new Date(a.fecha) - new Date(b.fecha)
      );
      
      mensajesCargados = mensajesOrdenados;
      
      console.log('🔄 Agregando mensajes al DOM...');
      
      // Mostrar mensajes UNO POR UNO con logging
      mensajesOrdenados.forEach((mensaje, index) => {
        console.log(`➕ Procesando mensaje ${index + 1}:`, mensaje.contenido);
        agregarMensajeAlChat(mensaje, false);
      });
      
      console.log(`✅ ${mensajesOrdenados.length} mensajes procesados`);
      
      // Hacer scroll al final
      setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log('📜 Scroll realizado al final');
      }, 100);
      
    } else {
      throw new Error('No se pudieron cargar los mensajes');
    }
    
  } catch (error) {
    console.error('❌ Error cargando mensajes reales:', error);
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
      <div class="error-messages">
        <p>Error cargando mensajes. Intenta nuevamente.</p>
      </div>
    `;
    mensajesCargados = [];
  }
}

// FUNCIÓN MEJORADA PARA AGREGAR MENSAJE AL CHAT
function agregarMensajeAlChat(mensaje, hacerScroll = true) {
  try {
    console.log('🔄 agregarMensajeAlChat llamado con:', mensaje.contenido);
    
    const chatMessages = document.getElementById('chatMessages');
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    
    if (!chatMessages) {
      console.error('❌ ERROR: chatMessages no encontrado en el DOM');
      return;
    }
    
    console.log('📍 chatMessages encontrado, hijos actuales:', chatMessages.children.length);
    
    // Remover estados vacíos si existen
    const elementosAEliminar = chatMessages.querySelectorAll('.no-messages, .loading-messages, .error-messages');
    elementosAEliminar.forEach(el => {
      console.log('🗑️ Eliminando elemento:', el.className);
      el.remove();
    });
    
    const esPropio = mensaje.emisor === usuarioActivo.usuario;
    console.log('👤 Es mensaje propio:', esPropio);
    
    // Crear elemento del mensaje
    const messageElement = document.createElement('div');
    messageElement.className = `message ${esPropio ? 'own' : 'other'}`;
    
    // FORZAR ESTILOS DE VISIBILIDAD
    messageElement.style.cssText = `
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      align-items: flex-start;
      margin-bottom: 15px;
      max-width: 80%;
      ${esPropio ? 'align-self: flex-end; flex-direction: row-reverse;' : 'align-self: flex-start;'}
    `;
    
    const fecha = new Date(mensaje.fecha);
    const hora = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Crear HTML del mensaje
    messageElement.innerHTML = `
      <img src="${corregirUrlAvatar(mensaje.foto, mensaje.emisor)}" alt="${mensaje.emisor}" 
           class="message-avatar" 
           style="width: 35px; height: 35px; border-radius: 50%; border: 2px solid var(--morado); object-fit: cover; margin: 0 10px;">
      <div class="message-content" style="
        background: ${esPropio ? 'var(--morado)' : 'rgba(255, 255, 255, 0.08)'};
        border: 1px solid ${esPropio ? 'var(--morado)' : 'rgba(255, 255, 255, 0.1)'};
        border-radius: 18px;
        padding: 12px 16px;
        max-width: 100%;
        color: ${esPropio ? 'white' : 'var(--texto)'};
      ">
        <p class="message-text" style="margin: 0; line-height: 1.4; word-wrap: break-word;">${mensaje.contenido}</p>
        <div class="message-time" style="font-size: 11px; color: ${esPropio ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.5)'}; margin-top: 5px; text-align: right;">${hora}</div>
      </div>
    `;
    
    // AGREGAR AL DOM
    console.log('➕ Agregando mensaje al DOM...');
    chatMessages.appendChild(messageElement);
    console.log('✅ Mensaje agregado. Hijos ahora:', chatMessages.children.length);
    
    // Hacer scroll si es necesario
    if (hacerScroll) {
      setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log('📜 Scroll realizado');
      }, 100);
    }
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO en agregarMensajeAlChat:', error);
  }
}

// FUNCIÓN PARA CONFIGURAR EVENTOS DEL CHAT
function configurarEventosChat() {
  const backButton = document.querySelector('.back-to-conversations');
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendMessageBtn');
  
  // Botón para volver a conversaciones
  if (backButton) {
    backButton.addEventListener('click', volverAConversaciones);
  }
  
  // Enviar mensaje al hacer click
  if (sendButton) {
    sendButton.addEventListener('click', enviarMensajeChat);
  }
  
  // Enviar mensaje al presionar Enter
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensajeChat();
      }
    });
    
    // Auto-ajustar altura del textarea
    messageInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  }
}

// FUNCIÓN PARA CONFIGURAR EVENTOS DEL SISTEMA DE MENSAJES
function configurarEventosSistemaMensajes() {
  // Los eventos específicos del chat se configuran cuando se abre una conversación en la función configurarEventosChat()
}

// FUNCIÓN PARA VOLVER A LA LISTA DE CONVERSACIONES
function volverAConversaciones() {
  console.log('🔙 Volviendo a lista de conversaciones');
  
  const chatArea = document.getElementById('chatArea');
  const noChatSelected = document.getElementById('noChatSelected');
  
  if (chatArea && noChatSelected) {
    chatArea.style.display = 'none';
    noChatSelected.style.display = 'flex';
  }
  
  conversacionActual = null;
  mensajesCargados = [];
  
  // Salir de la sala de chat específica
  if (window.socketManager && window.socketManager.socket && conversacionActual) {
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    window.socketManager.socket.emit('salirConversacion', {
      usuario: usuarioActivo.usuario,
      conversacion: conversacionActual
    });
    console.log(`🔗 Salido de la conversación con @${conversacionActual}`);
  }
  
  // Limpiar input de mensaje
  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.value = '';
    messageInput.style.height = 'auto';
  }
}

// FUNCIÓN PARA ENVIAR MENSAJE EN EL CHAT
async function enviarMensajeChat() {
  if (!conversacionActual) {
    mostrarError('No hay conversación seleccionada');
    return;
  }
  
  const messageInput = document.getElementById('messageInput');
  let contenido = messageInput.value.trim();
  
  // ✅ VALIDACIÓN MEJORADA: Permitir cualquier contenido no vacío
  if (!contenido) {
    mostrarError('El mensaje no puede estar vacío');
    messageInput.focus();
    return;
  }

  // Limitar longitud del mensaje
  if (contenido.length > 1000) {
    mostrarError('El mensaje es demasiado largo (máximo 1000 caracteres)');
    return;
  }

  try {
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    
    console.log(`📤 Enviando mensaje a @${conversacionActual}: ${contenido}`);

    // Crear mensaje temporal para mejor UX
    const mensajeTemporal = {
      _id: 'temp-' + Date.now(),
      emisor: usuarioActivo.usuario,
      receptor: conversacionActual,
      contenido: contenido,
      fecha: new Date().toISOString(),
      foto: usuarioActivo.foto,
      temporal: true
    };
    
    // Agregar mensaje temporal al chat
    agregarMensajeAlChat(mensajeTemporal);
    
    // Limpiar input inmediatamente
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Enviar mensaje a través de WebSocket
    if (window.socketManager && window.socketManager.socket) {
      window.socketManager.socket.emit('enviarMensajePrivado', {
        emisor: usuarioActivo.usuario,
        receptor: conversacionActual,
        contenido: contenido
      });
      console.log('✅ Mensaje enviado via WebSocket');
    } else {
      // Fallback: enviar por HTTP
      console.log('🔄 WebSocket no disponible, usando HTTP fallback');
      await enviarMensajeHTTP(contenido, conversacionActual);
    }
    
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    mostrarError('Error al enviar el mensaje: ' + error.message);
    
    // Remover mensaje temporal en caso de error
    const chatMessages = document.getElementById('chatMessages');
    const mensajesTemporales = chatMessages.querySelectorAll('.message.temporal');
    mensajesTemporales.forEach(msg => msg.remove());
  }
}

// FUNCIÓN DE FALLBACK PARA ENVIAR MENSAJE POR HTTP
async function enviarMensajeHTTP(contenido, receptor) {
  try {
    const token = localStorage.getItem('token');
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
    
    const response = await fetch(`${API_URL}/mensajes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        emisor: usuarioActivo.usuario,
        receptor: receptor,
        contenido: contenido
      })
    });
    
    if (!response.ok) {
      throw new Error('Error HTTP: ' + response.status);
    }
    
    console.log('✅ Mensaje enviado por HTTP');
    
  } catch (error) {
    console.error('❌ Error enviando mensaje por HTTP:', error);
    throw error;
  }
}

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

      // Escuchar nuevos mensajes PRIVADOS
      this.socket.on('nuevoMensajePrivado', (mensaje) => {
  console.log('📨 Nuevo mensaje privado recibido:', mensaje);
  
  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
  
  // VERIFICACIÓN MEJORADA: Solo mostrar si es relevante para la conversación actual
  if (conversacionActual) {
    const esMensajeRelevante = 
      (mensaje.emisor === conversacionActual && mensaje.receptor === usuarioActivo.usuario) ||
      (mensaje.receptor === conversacionActual && mensaje.emisor === usuarioActivo.usuario);
    
    if (esMensajeRelevante) {
      console.log('💬 Mensaje relevante para conversación actual, agregando...');
      agregarMensajeAlChat(mensaje);
    } else {
      console.log('📭 Mensaje recibido pero no es para la conversación actual');
    }
  }
  
  // Actualizar conversaciones para mostrar notificaciones
  cargarConversaciones();
});

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

    enviarMensajePrivado(mensajeData) {
  if (this.socket) {
    this.socket.emit('enviarMensajePrivado', mensajeData);
    console.log('✅ Mensaje privado enviado via WebSocket');
  } else {
    console.error('❌ WebSocket no conectado');
    // Fallback a HTTP
    enviarMensajeHTTP(mensajeData.contenido, mensajeData.receptor);
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

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'sesion.html';
    return;
  }

  try {
    const res = await fetch('http://localhost:3001/api/usuarioActual', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      localStorage.removeItem('token');
      window.location.href = 'sesion.html';
      return;
    }

    const usuario = await res.json();
    console.log('👤 Usuario autenticado:', usuario);

    // Actualiza interfaz
    document.querySelector('.username').textContent = '@' + usuario.usuario;
    document.querySelector('.user-avatar img').src = usuario.foto || '/img/perfil_default.png';

    // Si es admin, muestra el panel admin
    if (usuario.rol === 'admin') {
      document.getElementById('adminMenuItem').style.display = 'block';
      document.getElementById('admin').style.display = 'block';
    }

  } catch (error) {
    console.error('❌ Error obteniendo usuario actual:', error);
    localStorage.removeItem('token');
    window.location.href = 'sesion.html';
  }
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
        
        // Cargar datos específicos de la sección
        if (sectionId === 'perfil') {
          cargarPostsUsuario();
        } else if (sectionId === 'mensajes') {
          cargarConversaciones();
          // Asegurar que volvemos a la vista de lista al cambiar a mensajes
          volverAConversaciones();
        }
      }
    });
  });
}

// FUNCIÓN PARA ACTUALIZAR INFORMACIÓN DEL USUARIO EN SIDEBAR
function actualizarInfoUsuario(usuario) {
  console.log('🔄 Actualizando info usuario en sidebar:', usuario);
  
  // ACTUALIZADO: Selector corregido
  const usernameElement = document.querySelector('.user-info span');
  if (usernameElement) {
    usernameElement.textContent = `@${usuario.usuario}`;
    console.log('✅ Nombre de usuario actualizado en sidebar:', usuario.usuario);
  } else {
    console.error('❌ No se encontró el elemento .user-info span');
    // Buscar alternativas
    const alternativeElement = document.querySelector('.user-info .username') || 
                              document.querySelector('.user-info');
    if (alternativeElement) {
      alternativeElement.textContent = `@${usuario.usuario}`;
      console.log('✅ Nombre de usuario actualizado usando selector alternativo');
    }
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
  
  // ✅ NUEVO: Cargar contador real de posts
  cargarContadorPosts(usuario.usuario);
  
  console.log('✅ Sección perfil actualizada');
}

// ✅ NUEVA FUNCIÓN: Cargar contador real de posts
async function cargarContadorPosts(usuario) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/posts/usuario/${usuario}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const posts = await response.json();
      const postCount = posts.length;
      
      // Actualizar el contador en el perfil
      const postCountElement = document.querySelector('.profile-stats .stat strong');
      if (postCountElement) {
        postCountElement.textContent = postCount;
        console.log(`✅ Contador de posts actualizado: ${postCount} posts`);
      }
    }
  } catch (error) {
    console.error('❌ Error cargando contador de posts:', error);
    // Mantener el valor por defecto en caso de error
  }
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
    
    // Cargar matches primero
    const matchesResponse = await fetch(`${API_URL}/usuarios/matches`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (matchesResponse.ok) {
      const matches = await matchesResponse.json();
      const matchesFiltrados = matches.filter(match => 
        match.usuario !== 'general' && match.usuario !== '@general'
      );
      actualizarListaConversaciones(matchesFiltrados);
    } else {
      // Fallback a conversaciones normales
      const response = await fetch(`${API_URL}/mensajes/conversaciones`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const conversaciones = await response.json();
        const conversacionesFiltradas = conversaciones.filter(conv => 
          conv.usuario !== 'general' && conv.usuario !== '@general'
        );
        actualizarListaConversaciones(conversacionesFiltradas);
      } else {
        mostrarConversacionesEjemplo();
      }
    }
  } catch (error) {
    console.error('Error cargando conversaciones:', error);
    mostrarConversacionesEjemplo();
  }
}

// FUNCIÓN PARA ACTUALIZAR LISTA DE CONVERSACIONES
function actualizarListaConversaciones(conversaciones) {
  const conversationsList = document.querySelector('.conversations-list');
  
  if (!conversationsList) return;
  
  conversationsList.innerHTML = '';
  
  if (conversaciones.length === 0) {
    conversationsList.innerHTML = `
      <div class="no-conversations" style="text-align: center; padding: 40px 20px;">
        <h3 style="color: var(--morado-claro); margin-bottom: 10px;">Sin conversaciones</h3>
        <p style="color: #777;">Encuentra matches en la sección de descubrimiento</p>
      </div>
    `;
    return;
  }
  
  conversaciones.forEach(conversacion => {
    const conversationElement = document.createElement('div');
    conversationElement.className = 'conversation';
    conversationElement.dataset.usuario = conversacion.usuario;
    
    // Determinar el último mensaje o mensaje por defecto
    const ultimoMensaje = conversacion.ultimoMensaje || 
      (conversacion.fechaMatch ? '¡Nuevo match! ¡Inicia la conversación!' : 'Inicia una conversación');
    
    // Determinar la hora
    const hora = conversacion.ultimaVez || 
      (conversacion.fechaMatch ? new Date(conversacion.fechaMatch).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '');
    
    conversationElement.innerHTML = `
      <img src="${corregirUrlAvatar(conversacion.foto, conversacion.usuario)}" alt="${conversacion.usuario}" class="avatar">
      <div class="conversation-info">
        <h3>@${conversacion.usuario}</h3>
        <p>${ultimoMensaje}</p>
        ${conversacion.fechaMatch ? '<small class="match-badge">💜 Match</small>' : ''}
      </div>
      <span class="time">${hora}</span>
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
  
  if (window.socketManager) {
    if (receptor === 'general') {
      // Mensaje general
      window.socketManager.enviarMensaje({
        emisor: usuarioActivo.usuario,
        receptor: receptor,
        contenido: contenido,
        fecha: new Date().toISOString()
      });
    } else {
      // Mensaje privado
      window.socketManager.enviarMensajePrivado({
        emisor: usuarioActivo.usuario,
        receptor: receptor,
        contenido: contenido,
        fecha: new Date().toISOString()
      });
    }
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

// FUNCIÓN DE DEBUG
function debugChatCompleto() {
  console.log('=== DEBUG COMPLETO DEL CHAT ===');
  
  const chatArea = document.getElementById('chatArea');
  const chatMessages = document.getElementById('chatMessages');
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendMessageBtn');
  
  console.log('📍 Conversación actual:', conversacionActual);
  console.log('💬 Área de chat:', chatArea ? 'ENCONTRADO' : 'NO ENCONTRADO');
  console.log('📦 Contenedor de mensajes:', chatMessages ? 'ENCONTRADO' : 'NO ENCONTRADO');
  console.log('✏️ Input de mensaje:', messageInput ? 'ENCONTRADO' : 'NO ENCONTRADO');
  console.log('📤 Botón enviar:', sendButton ? 'ENCONTRADO' : 'NO ENCONTRADO');
  
  if (chatMessages) {
    console.log('📊 Mensajes en el DOM:', chatMessages.children.length);
    
    // Mostrar info de cada mensaje
    Array.from(chatMessages.children).forEach((msg, index) => {
      console.log(`   ${index + 1}. ${msg.className} - ${msg.textContent}`);
    });
  }
  
  // Probar WebSocket
  if (window.socketManager && window.socketManager.socket) {
    console.log('🔌 WebSocket conectado:', window.socketManager.socket.connected);
    console.log('🆔 Socket ID:', window.socketManager.socket.id);
  } else {
    console.log('❌ WebSocket no disponible');
  }
  
  // Probar agregar mensaje de debug
  if (conversacionActual) {
    const mensajeDebug = {
      _id: 'debug-' + Date.now(),
      emisor: 'debug-system',
      receptor: conversacionActual,
      contenido: 'Este es un mensaje de prueba del sistema - ' + new Date().toLocaleTimeString(),
      fecha: new Date().toISOString(),
      foto: 'img/perfil_default.png'
    };
    
    console.log('🐛 Agregando mensaje de debug...');
    agregarMensajeAlChat(mensajeDebug);
    console.log('✅ Mensaje de debug agregado');
  } else {
    console.log('❌ No hay conversación activa para probar');
  }
  
  console.log('=== FIN DEBUG ===');
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

  // Configurar eventos del sistema de mensajes
  configurarEventosSistemaMensajes();
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

// DiscoveryManager
class DiscoveryManager {
  constructor() {
    this.usuariosDisponibles = [];
    this.usuariosQueMeDieronLike = [];
    this.usuarioActual = null;
    this.usuariosVistos = new Set();
    this.init();
  }

  async init() {
    await this.cargarUsuariosParaDescubrir();
    await this.cargarUsuariosQueMeDieronLike();
    this.configurarEventos();
  }

  async cargarUsuariosQueMeDieronLike() {
    try {
      const token = localStorage.getItem('token');
      const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
      
      const response = await fetch(`${API_URL}/usuarios/quienes-me-dieron-like`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        this.usuariosQueMeDieronLike = await response.json();
        console.log('❤ Usuarios que me dieron like:', this.usuariosQueMeDieronLike);
      }
    } catch (error) {
      console.error('❌ Error cargando usuarios que me dieron like:', error);
    }
  }

  // FUNCIÓN: Priorizar usuarios que me dieron like
  priorizarUsuariosQueMeDieronLike() {
    if (this.usuariosQueMeDieronLike.length === 0) return;
    
    const usuariosQueMeDieronLikeDisponibles = this.usuariosDisponibles.filter(usuario =>
      this.usuariosQueMeDieronLike.some(u => u.usuario === usuario.usuario)
    );
    
    const otrosUsuarios = this.usuariosDisponibles.filter(usuario =>
      !this.usuariosQueMeDieronLike.some(u => u.usuario === usuario.usuario)
    );
    
    // Combinar: primero los que me dieron like, luego los demás
    this.usuariosDisponibles = [...usuariosQueMeDieronLikeDisponibles, ...otrosUsuarios];
    
    console.log(`🎯 ${usuariosQueMeDieronLikeDisponibles.length} usuarios que me dieron like priorizados`);
  }

  // Cargar usuarios disponibles para descubrir
  async cargarUsuariosParaDescubrir() {
  try {
    const token = localStorage.getItem('token');
    
    console.log('🔍 Cargando usuarios para descubrir...');
    
    // ✅ CORREGIR: Usar la ruta correcta
    const response = await fetch(`${API_URL}/usuarios/descubrir`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const usuarios = await response.json();
      console.log('👥 Usuarios recibidos:', usuarios);
      
      // Filtrar el usuario actual
      const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
      this.usuariosDisponibles = usuarios.filter(usuario => 
        usuario.usuario !== usuarioActivo.usuario
      );
      
      console.log(`👥 ${this.usuariosDisponibles.length} usuarios disponibles para descubrir`);
      
      // Priorizar usuarios que me dieron like
      this.priorizarUsuariosQueMeDieronLike();
      
      // Mostrar el primer usuario si hay disponibles
      if (this.usuariosDisponibles.length > 0) {
        this.mostrarSiguienteUsuario();
      } else {
        this.mostrarSinUsuarios();
      }
    } else {
      console.error('❌ Error en respuesta del servidor:', response.status);
      this.mostrarErrorCarga();
    }
  } catch (error) {
    console.error('❌ Error cargando usuarios para descubrir:', error);
    this.mostrarErrorCarga();
  }
}

  // Mostrar siguiente usuario aleatorio
  mostrarSiguienteUsuario() {
    if (this.usuariosDisponibles.length === 0) {
      this.mostrarSinUsuarios();
      return;
    }

    // Si hay usuarios que me dieron like, mostrar esos primero
    const usuarioQueMeDioLike = this.usuariosDisponibles.find(usuario =>
      this.usuariosQueMeDieronLike.some(u => u.usuario === usuario.usuario)
    );

    if (usuarioQueMeDioLike) {
      this.usuarioActual = usuarioQueMeDioLike;
      // Remover de disponibles
      const index = this.usuariosDisponibles.findIndex(u => u.usuario === usuarioQueMeDioLike.usuario);
      this.usuariosDisponibles.splice(index, 1);
      console.log('🎯 Mostrando usuario que me dio like:', this.usuarioActual.usuario);
    } else {
      // Seleccionar usuario aleatorio normal
      const randomIndex = Math.floor(Math.random() * this.usuariosDisponibles.length);
      this.usuarioActual = this.usuariosDisponibles[randomIndex];
      this.usuariosDisponibles.splice(randomIndex, 1);
    }

    this.actualizarInterfazUsuario();
  }

  // Actualizar la interfaz con el usuario actual
  actualizarInterfazUsuario() {
    const profileCard = document.querySelector('.profile-card');
    if (!profileCard || !this.usuarioActual) return;

    const edad = this.calcularEdad(this.usuarioActual.fechaNacimiento);
    const nombreMostrar = this.usuarioActual.nombre || this.usuarioActual.usuario;
    const biografiaMostrar = this.usuarioActual.biografia || 'Este usuario aún no tiene biografía';
    
    // ✅ NUEVO: Verificar si este usuario ya me dio like
    const meDioLike = this.usuariosQueMeDieronLike.some(u => u.usuario === this.usuarioActual.usuario);
    const badgeLike = meDioLike ? '<div class="like-badge">❤ Te dio like</div>' : '';

    profileCard.innerHTML = `
      <img src="${corregirUrlAvatar(this.usuarioActual.foto, this.usuarioActual.usuario)}" alt="${this.usuarioActual.usuario}" class="discover-avatar">
      <h3>${nombreMostrar}${edad ? `, ${edad}` : ''}</h3>
      <p>${biografiaMostrar}</p>
      ${badgeLike}
      <div class="discover-buttons">
        <button class="dislike">✖</button>
        <button class="like">❤</button>
      </div>
    `;

    // Re-configurar eventos de los botones
    this.configurarEventosBotones();
    
    console.log('✅ Mostrando usuario:', this.usuarioActual.usuario, 'Me dio like:', meDioLike);
  }

  // Calcular edad a partir de fecha de nacimiento
  calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return null;
    try {
      const nacimiento = new Date(fechaNacimiento);
      const hoy = new Date();
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      
      return edad;
    } catch (error) {
      console.error('Error calculando edad:', error);
      return null;
    }
  }

  // Mostrar estado cuando no hay usuarios
  mostrarSinUsuarios() {
    const profileCard = document.querySelector('.profile-card');
    if (profileCard) {
      profileCard.innerHTML = `
        <div class="no-users" style="text-align: center; padding: 20px;">
          <h3 style="color: var(--morado-claro); margin-bottom: 10px;">¡Vaya!</h3>
          <p style="color: #ccc; margin-bottom: 15px;">No hay más usuarios para descubrir en este momento.</p>
          <button class="reload-users" style="background: var(--morado); color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer;">
            🔄 Recargar
          </button>
        </div>
      `;

      const reloadBtn = profileCard.querySelector('.reload-users');
      if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
          this.recargarUsuarios();
        });
      }
    }
  }

  // Mostrar error de carga
  mostrarErrorCarga() {
    const profileCard = document.querySelector('.profile-card');
    if (profileCard) {
      profileCard.innerHTML = `
        <div class="error-loading" style="text-align: center; padding: 20px;">
          <h3 style="color: #f55; margin-bottom: 10px;">Error de conexión</h3>
          <p style="color: #ccc; margin-bottom: 15px;">No se pudieron cargar los usuarios.</p>
          <button class="retry-load" style="background: var(--morado); color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer;">
            🔄 Reintentar
          </button>
        </div>
      `;

      const retryBtn = profileCard.querySelector('.retry-load');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.recargarUsuarios();
        });
      }
    }
  }

  // Recargar lista de usuarios
  async recargarUsuarios() {
    console.log('🔄 Recargando usuarios...');
    await this.cargarUsuariosParaDescubrir();
  }

  // Configurar eventos de los botones like/dislike
  configurarEventosBotones() {
    const likeBtn = document.querySelector('.discover-panel .like');
    const dislikeBtn = document.querySelector('.discover-panel .dislike');

    if (likeBtn) {
      // Remover event listeners anteriores
      likeBtn.replaceWith(likeBtn.cloneNode(true));
      const newLikeBtn = document.querySelector('.discover-panel .like');
      
      newLikeBtn.addEventListener('click', () => {
        this.manejarLike();
      });
    }

    if (dislikeBtn) {
      // Remover event listeners anteriores
      dislikeBtn.replaceWith(dislikeBtn.cloneNode(true));
      const newDislikeBtn = document.querySelector('.discover-panel .dislike');
      
      newDislikeBtn.addEventListener('click', () => {
        this.manejarDislike();
      });
    }
  }

  // Manejar acción de like
  async manejarLike() {
  if (!this.usuarioActual) {
    console.error('❌ No hay usuario actual para dar like');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));

    console.log('❤ Enviando like a:', this.usuarioActual.usuario);

    // VERIFICAR QUE LOS DATOS SE ENVÍEN CORRECTAMENTE
    const likeData = {
      usuarioReceptor: this.usuarioActual.usuario,
      usuarioEmisor: usuarioActivo.usuario
    };

    console.log('📤 Datos del like:', likeData);
    console.log('🔑 Token disponible:', !!token);
    console.log('🌐 URL de la API:', `${API_URL}/usuarios/like`);

    // Mostrar estado de carga
    mostrarExito(`Enviando like a @${this.usuarioActual.usuario}...`);

    const response = await fetch(`${API_URL}/usuarios/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(likeData)
    });

    console.log('📥 Respuesta del servidor - Status:', response.status);
    console.log('📥 Respuesta del servidor - OK:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error HTTP:', response.status, errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const resultado = await response.json();
    console.log('✅ Respuesta del like:', resultado);

    if (resultado.success) {
      if (resultado.match && resultado.matchReciproco) {
        mostrarExito(`🎉 ¡Match con @${this.usuarioActual.usuario}! Ahora pueden chatear`);
        
        // Actualizar la lista de conversaciones
        setTimeout(() => {
          this.actualizarConversaciones();
        }, 1000);
      } else {
        mostrarExito(`❤ Te gusta @${this.usuarioActual.usuario}!`);
      }
    } else {
      console.warn('⚠ Like no pudo ser procesado correctamente');
      mostrarExito(`❤ Te gusta @${this.usuarioActual.usuario}!`);
    }
  } catch (error) {
    console.error('❌ Error enviando like:', error);
    mostrarError(`Error al enviar like: ${error.message}`);
    
    // Mostrar like localmente aunque falle
    mostrarExito(`❤ Te gusta @${this.usuarioActual.usuario}! (guardado localmente)`);
  }

  // Mostrar siguiente usuario después de un breve delay
  setTimeout(() => {
    this.mostrarSiguienteUsuario();
  }, 1500);
}

  // Actualizar conversaciones cuando hay nuevo match
  async actualizarConversaciones() {
    if (typeof cargarConversaciones === 'function') {
      await cargarConversaciones();
    }
  }

  // Manejar acción de dislike
  manejarDislike() {
    if (!this.usuarioActual) return;

    console.log('✖ Dislike a:', this.usuarioActual.usuario);
    mostrarAdvertencia(`✖ No te interesa @${this.usuarioActual.usuario}`);
    
    // Mostrar siguiente usuario después de un breve delay
    setTimeout(() => {
      this.mostrarSiguienteUsuario();
    }, 1000);
  }

  // Configurar eventos generales
  configurarEventos() {
    this.configurarEventosBotones();
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

// FUNCIÓN PARA CAMBIAR AVATAR
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
