// Lógica para la interfaz de terapeuta
const TerapeutaApp = {
    isLoggedIn: false,
    
    init: function() {
        this.checkLogin();
        this.setupEventListeners();
    },
    
    checkLogin: function() {
        // Verificar si ya está logueado
        const loggedIn = sessionStorage.getItem('terapeuta_logged_in');
        if (loggedIn === 'true') {
            this.isLoggedIn = true;
            this.showSessionForm();
        } else {
            this.showLogin();
        }
    },
    
    showLogin: function() {
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('session-form-container').style.display = 'none';
    },
    
    showSessionForm: function() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('session-form-container').style.display = 'block';
    },
    
    setupEventListeners: function() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Session form
        const sessionForm = document.getElementById('session-form');
        if (sessionForm) {
            sessionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegisterSession();
            });
        }
    },
    
    handleLogin: function() {
        // Login mock - cualquier credencial funciona
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showMessage('Por favor completa todos los campos', 'error');
            return;
        }
        
        // Guardar en sessionStorage
        sessionStorage.setItem('terapeuta_logged_in', 'true');
        sessionStorage.setItem('terapeuta_username', username);
        
        this.isLoggedIn = true;
        this.showSessionForm();
    },
    
    handleRegisterSession: async function() {
        const beneficiarioNombre = document.getElementById('beneficiario-nombre').value.trim();
        const beneficiarioPin = document.getElementById('beneficiario-pin').value.trim();
        const tipo = document.getElementById('tipo-terapia').value;
        const duracion = parseInt(document.getElementById('duracion').value);
        const asistencia = document.querySelector('input[name="asistencia"]:checked').value;
        const notas = document.getElementById('notas').value.trim() || '';
        
        // Validaciones
        if (!beneficiarioNombre) {
            this.showMessage('Por favor ingresa el nombre del beneficiario', 'error');
            return;
        }
        
        if (!beneficiarioPin) {
            this.showMessage('Por favor ingresa el PIN del beneficiario', 'error');
            return;
        }
        
        if (!tipo) {
            this.showMessage('Por favor selecciona el tipo de terapia', 'error');
            return;
        }
        
        if (!duracion || duracion < 15) {
            this.showMessage('La duración debe ser al menos 15 minutos', 'error');
            return;
        }
        
        try {
            const submitBtn = document.getElementById('submit-session');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading"></span> Registrando...';
            
            // Registrar sesión vía backend
            const result = await TherapyContract.recordSession(
                beneficiarioNombre,
                beneficiarioPin,
                tipo,
                duracion,
                asistencia,
                notas
            );
            
            this.showMessage(
                `✅ Sesión #${result.session_id || 'N/A'} registrada exitosamente! Timestamp: ${new Date().toLocaleString('es-CL')}${result.transaction_hash ? ' | Hash: ' + result.transaction_hash.substring(0, 16) + '...' : ''}`,
                'success'
            );
            
            // Limpiar formulario
            document.getElementById('session-form').reset();
            
        } catch (error) {
            console.error('Error registrando sesión:', error);
            this.showMessage('Error registrando sesión: ' + error.message, 'error');
        } finally {
            const submitBtn = document.getElementById('submit-session');
            submitBtn.disabled = false;
            submitBtn.textContent = '📝 Registrar Sesión';
        }
    },
    
    showMessage: function(message, type) {
        const statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.textContent = message;
            statusMsg.className = 'status-message ' + type;
            statusMsg.style.display = 'block';
            
            // Auto-ocultar después de 5 segundos (excepto errores)
            if (type !== 'error') {
                setTimeout(() => {
                    statusMsg.style.display = 'none';
                }, 5000);
            }
        }
    }
};

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        TerapeutaApp.init();
    });
} else {
    TerapeutaApp.init();
}
