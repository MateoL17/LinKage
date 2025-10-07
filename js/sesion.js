const API_URL = 'http://localhost:3001/api';

// --- Esperar a que cargue el DOM ---
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const goRegister = document.getElementById("goRegister");
  const goLogin = document.getElementById("goLogin");
  const intro = document.querySelector(".intro");

  // 🔹 Animación inicial del logo
  setTimeout(() => {
    if (intro) intro.classList.add("hide");
  }, 2000);

  // 🔹 Funciones para cambiar entre formularios con animación
  function switchToRegister() {
    if (loginForm) loginForm.classList.add('slide-out');
    
    setTimeout(() => {
      if (loginForm) {
        loginForm.classList.add("hidden");
        loginForm.classList.remove('slide-out');
      }
      if (registerForm) {
        registerForm.classList.remove("hidden");
        registerForm.classList.add('slide-in');
      }
    }, 400);
  }

  function switchToLogin() {
    if (registerForm) registerForm.classList.add('slide-out');
    
    setTimeout(() => {
      if (registerForm) {
        registerForm.classList.add("hidden");
        registerForm.classList.remove('slide-out');
      }
      if (loginForm) {
        loginForm.classList.remove("hidden");
        loginForm.classList.add('slide-in');
      }
    }, 400);
  }

  // 🔹 Mostrar formulario de registro con animación
  if (goRegister) {
    goRegister.addEventListener("click", (e) => {
      e.preventDefault();
      switchToRegister();
    });
  }

  // 🔹 Volver al login con animación
  if (goLogin) {
    goLogin.addEventListener("click", (e) => {
      e.preventDefault();
      switchToLogin();
    });
  }

  // 🟢 Iniciar sesión con MongoDB
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const usuario = document.getElementById("usuario").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!usuario || !password) {
        alert("Por favor, completa todos los campos.");
        return;
      }

      // Efecto visual de carga
      const submitBtn = loginForm.querySelector('button');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '⏳ Verificando...';
      submitBtn.style.background = '#FFA500';
      submitBtn.disabled = true;

      try {
        const response = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ usuario, password })
        });

        const data = await response.json();

        if (response.ok) {
          // Efecto de éxito
          submitBtn.textContent = '✅ Bienvenido!';
          submitBtn.style.background = '#4CAF50';
          
          // Guardar token y datos del usuario
          localStorage.setItem('token', data.token);
          localStorage.setItem('usuarioActivo', JSON.stringify(data.usuario));
          
          setTimeout(() => {
            window.location.href = "principal.html";
          }, 1000);
        } else {
          // Efecto de error
          submitBtn.textContent = '❌ Error';
          submitBtn.style.background = '#f44336';
          
          setTimeout(() => {
            alert(data.error || "❌ Error en el login");
            submitBtn.textContent = originalText;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 1000);
        }
      } catch (error) {
        console.error('Error de conexión:', error);
        submitBtn.textContent = '❌ Error';
        submitBtn.style.background = '#f44336';
        
        setTimeout(() => {
          alert("❌ Error de conexión con el servidor. Verifica que el backend esté ejecutándose.");
          submitBtn.textContent = originalText;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
        }, 1000);
      }
    });
  }

  // 🟣 Registrar nuevo usuario con MongoDB
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nuevoUsuario = {
        usuario: document.getElementById("nuevoUsuario").value.trim(),
        email: document.getElementById("nuevoEmail").value.trim(),
        password: document.getElementById("nuevoPassword").value.trim()
      };

      if (!nuevoUsuario.usuario || !nuevoUsuario.email || !nuevoUsuario.password) {
        alert("Por favor, completa todos los campos.");
        return;
      }

      if (nuevoUsuario.password.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
      }

      // Efecto visual de registro
      const submitBtn = registerForm.querySelector('button');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '⏳ Registrando...';
      submitBtn.style.background = '#FFA500';
      submitBtn.disabled = true;

      try {
        const response = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(nuevoUsuario)
        });

        const data = await response.json();

        if (response.ok) {
          // Registro exitoso
          submitBtn.textContent = '✅ Registrado!';
          submitBtn.style.background = '#4CAF50';

          setTimeout(() => {
            alert("✅ " + data.mensaje);
            switchToLogin();
          }, 800);
        } else {
          // Efecto de error
          submitBtn.textContent = '❌ Error';
          submitBtn.style.background = '#f44336';
          
          setTimeout(() => {
            alert("⚠️ " + data.error);
            submitBtn.textContent = originalText;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
          }, 1000);
        }
      } catch (error) {
        console.error('Error de conexión:', error);
        submitBtn.textContent = '❌ Error';
        submitBtn.style.background = '#f44336';
        
        setTimeout(() => {
          alert("❌ Error de conexión con el servidor. Verifica que el backend esté ejecutándose.");
          submitBtn.textContent = originalText;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
        }, 1000);
      }
    });
  }

  // 🔹 Animación inicial del formulario de login
  setTimeout(() => {
    if (loginForm && !loginForm.classList.contains('hidden')) {
      loginForm.classList.add('slide-in');
    }
  }, 2200);
});

