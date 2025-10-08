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

console.log('🔗 API URL:', API_URL);
console.log('📍 Hostname:', window.location.hostname);

document.addEventListener('DOMContentLoaded', function() {
  // Verificar si ya está logueado
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = 'principal.html';
    return;
  }

  // Configurar eventos de los formularios
  configurarFormularioLogin();
  configurarFormularioRegistro();
  configurarCambioFormulario();
  configurarModales();

  console.log('✅ Módulos cargados:', {
    login: '✓',
    registro: '✓', 
    cambioFormulario: '✓',
    modales: '✓'
  });
});

function configurarFormularioLogin() {
  const loginForm = document.getElementById('loginForm');
  const usuarioInput = document.getElementById('loginUsuario');
  const passwordInput = document.getElementById('loginPassword');

  if (loginForm && usuarioInput && passwordInput) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const usuario = usuarioInput.value.trim();
      const password = passwordInput.value.trim();

      if (!usuario || !password) {
        mostrarError('Por favor, completa todos los campos');
        return;
      }

      await iniciarSesion(usuario, password);
    });

    console.log('✅ Formulario de login configurado');
  } else {
    console.error('❌ Elementos del formulario de login no encontrados');
  }
}

function configurarFormularioRegistro() {
  const registroForm = document.getElementById('registerForm');
  const usuarioInput = document.getElementById('regUsuario');
  const emailInput = document.getElementById('regEmail');
  const passwordInput = document.getElementById('regPassword');
  const confirmPasswordInput = document.getElementById('regConfirmPassword');

  if (registroForm && usuarioInput && emailInput && passwordInput && confirmPasswordInput) {
    registroForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const usuario = usuarioInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      const confirmPassword = confirmPasswordInput.value.trim();

      // Validaciones
      if (!usuario || !email || !password || !confirmPassword) {
        mostrarError('Por favor, completa todos los campos');
        return;
      }

      if (password !== confirmPassword) {
        mostrarError('Las contraseñas no coinciden');
        return;
      }

      if (password.length < 6) {
        mostrarError('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      if (!validarEmail(email)) {
        mostrarError('Por favor, ingresa un email válido');
        return;
      }

      await registrarUsuario(usuario, email, password);
    });

    console.log('✅ Formulario de registro configurado');
  } else {
    console.error('❌ Elementos del formulario de registro no encontrados');
  }
}

function configurarCambioFormulario() {
  const goRegister = document.getElementById('goRegister');
  const goLogin = document.getElementById('goLogin');
  const loginContainer = document.getElementById('loginContainer');
  const registerContainer = document.getElementById('registerContainer');

  if (goRegister && goLogin && loginContainer && registerContainer) {
    goRegister.addEventListener('click', function(e) {
      e.preventDefault();
      loginContainer.classList.add('hidden');
      registerContainer.classList.remove('hidden');
    });

    goLogin.addEventListener('click', function(e) {
      e.preventDefault();
      registerContainer.classList.add('hidden');
      loginContainer.classList.remove('hidden');
    });

    console.log('✅ Cambio de formularios configurado');
  } else {
    console.error('❌ Elementos para cambio de formulario no encontrados');
  }
}

function configurarModales() {
  // Configurar modal FAQ
  const faqLink = document.getElementById('faq-link');
  const aboutLink = document.getElementById('about-link');
  const faqModal = document.getElementById('faqModal');
  const aboutModal = document.getElementById('aboutModal');
  const closeFaq = document.querySelector('.close-faq');
  const closeAbout = document.querySelector('.close-about');

  // Modal FAQ
  if (faqLink && faqModal && closeFaq) {
    faqLink.addEventListener('click', function(e) {
      e.preventDefault();
      faqModal.classList.remove('hidden');
      console.log('✅ Modal FAQ abierto');
    });

    closeFaq.addEventListener('click', function() {
      faqModal.classList.add('hidden');
      console.log('✅ Modal FAQ cerrado');
    });

    // Cerrar al hacer click fuera del contenido
    faqModal.addEventListener('click', function(e) {
      if (e.target === faqModal) {
        faqModal.classList.add('hidden');
      }
    });

    console.log('✅ Modal FAQ configurado');
  } else {
    console.error('❌ Elementos del modal FAQ no encontrados:', {
      faqLink: !!faqLink,
      faqModal: !!faqModal,
      closeFaq: !!closeFaq
    });
  }

  // Modal Sobre Nosotros
  if (aboutLink && aboutModal && closeAbout) {
    aboutLink.addEventListener('click', function(e) {
      e.preventDefault();
      aboutModal.classList.remove('hidden');
      console.log('✅ Modal About abierto');
    });

    closeAbout.addEventListener('click', function() {
      aboutModal.classList.add('hidden');
      console.log('✅ Modal About cerrado');
    });

    // Cerrar al hacer click fuera del contenido
    aboutModal.addEventListener('click', function(e) {
      if (e.target === aboutModal) {
        aboutModal.classList.add('hidden');
      }
    });

    console.log('✅ Modal About configurado');
  } else {
    console.error('❌ Elementos del modal About no encontrados:', {
      aboutLink: !!aboutLink,
      aboutModal: !!aboutModal,
      closeAbout: !!closeAbout
    });
  }

  // Cerrar con tecla Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (faqModal && !faqModal.classList.contains('hidden')) {
        faqModal.classList.add('hidden');
      }
      if (aboutModal && !aboutModal.classList.contains('hidden')) {
        aboutModal.classList.add('hidden');
      }
    }
  });
}

