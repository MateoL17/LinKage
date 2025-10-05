// --- Simulación de base de datos local (temporal) ---
if (!localStorage.getItem("usuarios")) {
  const usuariosIniciales = [
    { usuario: "admin", email: "admin@linkage.com", password: "1234" }
  ];
  localStorage.setItem("usuarios", JSON.stringify(usuariosIniciales));
}

// --- Función para exportar los usuarios a un archivo JSON ---
function exportarUsuarios() {
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const blob = new Blob([JSON.stringify(usuarios, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "usuarios.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Esperar a que cargue el DOM ---
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const goRegister = document.getElementById("goRegister");
  const goLogin = document.getElementById("goLogin");
  const intro = document.querySelector(".intro");

  // 🔹 Animación inicial del logo
  setTimeout(() => {
    intro.classList.add("hide");
  }, 2000);

  // 🔹 Funciones para cambiar entre formularios con animación
  function switchToRegister() {
  loginForm.classList.add('slide-out');
  
  setTimeout(() => {
    loginForm.classList.add("hidden");
    loginForm.classList.remove('slide-out');
    registerForm.classList.remove("hidden");
    registerForm.classList.add('slide-in');
  }, 400);
  }

  function switchToLogin() {
  registerForm.classList.add('slide-out');
  
  setTimeout(() => {
    registerForm.classList.add("hidden");
    registerForm.classList.remove('slide-out');
    loginForm.classList.remove("hidden");
    loginForm.classList.add('slide-in');
  }, 400);
  }

  // 🔹 Animación inicial del formulario de login
  setTimeout(() => {
  if (loginForm && !loginForm.classList.contains('hidden')) {
    loginForm.classList.add('slide-in');
  }
  }, 2200);

  // 🔹 Mostrar formulario de registro con animación
  goRegister.addEventListener("click", (e) => {
    e.preventDefault();
    switchToRegister();
  });

  // 🔹 Volver al login con animación
  goLogin.addEventListener("click", (e) => {
    e.preventDefault();
    switchToLogin();
  });

  // 🟢 Iniciar sesión con efectos visuales
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value.trim();

    // Efecto visual de carga
    const submitBtn = loginForm.querySelector('button');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Verificando...';
    submitBtn.style.background = '#FFA500';

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const usuarioEncontrado = usuarios.find(
      (u) => u.usuario === usuario && u.password === password
    );

    setTimeout(() => {
      if (usuarioEncontrado) {
        // Efecto de éxito
        submitBtn.textContent = '✅ Bienvenido!';
        submitBtn.style.background = '#4CAF50';
        
        setTimeout(() => {
          alert(`✅ Bienvenido ${usuarioEncontrado.usuario} 👋`);
          localStorage.setItem("usuarioActivo", usuarioEncontrado.usuario);
          window.location.href = "principal.html";
        }, 800);
      } else {
        // Efecto de error
        submitBtn.textContent = '❌ Error';
        submitBtn.style.background = '#f44336';
        
        setTimeout(() => {
          alert("❌ Usuario o contraseña incorrectos.");
          submitBtn.textContent = originalText;
          submitBtn.style.background = '';
        }, 1000);
      }
    }, 1000);
  });

  // 🟣 Registrar nuevo usuario con efectos visuales
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const nuevoUsuario = {
      usuario: document.getElementById("nuevoUsuario").value.trim(),
      email: document.getElementById("nuevoEmail").value.trim(),
      password: document.getElementById("nuevoPassword").value.trim(),
      foto: "img/perfil_default.png"
    };

    if (!nuevoUsuario.usuario || !nuevoUsuario.email || !nuevoUsuario.password) {
      // Animación de error en campos vacíos
      const inputs = registerForm.querySelectorAll('input');
      inputs.forEach(input => {
        if (!input.value.trim()) {
          input.style.animation = 'gentleShake 0.5s ease';
          setTimeout(() => {
            input.style.animation = '';
          }, 500);
        }
      });
      alert("Por favor, completa todos los campos.");
      return;
    }

    // Efecto visual de registro
    const submitBtn = registerForm.querySelector('button');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Registrando...';
    submitBtn.style.background = '#FFA500';

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const existe = usuarios.some(
      (u) => u.usuario === nuevoUsuario.usuario || u.email === nuevoUsuario.email
    );

    setTimeout(() => {
      if (existe) {
        // Efecto de usuario existente
        submitBtn.textContent = '❌ Usuario existe';
        submitBtn.style.background = '#f44336';
        
        setTimeout(() => {
          alert("⚠️ Este usuario o correo ya está registrado.");
          submitBtn.textContent = originalText;
          submitBtn.style.background = '';
        }, 1000);
        return;
      }

      // Registro exitoso
      usuarios.push(nuevoUsuario);
      localStorage.setItem("usuarios", JSON.stringify(usuarios));

      submitBtn.textContent = '✅ Registrado!';
      submitBtn.style.background = '#4CAF50';

      setTimeout(() => {
        alert("✅ Registro exitoso. Se descargará una copia del registro en JSON.");
        exportarUsuarios();
        
        // Volver al login automáticamente con animación
        switchToLogin();
        
        // Restaurar botón después de un tiempo
        setTimeout(() => {
          submitBtn.textContent = originalText;
          submitBtn.style.background = '';
        }, 2000);
      }, 800);
    }, 1500);
  });

  // 🔹 Animación inicial del formulario de login
  setTimeout(() => {
    if (loginForm && !loginForm.classList.contains('hidden')) {
      loginForm.classList.add('slide-in');
      setTimeout(() => {
        loginForm.classList.remove('slide-in');
      }, 500);
    }
  }, 2200);

  // Función exportarUsuarios (si no la tienes)
  function exportarUsuarios() {
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const dataStr = JSON.stringify(usuarios, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Crear enlace de descarga
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'usuarios_linkage.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
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
    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }

  // Función para cerrar modal con animación
  function closeModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
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
        textarea.style.animation = 'gentleShake 0.5s ease';
        setTimeout(() => {
          textarea.style.animation = '';
        }, 500);
        alert('Por favor, escribe tu pregunta antes de enviar.');
      }
    });
  }
});

