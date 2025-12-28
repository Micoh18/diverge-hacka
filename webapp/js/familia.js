// Lógica para la interfaz de familia
const FamiliaApp = {
    init: function() {
        this.setupEventListeners();
        this.initTherapyContract();
    },
    
    setupEventListeners: function() {
        const consultForm = document.getElementById('consult-form');
        if (consultForm) {
            consultForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleConsult();
            });
        }
        
        // Establecer mes actual por defecto
        const now = new Date();
        const mesSelector = document.getElementById('mes-selector');
        if (mesSelector) {
            mesSelector.value = (now.getMonth() + 1).toString();
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
    
    handleConsult: async function() {
        const beneficiarioNombre = document.getElementById('beneficiario-nombre').value.trim();
        const mesSelector = document.getElementById('mes-selector');
        const mesSeleccionado = mesSelector ? parseInt(mesSelector.value) : null;
        
        if (!beneficiarioNombre) {
            this.showMessage('Por favor ingresa el nombre del beneficiario', 'error');
            return;
        }
        
        try {
            // Mostrar loading
            const submitBtn = document.querySelector('#consult-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading"></span> Consultando...';
            }
            
            // Obtener sesiones
            const sesiones = await TherapyContract.obtenerSesionesBeneficiario(beneficiarioNombre);
            
            // Filtrar por mes si se seleccionó uno
            let sesionesFiltradas = sesiones;
            if (mesSeleccionado) {
                const anioActual = new Date().getFullYear();
                sesionesFiltradas = sesiones.filter(sesion => {
                    const fecha = new Date(Number(sesion.fecha) * 1000);
                    return fecha.getMonth() + 1 === mesSeleccionado && fecha.getFullYear() === anioActual;
                });
            }
            
            // Ordenar por fecha (más reciente primero)
            sesionesFiltradas.sort((a, b) => {
                const fechaA = Number(a.fecha || 0);
                const fechaB = Number(b.fecha || 0);
                return fechaB - fechaA;
            });
            
            // Renderizar resultados
            this.renderSessions(sesionesFiltradas, mesSeleccionado);
            
        } catch (error) {
            console.error('Error consultando sesiones:', error);
            this.showMessage('Error consultando sesiones: ' + error.message, 'error');
            document.getElementById('results-container').style.display = 'none';
            document.getElementById('empty-state').style.display = 'block';
        } finally {
            const submitBtn = document.querySelector('#consult-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '🔍 Consultar Sesiones';
            }
        }
    },
    
    renderSessions: function(sesiones, mesSeleccionado) {
        const resultsContainer = document.getElementById('results-container');
        const emptyState = document.getElementById('empty-state');
        const sessionsList = document.getElementById('sessions-list');
        
        if (!sesiones || sesiones.length === 0) {
            resultsContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        resultsContainer.style.display = 'block';
        emptyState.style.display = 'none';
        
        // Calcular estadísticas
        const completadas = sesiones.filter(s => s.asistencia === 'COMPLETADA' || s.asistencia === String.fromCharCode(67, 79, 77, 80, 76, 69, 84, 65, 68, 65)).length;
        const noAsistio = sesiones.filter(s => s.asistencia === 'NO_ASISTIO' || s.asistencia === String.fromCharCode(78, 79, 95, 65, 83, 73, 83, 84, 73, 79)).length;
        const canceladas = sesiones.filter(s => s.asistencia === 'CANCELADA' || s.asistencia === String.fromCharCode(67, 65, 78, 67, 69, 76, 65, 68, 65)).length;
        
        // Actualizar estadísticas
        document.getElementById('total-sesiones').textContent = sesiones.length;
        document.getElementById('completadas-count').textContent = completadas;
        document.getElementById('no-asistio-count').textContent = noAsistio;
        
        // Renderizar lista de sesiones
        sessionsList.innerHTML = sesiones.map(sesion => {
            const fecha = new Date(Number(sesion.fecha || 0) * 1000);
            const fechaFormateada = fecha.toLocaleDateString('es-CL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const horaFormateada = fecha.toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Determinar estado
            const asistencia = sesion.asistencia || '';
            let estadoClass = 'completed';
            let estadoIcon = '✓';
            let estadoTexto = 'Completada';
            
            if (asistencia.includes('NO_ASISTIO') || asistencia.includes('NO ASISTIO')) {
                estadoClass = 'no-asistio';
                estadoIcon = '✗';
                estadoTexto = 'No asistió';
            } else if (asistencia.includes('CANCELADA')) {
                estadoClass = 'cancelada';
                estadoIcon = '⊘';
                estadoTexto = 'Cancelada';
            }
            
            const tipo = sesion.tipo || 'N/A';
            const duracion = sesion.duracion_minutos || 0;
            const sessionId = sesion.id || 'N/A';
            
            return `
                <div class="session-item">
                    <div class="session-header">
                        <span class="session-id">Sesión #${sessionId}</span>
                        <span class="session-status ${estadoClass}">${estadoIcon} ${estadoTexto}</span>
                    </div>
                    <div class="session-info">
                        <div class="session-info-item">
                            <div class="session-info-label">Fecha</div>
                            <div class="session-info-value">${fechaFormateada}</div>
                        </div>
                        <div class="session-info-item">
                            <div class="session-info-label">Hora</div>
                            <div class="session-info-value">${horaFormateada}</div>
                        </div>
                        <div class="session-info-item">
                            <div class="session-info-label">Tipo</div>
                            <div class="session-info-value">${tipo}</div>
                        </div>
                        <div class="session-info-item">
                            <div class="session-info-label">Duración</div>
                            <div class="session-info-value">${duracion} min</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    showMessage: function(message, type) {
        const statusMsg = document.getElementById('statusMessage');
        if (statusMsg) {
            statusMsg.textContent = message;
            statusMsg.className = 'status-message ' + type;
            statusMsg.style.display = 'block';
            
            // Auto-ocultar después de 5 segundos
            setTimeout(() => {
                statusMsg.style.display = 'none';
            }, 5000);
        }
    }
};

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        function waitForStellarSdk() {
            if (typeof StellarSdk !== 'undefined') {
                FamiliaApp.init();
            } else {
                setTimeout(waitForStellarSdk, 100);
            }
        }
        waitForStellarSdk();
    });
} else {
    function waitForStellarSdk() {
        if (typeof StellarSdk !== 'undefined') {
            FamiliaApp.init();
        } else {
            setTimeout(waitForStellarSdk, 100);
        }
    }
    waitForStellarSdk();
}