async function iniciarSesion(usuario, password) {
  try {
    mostrarCargando(true);
    
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usuario, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Guardar token y datos del usuario
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuarioActivo', JSON.stringify(data.usuario));
      
      mostrarExito('¡Inicio de sesión exitoso!');
      
      // Redirigir después de un breve delay
      setTimeout(() => {
        window.location.href = 'principal.html';
      }, 1000);
      
    } else {
      mostrarError(data.error || 'Error al iniciar sesión');
    }
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError('Error de conexión. Verifica que el servidor esté funcionando.');
  } finally {
    mostrarCargando(false);
  }
}

async function registrarUsuario(usuario, email, password) {
  try {
    mostrarCargando(true);
    
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usuario, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      mostrarExito('¡Registro exitoso! Ahora puedes iniciar sesión.');
      
      // Cambiar al formulario de login
      const loginContainer = document.getElementById('loginContainer');
      const registerContainer = document.getElementById('registerContainer');
      
      if (loginContainer && registerContainer) {
        registerContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        
        // Llenar automáticamente el usuario en el login
        const loginUsuario = document.getElementById('loginUsuario');
        if (loginUsuario) {
          loginUsuario.value = usuario;
        }
      }
      
    } else {
      mostrarError(data.error || 'Error al registrar usuario');
    }
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError('Error de conexión. Verifica que el servidor esté funcionando.');
  } finally {
    mostrarCargando(false);
  }
}

function validarEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function mostrarError(mensaje) {
  // Limpiar mensajes existentes
  limpiarMensajes();
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'mensaje-error';
  errorDiv.textContent = mensaje;
  
  const mainContainer = document.querySelector('.main-container');
  if (mainContainer) {
    mainContainer.insertBefore(errorDiv, mainContainer.firstChild);
  }
  
  // Auto-eliminar después de 5 segundos
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

function mostrarExito(mensaje) {
  // Limpiar mensajes existentes
  limpiarMensajes();
  
  const exitoDiv = document.createElement('div');
  exitoDiv.className = 'mensaje-exito';
  exitoDiv.textContent = mensaje;
  
  const mainContainer = document.querySelector('.main-container');
  if (mainContainer) {
    mainContainer.insertBefore(exitoDiv, mainContainer.firstChild);
  }
  
  // Auto-eliminar después de 3 segundos
  setTimeout(() => {
    exitoDiv.remove();
  }, 3000);
}

function mostrarCargando(mostrar) {
  let cargandoDiv = document.getElementById('cargando');
  
  if (mostrar) {
    if (!cargandoDiv) {
      cargandoDiv = document.createElement('div');
      cargandoDiv.id = 'cargando';
      cargandoDiv.className = 'cargando';
      cargandoDiv.innerHTML = 'Cargando...';
      document.body.appendChild(cargandoDiv);
    }
    cargandoDiv.style.display = 'flex';
  } else {
    if (cargandoDiv) {
      cargandoDiv.style.display = 'none';
    }
  }
}

function limpiarMensajes() {
  const mensajes = document.querySelectorAll('.mensaje-error, .mensaje-exito');
  mensajes.forEach(mensaje => mensaje.remove());
}

// Estilos para mensajes
const estilos = `
  .mensaje-error {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 15px;
    text-align: center;
  }
  
  .mensaje-exito {
    background: #efe;
    border: 1px solid #cfc;
    color: #363;
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 15px;
    text-align: center;
  }
  
  .cargando {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    color: white;
    display: none;
    justify-content: center;
    align-items: center;
    font-size: 18px;
    z-index: 1000;
  }
  
  .hidden {
    display: none !important;
  }
`;

// Injectar estilos
const styleSheet = document.createElement('style');
styleSheet.textContent = estilos;
document.head.appendChild(styleSheet);
