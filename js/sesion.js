// ================= CONFIGURACIÓN =================
class SessionManager {
    constructor() {
        this.API_URL = this.getApiUrl();
        this.init();
    }

    // DETECCIÓN API
    getApiUrl() {
        const { hostname, protocol } = window.location;
        
        console.log('🔍 Detección de URL - Hostname:', hostname);
        console.log('🔍 Detección de URL - Protocol:', protocol);
        
        // CASO 1: Ngrok - NO USAR PUERTO
        if (hostname.includes('ngrok.io') || 
            hostname.includes('ngrok-free.app') ||
            hostname.includes('ngrok-free.dev')) {
            
            const apiUrl = `${protocol}//${hostname}/api`;
            console.log('🌐 URL Ngrok detectada (sin puerto):', apiUrl);
            return apiUrl;
        }
        
        // CASO 2: Localhost - USAR PUERTO 3001
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            const apiUrl = `http://localhost:3001/api`;
            console.log('📍 URL Localhost detectada (con puerto):', apiUrl);
            return apiUrl;
        }
        
        // CASO 3: Red local - USAR PUERTO 3001
        if (hostname === '192.168.100.6') {
            const apiUrl = `http://192.168.100.6:3001/api`;
            console.log('📱 URL Red local detectada (con puerto):', apiUrl);
            return apiUrl;
        }
        
        // CASO POR DEFECTO: Asumir entorno de producción sin puerto
        const apiUrl = `${protocol}//${hostname}/api`;
        console.log('⚡ URL por defecto (sin puerto):', apiUrl);
        return apiUrl;
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
        // Solo verificar login en páginas de sesión
        if (window.location.pathname.includes('sesion.html')) {
            if (this.isLoggedIn()) return;
        }
        
