class AuthManager {
    constructor() {
        this.API_URL = this.getApiUrl();
    }

    getApiUrl() {
        const { hostname, protocol } = window.location;
        
        if (hostname.includes('ngrok.io') || 
            hostname.includes('ngrok-free.app') ||
            hostname.includes('ngrok-free.dev')) {
            return `${protocol}//${hostname}/api`;
        }
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://localhost:3001/api`;
        }
        
        if (hostname === '192.168.100.6') {
            return `http://192.168.100.6:3001/api`;
        }
        
        return `${protocol}//${hostname}/api`;
    }

    async verifyAuth() {
        // Si estamos en la página de sesión, no verificar autenticación
        if (window.location.pathname.includes('sesion.html')) {
            console.log('🔐 Página de sesión - omitiendo verificación');
            return true;
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

    redirectToLogin() {
        // Solo redirigir si no estamos ya en la página de login
        if (!window.location.pathname.includes('sesion.html')) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuarioActivo');
            window.location.href = 'sesion.html';
        }
    }

    getCurrentUser() {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload;
        } catch (error) {
            return null;
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('usuarioActivo');
        window.location.href = 'sesion.html?logout=true';
    }
}

// Inicializar
const authManager = new AuthManager();
window.authManager = authManager;

// Debug inicial
console.log('🔄 AuthManager inicializado');
console.log('📍 Página actual:', window.location.pathname);
console.log('🔑 Token en localStorage:', localStorage.getItem('token') ? 'Presente' : 'Ausente');