// Funcionalidad para el FAQ Modal
document.addEventListener('DOMContentLoaded', function() {
  const faqLink = document.getElementById('faq-link');
  const faqModal = document.getElementById('faqModal');
  const closeFaq = document.querySelector('.close-faq');
  const questionForm = document.getElementById('questionForm');

  // Abrir modal FAQ
  if (faqLink) {
    faqLink.addEventListener('click', function(e) {
      e.preventDefault();
      faqModal.classList.remove('hidden');
      faqModal.classList.add('show');
    });
  }

  // Cerrar modal FAQ
  if (closeFaq) {
    closeFaq.addEventListener('click', function() {
      faqModal.classList.add('hidden');
      faqModal.classList.remove('show');
    });
  }

  // Cerrar modal al hacer click fuera del contenido
  if (faqModal) {
    faqModal.addEventListener('click', function(e) {
      if (e.target === faqModal) {
        faqModal.classList.add('hidden');
        faqModal.classList.remove('show');
      }
    });
  }

  // Enviar pregunta anónima
  if (questionForm) {
    questionForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const textarea = this.querySelector('textarea');
      const question = textarea.value.trim();
      
      if (question) {
        // Aquí puedes enviar la pregunta a tu backend
        console.log('Pregunta anónima enviada:', question);
        alert('¡Gracias por tu pregunta! La hemos recibido de forma anónima y nuestro equipo te responderá pronto.');
        textarea.value = '';
        
        // Cerrar modal después de enviar
        faqModal.classList.add('hidden');
        faqModal.classList.remove('show');
      } else {
        alert('Por favor, escribe tu pregunta antes de enviar.');
      }
    });
  }
});

// Funcionalidad para el Modal Sobre Nosotros
document.addEventListener('DOMContentLoaded', function() {
  const aboutLink = document.querySelector('.menu a[href="#"]:nth-child(2)'); // Segundo enlace del menú
  const aboutModal = document.getElementById('aboutModal');
  const closeAbout = document.querySelector('.close-about');

  // Abrir modal Sobre Nosotros
  if (aboutLink) {
    aboutLink.addEventListener('click', function(e) {
      e.preventDefault();
      aboutModal.classList.remove('hidden');
      aboutModal.classList.add('show');
    });
  }

  // Cerrar modal Sobre Nosotros
  if (closeAbout) {
    closeAbout.addEventListener('click', function() {
      aboutModal.classList.add('hidden');
      aboutModal.classList.remove('show');
    });
  }

  // Cerrar modal al hacer click fuera del contenido
  if (aboutModal) {
    aboutModal.addEventListener('click', function(e) {
      if (e.target === aboutModal) {
        aboutModal.classList.add('hidden');
        aboutModal.classList.remove('show');
      }
    });
  }

  // Cerrar modales con tecla Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (aboutModal && aboutModal.classList.contains('show')) {
        aboutModal.classList.add('hidden');
        aboutModal.classList.remove('show');
      }
      if (faqModal && faqModal.classList.contains('show')) {
        faqModal.classList.add('hidden');
        faqModal.classList.remove('show');
      }
    }
  });
});

// Funcionalidad mejorada para modales con animaciones
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
    modal.classList.remove('hidden');
    // Pequeño delay para asegurar que se aplican los estilos
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }

  // Función para cerrar modal con animación
  function closeModal(modal) {
    modal.classList.remove('show');
    // Esperar a que termine la animación antes de ocultar
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
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
        // Animación de éxito antes de cerrar
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
        // Animación de error
        textarea.style.animation = 'gentleShake 0.5s ease';
        setTimeout(() => {
          textarea.style.animation = '';
        }, 500);
        alert('Por favor, escribe tu pregunta antes de enviar.');
      }
    });
  }

  // Efecto hover mejorado para items del tech stack
  const techItems = document.querySelectorAll('.tech-item');
  techItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-8px) scale(1.05)';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
});

// Navegación para Términos y Condiciones
document.addEventListener('DOMContentLoaded', function() {
  // Si estamos en la página de términos, marcar el enlace activo
  const currentPage = window.location.pathname;
  if (currentPage.includes('terms.html') || currentPage.includes('terminos')) {
    const termsLink = document.querySelector('.menu a[href*="terminos"], .menu a[href*="terms"]');
    if (termsLink) {
      // Remover active de otros enlaces
      document.querySelectorAll('.menu a').forEach(link => {
        link.classList.remove('active');
      });
      // Agregar active al enlace actual
      termsLink.classList.add('active');
    }
  }
});

// Manejar enlaces
document.addEventListener('DOMContentLoaded', function() {
  // Prevenir comportamiento por defecto solo para enlaces que son modales
  const modalLinks = document.querySelectorAll('a[href="#"]');
  modalLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      // Aquí tu lógica para abrir modales
    });
  });
});