        this.setupApplication();
        this.injectGlobalStyles();
        this.initializeFormAnimations();
        this.testConnection();
        });
    }

    // ✅ MÉTODO DE PRUEBA CORREGIDO
    async testConnection() {
        try {
            console.log('🔍 Iniciando prueba de conexión...');
            console.log('🔗 URL de API:', this.API_URL);
            
            // Usar directamente this.API_URL + '/health'
            const healthUrl = this.API_URL.replace('/api', '') + '/health';
            console.log('🩺 Probando endpoint:', healthUrl);
            
            const response = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                // Agregar timeout
                signal: AbortSignal.timeout(10000)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ ✅ ✅ CONEXIÓN EXITOSA!');
                console.log('📊 Datos del servidor:', data);
                return true;
            } else {
                console.warn('⚠️ Respuesta no exitosa. Status:', response.status);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error en prueba de conexión:', error.name, error.message);
            
            // Mostrar información específica del error
            if (error.name === 'AbortError') {
                console.log('⏰ Timeout: El servidor no respondió en 10 segundos');
            } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                console.log('🔌 Error de red: No se pudo conectar al servidor');
                console.log('💡 Verifica:');
                console.log('   1. Que ngrok esté corriendo');
                console.log('   2. Que la URL sea correcta');
                console.log('   3. Que no haya problemas de firewall/red');
            }
            
            return false;
        }
    }

    setupApplication() {
        this.setupForms();
        
        console.log('✅ Aplicación configurada con URL:', this.API_URL);
    }

    isLoggedIn() {
    // Solo ejecutar esta lógica en páginas de sesión
    if (!window.location.pathname.includes('sesion.html')) {
        return false;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true') {
        console.log('🚪 Sesión cerrada, no redirigir');
        localStorage.removeItem('token');
        localStorage.removeItem('usuarioActivo');
        return false;
    }
    
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            
            if (payload.exp && payload.exp < now) {
                console.log('❌ Token expirado en sesion.js');
                localStorage.removeItem('token');
                localStorage.removeItem('usuarioActivo');
                return false;
            }
            
            console.log('✅ Usuario autenticado, redirigiendo a principal...');
            setTimeout(() => {
                if (!window.location.pathname.includes('principal.html')) {
                    window.location.href = 'principal.html';
                }
            }, 500);
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando token:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('usuarioActivo');
            return false;
        }
    }
    return false;
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

        loginForm.classList.remove('form-visible');
        loginForm.classList.add('form-slide-out-left');
        
        setTimeout(() => {
            loginContainer.classList.add('hidden');
            registerContainer.classList.remove('hidden');
            
            registerForm.classList.remove('form-hidden');
            registerForm.classList.add('form-slide-in-right');
            registerForm.classList.add('form-visible');
            
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

        registerForm.classList.remove('form-visible');
        registerForm.classList.add('form-slide-out-right');
        
        setTimeout(() => {
            registerContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
            
            loginForm.classList.remove('form-hidden');
            loginForm.classList.add('form-slide-in-left');
            loginForm.classList.add('form-visible');
            
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
            
            const loginUrl = `${this.API_URL}/login`;
            console.log('🔐 ENVIANDO LOGIN A:', loginUrl);
            console.log('📤 Datos:', { usuario: usuario.substring(0, 3) + '***' });
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ usuario, password }),
                signal: AbortSignal.timeout(15000) // 15 segundos timeout
            });

            console.log('📥 Respuesta recibida - Status:', response.status);
            
            const text = await response.text();
            let data;
            
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error('❌ Error parseando JSON:', e);
                data = { error: 'Respuesta inválida del servidor' };
            }

            if (response.ok) {
                console.log('✅ Login exitoso');
                this.handleLoginSuccess(data);
            } else {
                const errorMsg = data.error || `Error ${response.status}`;
                console.error('❌ Error en login:', errorMsg);
                this.mostrarError(errorMsg);
                this.mostrarCargando(false, 'loginBtn');
                botonRestaurado = true;
            }
            
        } catch (error) {
            console.error('❌ Error de conexión completo:', error);
            
            let mensajeError = 'Error de conexión';
            
            if (error.name === 'AbortError') {
                mensajeError = 'El servidor no respondió a tiempo. Intenta nuevamente.';
            } else if (error.name === 'TypeError') {
                mensajeError = 'No se pudo conectar al servidor. Verifica tu conexión.';
            }
            
            this.mostrarError(mensajeError);
            
            if (!botonRestaurado) {
                this.mostrarCargando(false, 'loginBtn');
            }
        } finally {
            if (!botonRestaurado) {
                setTimeout(() => {
                    this.mostrarCargando(false, 'loginBtn');
                }, 1000);
            }
        }
    }

    handleLoginSuccess(data) {
        if (data.token) {
            localStorage.setItem('token', data.token); // ✅ deja solo el token
            this.mostrarExito('¡Inicio de sesión exitoso!');
            setTimeout(() => window.location.href = 'principal.html', 1000);
        } else {
            this.mostrarError('Token no recibido del servidor');
            this.mostrarCargando(false, 'loginBtn');
        }
    }

    async registrarUsuario(usuario, email, password) {
        let botonRestaurado = false;
        
        try {
            this.mostrarCargando(true, 'registroBtn');
            
            console.log('📤 Enviando registro a:', `${this.API_URL}/register`);
            
            const response = await fetch(`${this.API_URL}/register`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ usuario, email, password })
            });

            console.log('📥 Respuesta del servidor:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            const responseText = await response.text();
            console.log('📄 Contenido de la respuesta:', responseText);

            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
                console.error('❌ Error parseando JSON:', parseError);
                if (response.status === 500 && responseText.includes('usuario creado')) {
                    this.handleRegisterSuccess(usuario);
                    return;
                }
                data = { error: 'Respuesta inválida del servidor' };
            }

            if (response.ok) {
                this.handleRegisterSuccess(usuario);
            } else if (response.status === 500) {
                console.warn('⚠️ Error 500 del servidor, verificando si el usuario fue creado...');
                
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
            if (!botonRestaurado) {
                setTimeout(() => {
                    this.mostrarCargando(false, 'registroBtn');
                }, 1000);
            }
        }
    }

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

    async verifyAuth() {
    // Si estamos en la página de sesión, no verificar autenticación
    if (window.location.pathname.includes('sesion.html')) {
        console.log('🔐 Página de sesión - omitiendo verificación');
        return true; // ✅ Cambiado a true para evitar conflicto
    }

    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('❌ No hay token - redirigiendo a login');
        this.redirectToLogin();
        return false;
    }

    try {
        // Verificar expiración del token
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        
        if (payload.exp && payload.exp < now) {
            console.log('❌ Token expirado');
            this.redirectToLogin();
            return false;
        }

        // Verificar con el servidor
        const response = await fetch(`${this.API_URL}/usuarioActual`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Token inválido');
        }

        console.log('✅ Usuario autenticado correctamente');
        return true;

    } catch (error) {
        console.error('❌ Error verificando autenticación:', error);
        this.redirectToLogin();
        return false;
    }
}

    handleRegisterSuccess(usuario) {
        this.mostrarExito('¡Registro exitoso! Ahora puedes iniciar sesión.');
        
        setTimeout(() => {
            this.switchToLogin();
            
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

        const textosPorDefecto = {
            'loginBtn': 'Ingresar',
            'registroBtn': 'Registrar'
        };

        if (mostrar) {
            if (!boton.hasAttribute('data-original-text')) {
                const textoActual = boton.textContent.trim();
                boton.setAttribute('data-original-text', textoActual || textosPorDefecto[botonId]);
            }
        
            boton.innerHTML = '<div class="loading-spinner"></div> Procesando...';
            boton.disabled = true;
            boton.classList.add('loading');
        } else {
            const originalText = boton.getAttribute('data-original-text');
            if (originalText) {
                boton.innerHTML = originalText;
                boton.removeAttribute('data-original-text');
            } else {
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
console.log('🎯 INICIANDO SESSION MANAGER');
const sessionManager = new SessionManager();

// Debug completo
console.log('='.repeat(50));
console.log('🔧 INFORMACIÓN DE DEPURACIÓN');
console.log('='.repeat(50));
console.log('📍 Hostname:', window.location.hostname);
console.log('🌐 URL Completa:', window.location.href);
console.log('🔗 API URL Final:', sessionManager.API_URL);
console.log('🖥️  User Agent:', navigator.userAgent);
console.log('='.repeat(50));

window.sessionManager = sessionManager;