// 🔹 Funcionalidad para los modales (Sobre Nosotros y FAQ)
document.addEventListener('DOMContentLoaded', function() {
  // Elementos FAQ
  const faqLink = document.getElementById('faq-link');
  const faqModal = document.getElementById('faqModal');
  const closeFaq = document.querySelector('.close-faq');
  const questionForm = document.getElementById('questionForm');

  // Elementos Sobre Nosotros
  const aboutLink = document.querySelector('.menu a[href="#"]:nth-child(2)');
  const aboutModal = document.getElementById('aboutModal');
  const closeAbout = document.querySelector('.close-about');

  // Función para abrir modal con animación
  function openModal(modal) {
    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.classList.add('show');
      }, 10);
    }
  }

  // Función para cerrar modal con animación
  function closeModal(modal) {
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300);
    }
  }

  // Abrir modal FAQ
  if (faqLink) {
    faqLink.addEventListener('click', function(e) {
      e.preventDefault();
      openModal(faqModal);
    });
  }

  // Cerrar modal FAQ
  if (closeFaq) {
    closeFaq.addEventListener('click', function() {
      closeModal(faqModal);
    });
  }

  // Abrir modal Sobre Nosotros
  if (aboutLink) {
    aboutLink.addEventListener('click', function(e) {
      e.preventDefault();
      openModal(aboutModal);
    });
  }

  // Cerrar modal Sobre Nosotros
  if (closeAbout) {
    closeAbout.addEventListener('click', function() {
      closeModal(aboutModal);
    });
  }

  // Cerrar modales al hacer click fuera del contenido
  [faqModal, aboutModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    }
  });

  // Cerrar modales con tecla Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (faqModal && faqModal.classList.contains('show')) {
        closeModal(faqModal);
      }
      if (aboutModal && aboutModal.classList.contains('show')) {
        closeModal(aboutModal);
      }
    }
  });

  // Enviar pregunta anónima (FAQ)
  if (questionForm) {
    questionForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const textarea = this.querySelector('textarea');
      const question = textarea.value.trim();
      
      if (question) {
        const submitBtn = this.querySelector('button');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = '✓ Enviado';
        submitBtn.style.background = '#4CAF50';
        
        setTimeout(() => {
          console.log('Pregunta anónima enviada:', question);
          alert('¡Gracias por tu pregunta! La hemos recibido de forma anónima y nuestro equipo te responderá pronto.');
          textarea.value = '';
          submitBtn.textContent = originalText;
          submitBtn.style.background = '';
          closeModal(faqModal);
        }, 1000);
      } else {
        if (textarea) {
          textarea.style.animation = 'gentleShake 0.5s ease';
          setTimeout(() => {
            textarea.style.animation = '';
          }, 500);
        }
        alert('Por favor, escribe tu pregunta antes de enviar.');
      }
    });
  }
});