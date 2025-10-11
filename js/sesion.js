// ================= CONFIGURACIÓN =================
class SessionManager {
    constructor() {
        this.API_URL = this.getApiUrl();
        this.init();
    }

    // ✅ Detección optimizada de API URL
    getApiUrl() {
        const { hostname, protocol } = window.location;
        const configs = {
            'localhost': `http://localhost:3001/api`,
            '127.0.0.1': `http://127.0.0.1:3001/api`,
            '192.168.100.6': `http://192.168.100.6:3001/api`
        };

        // Dominios externos (ngrok, localhost.run, etc.)
        if (hostname.includes('ngrok.io') || hostname.includes('localhost.run')) {
            return `${protocol}//${hostname}/api`;
        }

        return configs[hostname] || `${protocol}//${hostname}:3001/api`;
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            if (this.isLoggedIn()) return;
            
            this.setupApplication();
            this.injectGlobalStyles();
            this.initializeFormAnimations();
        });
    }

    isLoggedIn() {
        const token = localStorage.getItem('token');
        if (token) {
            window.location.href = 'principal.html';
            return true;
        }
        return false;
    }

    setupApplication() {
        this.setupForms();
        
        console.log('✅ Módulos cargados:', {
            login: '✓', 
            registro: '✓', 
            cambioFormulario: '✓',
            animaciones: '✓'
        });
    }

    setupForms() {
        this.setupLoginForm();
        this.setupRegisterForm();
        this.setupFormToggle();
    }

    setupLoginForm() {
        const form = document.getElementById('loginForm');
        const usuario = document.getElementById('loginUsuario');
        const password = document.getElementById('loginPassword');

        if (!form || !usuario || !password) {
            console.error('❌ Elementos del formulario de login no encontrados');
            return;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = usuario.value.trim();
            const pass = password.value.trim();

            if (!user || !pass) {
                this.mostrarError('Por favor, completa todos los campos');
                return;
            }

            await this.iniciarSesion(user, pass);
        });

        console.log('✅ Formulario de login configurado');
    }

    setupRegisterForm() {
        const form = document.getElementById('registerForm');
        const elements = ['regUsuario', 'regEmail', 'regPassword', 'regConfirmPassword']
            .map(id => document.getElementById(id));

        if (!form || elements.some(el => !el)) {
            console.error('❌ Elementos del formulario de registro no encontrados');
            return;
        }

        const [usuario, email, password, confirmPassword] = elements;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userData = {
                usuario: usuario.value.trim(),
                email: email.value.trim(),
                password: password.value.trim(),
                confirmPassword: confirmPassword.value.trim()
            };

            const validation = this.validarRegistro(userData);
            if (!validation.isValid) {
                this.mostrarError(validation.message);
                return;
            }

            await this.registrarUsuario(userData.usuario, userData.email, userData.password);
        });

        console.log('✅ Formulario de registro configurado');
    }

    validarRegistro({ usuario, email, password, confirmPassword }) {
        if (!usuario || !email || !password || !confirmPassword) {
            return { isValid: false, message: 'Por favor, completa todos los campos' };
        }

        if (password !== confirmPassword) {
            return { isValid: false, message: 'Las contraseñas no coinciden' };
        }

        if (password.length < 6) {
            return { isValid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
        }

        if (!this.validarEmail(email)) {
            return { isValid: false, message: 'Por favor, ingresa un email válido' };
        }

        return { isValid: true };
    }

    setupFormToggle() {
        const elements = {
            goRegister: document.getElementById('goRegister'),
            goLogin: document.getElementById('goLogin'),
            loginContainer: document.getElementById('loginContainer'),
            registerContainer: document.getElementById('registerContainer'),
            loginForm: document.getElementById('loginForm'),
            registerForm: document.getElementById('registerForm')
        };

        if (Object.values(elements).some(el => !el)) {
            console.error('❌ Elementos para cambio de formulario no encontrados');
            return;
        }

        const { goRegister, goLogin, loginContainer, registerContainer, loginForm, registerForm } = elements;

        goRegister.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchToRegister();
        });

        goLogin.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchToLogin();
        });

        console.log('✅ Cambio de formularios configurado');
    }

    // ================= ANIMACIONES =================
    initializeFormAnimations() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm && registerForm) {
            loginForm.classList.add('form-visible');
            registerForm.classList.add('form-hidden');
        }
    }

    switchToRegister() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const loginContainer = document.getElementById('loginContainer');
        const registerContainer = document.getElementById('registerContainer');

        if (!loginForm || !registerForm || !loginContainer || !registerContainer) return;

        // Animación de salida del login
        loginForm.classList.remove('form-visible');
        loginForm.classList.add('form-slide-out-left');
        
        setTimeout(() => {
            loginContainer.classList.add('hidden');
            registerContainer.classList.remove('hidden');
            
            // Animación de entrada del registro
            registerForm.classList.remove('form-hidden');
            registerForm.classList.add('form-slide-in-right');
            registerForm.classList.add('form-visible');
            
            // Limpiar clases de animación después de completar
            setTimeout(() => {
                loginForm.classList.remove('form-slide-out-left');
                registerForm.classList.remove('form-slide-in-right');
            }, 500);
        }, 250);
    }

    switchToLogin() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const loginContainer = document.getElementById('loginContainer');
        const registerContainer = document.getElementById('registerContainer');

        if (!loginForm || !registerForm || !loginContainer || !registerContainer) return;

        // Animación de salida del registro
        registerForm.classList.remove('form-visible');
        registerForm.classList.add('form-slide-out-right');
        
        setTimeout(() => {
            registerContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
            
            // Animación de entrada del login
            loginForm.classList.remove('form-hidden');
            loginForm.classList.add('form-slide-in-left');
            loginForm.classList.add('form-visible');
            
            // Limpiar clases de animación después de completar
            setTimeout(() => {
                registerForm.classList.remove('form-slide-out-right');
                loginForm.classList.remove('form-slide-in-left');
            }, 500);
        }, 250);
    }

    // ================= API CALLS =================
    async iniciarSesion(usuario, password) {
        let botonRestaurado = false;
        
        try {
            this.mostrarCargando(true, 'loginBtn');
            
            const response = await fetch(`${this.API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password })
            });

            // Verificar si la respuesta es JSON válido
            const text = await response.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error('Error parsing JSON:', e);
                data = { error: 'Respuesta inválida del servidor' };
            }

            if (response.ok) {
                this.handleLoginSuccess(data);
            } else {
                this.mostrarError(data.error || `Error ${response.status}: ${response.statusText}`);
                // Restaurar botón inmediatamente en caso de error
                this.mostrarCargando(false, 'loginBtn');
                botonRestaurado = true;
            }
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarError('Error de conexión. Verifica que el servidor esté funcionando.');
            // Restaurar botón inmediatamente en caso de error
            if (!botonRestaurado) {
                this.mostrarCargando(false, 'loginBtn');
            }
        } finally {
            // Asegurarse de que el botón se restaure incluso si hay errores no capturados
            if (!botonRestaurado) {
                setTimeout(() => {
                    this.mostrarCargando(false, 'loginBtn');
                }, 1000);
            }
        }
    }

    handleLoginSuccess(data) {
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuarioActivo', JSON.stringify(data.usuario));
            
            this.mostrarExito('¡Inicio de sesión exitoso!');
            
            setTimeout(() => {
                window.location.href = 'principal.html';
            }, 1000);
        } else {
            this.mostrarError('Token no recibido del servidor');
            this.mostrarCargando(false, 'loginBtn');
        }
    }

    async registrarUsuario(usuario, email, password) {
        let botonRestaurado = false;
        
        try {
            this.mostrarCargando(true, 'registroBtn');
            
            console.log('📤 Enviando registro:', { usuario, email });
            
            const response = await fetch(`${this.API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, email, password })
            });

            console.log('📥 Respuesta del servidor:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            // Manejar respuesta de texto primero
            const responseText = await response.text();
            console.log('📄 Contenido de la respuesta:', responseText);

            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
                console.error('❌ Error parseando JSON:', parseError);
                // Si el usuario se creó pero hay error en la respuesta, manejarlo como éxito
                if (response.status === 500 && responseText.includes('usuario creado')) {
                    this.handleRegisterSuccess(usuario);
                    return;
                }
                data = { error: 'Respuesta inválida del servidor' };
            }

            if (response.ok) {
                this.handleRegisterSuccess(usuario);
            } else if (response.status === 500) {
                // Error 500 pero el usuario podría haberse creado
                console.warn('⚠️ Error 500 del servidor, verificando si el usuario fue creado...');
                
                // Intentar verificar si el usuario existe intentando iniciar sesión
                const verification = await this.verificarUsuarioCreado(usuario, password);
                if (verification.existe) {
                    this.handleRegisterSuccess(usuario);
                } else {
                    this.mostrarError(data.error || 'Error interno del servidor al crear usuario');
                    this.mostrarCargando(false, 'registroBtn');
                    botonRestaurado = true;
                }
            } else {
                this.mostrarError(data.error || `Error ${response.status}: ${response.statusText}`);
                this.mostrarCargando(false, 'registroBtn');
                botonRestaurado = true;
            }
            
        } catch (error) {
            console.error('❌ Error en registro:', error);
            this.mostrarError('Error de conexión. Verifica que el servidor esté funcionando.');
            if (!botonRestaurado) {
                this.mostrarCargando(false, 'registroBtn');
            }
        } finally {
            // Asegurarse de que el botón se restaure incluso si hay errores no capturados
            if (!botonRestaurado) {
                setTimeout(() => {
                    this.mostrarCargando(false, 'registroBtn');
                }, 1000);
            }
        }
    }

    // Método para verificar si el usuario fue creado a pesar del error 500
    async verificarUsuarioCreado(usuario, password) {
        try {
            console.log('🔍 Verificando si el usuario fue creado...');
            const response = await fetch(`${this.API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password })
            });

            return {
                existe: response.ok,
                status: response.status
            };
        } catch (error) {
            console.error('Error verificando usuario:', error);
            return { existe: false };
        }
    }

    handleRegisterSuccess(usuario) {
        this.mostrarExito('¡Registro exitoso! Ahora puedes iniciar sesión.');
        
        setTimeout(() => {
            this.switchToLogin();
            
            // Rellenar el campo de usuario en el formulario de login
            const loginUsuario = document.getElementById('loginUsuario');
            if (loginUsuario) {
                loginUsuario.value = usuario;
                loginUsuario.focus();
            }
        }, 1500);
    }

    // ================= UTILIDADES =================
    validarEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    mostrarError(mensaje) {
        this.mostrarMensaje(mensaje, 'mensaje-error', 5000);
    }

    mostrarExito(mensaje) {
        this.mostrarMensaje(mensaje, 'mensaje-exito', 3000);
    }

    mostrarMensaje(mensaje, tipo, duracion) {
        this.limpiarMensajes();
        
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = tipo;
        mensajeDiv.textContent = mensaje;
        
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            mainContainer.insertBefore(mensajeDiv, mainContainer.firstChild);
        }
        
        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.style.opacity = '0';
                mensajeDiv.style.transition = 'opacity 0.5s ease';
                setTimeout(() => mensajeDiv.remove(), 500);
            }
        }, duracion);
    }

    mostrarCargando(mostrar, botonId) {
        const boton = document.getElementById(botonId);
        if (!boton) return;

        // Textos por defecto para cada botón
        const textosPorDefecto = {
        'loginBtn': 'Ingresar',
        'registroBtn': 'Registrar'
        };

        if (mostrar) {
            // Guardar el texto actual como original si no existe
            if (!boton.hasAttribute('data-original-text')) {
            const textoActual = boton.textContent.trim();
            boton.setAttribute('data-original-text', textoActual || textosPorDefecto[botonId]);
            }
        
            boton.innerHTML = '<div class="loading-spinner"></div> Procesando...';
            boton.disabled = true;
            boton.classList.add('loading');
        } else {
            // Restaurar el texto original
            const originalText = boton.getAttribute('data-original-text');
            if (originalText) {
            boton.innerHTML = originalText;
            boton.removeAttribute('data-original-text');
            } else {
            // Usar texto por defecto si no hay original
            boton.innerHTML = textosPorDefecto[botonId] || 'Continuar';
            }
        
            boton.disabled = false;
            boton.classList.remove('loading');
        }
    }

    limpiarMensajes() {
        document.querySelectorAll('.mensaje-error, .mensaje-exito')
            .forEach(mensaje => {
                if (mensaje.parentNode) {
                    mensaje.remove();
                }
            });
    }

    injectGlobalStyles() {
        if (document.getElementById('global-styles')) return;

        const styles = `
            .mensaje-error {
                background: rgba(220, 53, 69, 0.1);
                border: 1px solid #dc3545;
                color: #f8d7da;
                padding: 12px 35px;
                border-radius: 8px;
                margin: 15px 20px;
                text-align: center;
                font-size: 14px;
                animation: gentleShake 0.5s ease;
            }
            
            .mensaje-exito {
                background: rgba(40, 167, 69, 0.1);
                border: 1px solid #28a745;
                color: #d4edda;
                padding: 12px 35px;
                border-radius: 8px;
                margin: 15px 20px;
                text-align: center;
                font-size: 14px;
                animation: fadeIn 0.5s ease;
            }
            
            .loading-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid transparent;
                border-top: 2px solid #ffffff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                display: inline-block;
                margin-right: 8px;
            }

            /* Estilo para botón deshabilitado durante carga */
            button.loading {
                opacity: 0.8;
                cursor: not-allowed;
            }

            button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            @keyframes fadeIn {
                0% { opacity: 0; transform: translateY(-10px); }
                100% { opacity: 1; transform: translateY(0); }
            }

            .hidden {
                display: none !important;
            }

            .form-hidden {
                opacity: 0;
                pointer-events: none;
            }

            .form-visible {
                opacity: 1;
                pointer-events: all;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'global-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

// ================= INICIALIZACIÓN =================
console.log('🔗 API URL:', new SessionManager().API_URL);
console.log('📍 Hostname:', window.location.hostname);

// Hacer disponible globalmente para debugging
window.sessionManager = new SessionManager();