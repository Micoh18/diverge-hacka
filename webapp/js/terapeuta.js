// Lógica para la interfaz de terapeuta
const TerapeutaApp = {
    connectedAddress: null,
    isLoggedIn: false,
    
    init: function() {
        this.checkLogin();
        this.setupEventListeners();
        this.initTherapyContract();
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
        
        // Connect Freighter button
        const connectBtn = document.getElementById('connectFreighter');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.connectFreighter();
            });
        }
        
        // Auto-connect Freighter when form is shown
        if (this.isLoggedIn) {
            setTimeout(() => {
                this.connectFreighter();
            }, 500);
        }
    },
    
    initTherapyContract: function() {
        // Esperar a que Stellar SDK esté cargado
        if (typeof StellarSdk !== 'undefined') {
            TherapyContract.init();
        } else {
            window.addEventListener('load', () => {
                if (typeof StellarSdk !== 'undefined') {
                    TherapyContract.init();
                }
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
        
        // Intentar conectar Freighter automáticamente
        setTimeout(() => {
            this.connectFreighter();
        }, 500);
    },
    
    connectFreighter: async function() {
        try {
            const freighter = window.freighter || window.freighterApi;
            if (!freighter) {
                this.showMessage('Freighter no está instalado. Por favor instálalo desde https://freighter.app', 'error');
                return;
            }
            
            // Verificar si está conectado
            const isConnected = await freighter.isConnected();
            if (!isConnected) {
                // Solicitar acceso
                const access = await freighter.requestAccess();
                if (access.error) {
                    throw new Error(access.error.message || 'Acceso rechazado');
                }
                this.connectedAddress = access.address;
            } else {
                // Ya está conectado, obtener dirección
                const address = await freighter.getAddress();
                this.connectedAddress = address;
            }
            
            // Verificar red
            const networkDetails = await freighter.getNetworkDetails();
            const expectedNetwork = TherapyConfig.getNetworkPassphraseString();
            if (networkDetails.networkPassphrase !== expectedNetwork) {
                this.showMessage(
                    `La red en Freighter (${networkDetails.network}) no coincide con la configurada. Por favor cambia la red en Freighter.`,
                    'error'
                );
                return;
            }
            
            // Mostrar información de wallet
            document.getElementById('wallet-info').style.display = 'block';
            document.getElementById('wallet-address').textContent = this.connectedAddress;
            document.getElementById('submit-session').disabled = false;
            document.getElementById('connectFreighter').textContent = '✓ Freighter Conectado';
            document.getElementById('connectFreighter').classList.add('btn-success');
            
        } catch (error) {
            console.error('Error conectando Freighter:', error);
            this.showMessage('Error conectando Freighter: ' + error.message, 'error');
        }
    },
    
    handleRegisterSession: async function() {
        if (!this.connectedAddress) {
            this.showMessage('Por favor conecta Freighter primero', 'error');
            return;
        }
        
        const beneficiarioNombre = document.getElementById('beneficiario-nombre').value.trim();
        const tipo = document.getElementById('tipo-terapia').value;
        const duracion = parseInt(document.getElementById('duracion').value);
        const asistencia = document.querySelector('input[name="asistencia"]:checked').value;
        const notas = document.getElementById('notas').value.trim() || '';
        
        // Validaciones
        if (!beneficiarioNombre) {
            this.showMessage('Por favor ingresa el nombre del beneficiario', 'error');
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
            
            // Registrar sesión
            const sessionId = await TherapyContract.registrarSesion(
                this.connectedAddress,
                beneficiarioNombre,
                tipo,
                duracion,
                asistencia,
                notas
            );
            
            this.showMessage(
                `✅ Sesión #${sessionId || 'N/A'} registrada exitosamente! Timestamp: ${new Date().toLocaleString('es-CL')}`,
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
        // Esperar a que Stellar SDK esté cargado
        function waitForStellarSdk() {
            if (typeof StellarSdk !== 'undefined') {
                TerapeutaApp.init();
            } else {
                setTimeout(waitForStellarSdk, 100);
            }
        }
        waitForStellarSdk();
    });
} else {
    function waitForStellarSdk() {
        if (typeof StellarSdk !== 'undefined') {
            TerapeutaApp.init();
        } else {
            setTimeout(waitForStellarSdk, 100);
        }
    }
    waitForStellarSdk();
}

