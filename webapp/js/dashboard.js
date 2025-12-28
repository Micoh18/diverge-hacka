// Lógica para el dashboard del centro
const DashboardApp = {
    init: function() {
        this.setupEventListeners();
        this.initTherapyContract();
        
        // Establecer mes y año actual por defecto
        const now = new Date();
        const mesSelector = document.getElementById('mes-selector');
        const anioSelector = document.getElementById('anio-selector');
        
        if (mesSelector) {
            mesSelector.value = (now.getMonth() + 1).toString();
        }
        if (anioSelector) {
            anioSelector.value = now.getFullYear().toString();
        }
        
        // Cargar estadísticas automáticamente
        setTimeout(() => {
            this.loadStats();
        }, 500);
    },
    
    setupEventListeners: function() {
        const loadBtn = document.getElementById('load-stats');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                this.loadStats();
            });
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
    
    loadStats: async function() {
        const mesSelector = document.getElementById('mes-selector');
        const anioSelector = document.getElementById('anio-selector');
        
        const mes = mesSelector ? parseInt(mesSelector.value) : new Date().getMonth() + 1;
        const anio = anioSelector ? parseInt(anioSelector.value) : new Date().getFullYear();
        
        try {
            const loadBtn = document.getElementById('load-stats');
            if (loadBtn) {
                loadBtn.disabled = true;
                loadBtn.innerHTML = '<span class="loading"></span> Cargando...';
            }
            
            // Obtener estadísticas
            const stats = await TherapyContract.estadisticasMes(mes, anio);
            
            // stats es un array: [completadas, no_asistio, canceladas]
            const completadas = Array.isArray(stats) ? (stats[0] || 0) : 0;
            const noAsistio = Array.isArray(stats) ? (stats[1] || 0) : 0;
            const canceladas = Array.isArray(stats) ? (stats[2] || 0) : 0;
            const total = completadas + noAsistio + canceladas;
            
            // Calcular tasa de asistencia
            const tasaAsistencia = total > 0 ? Math.round((completadas / total) * 100) : 0;
            
            // Renderizar estadísticas
            this.renderStats(completadas, noAsistio, canceladas, total, tasaAsistencia);
            
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            this.showMessage('Error cargando estadísticas: ' + error.message, 'error');
            document.getElementById('stats-container').style.display = 'none';
            document.getElementById('empty-state').style.display = 'block';
        } finally {
            const loadBtn = document.getElementById('load-stats');
            if (loadBtn) {
                loadBtn.disabled = false;
                loadBtn.textContent = '📊 Cargar Estadísticas';
            }
        }
    },
    
    renderStats: function(completadas, noAsistio, canceladas, total, tasaAsistencia) {
        const statsContainer = document.getElementById('stats-container');
        const emptyState = document.getElementById('empty-state');
        
        if (total === 0) {
            statsContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        statsContainer.style.display = 'block';
        emptyState.style.display = 'none';
        
        // Actualizar valores
        document.getElementById('stat-completadas').textContent = completadas;
        document.getElementById('stat-no-asistio').textContent = noAsistio;
        document.getElementById('stat-canceladas').textContent = canceladas;
        document.getElementById('stat-total').textContent = total;
        document.getElementById('tasa-asistencia').textContent = tasaAsistencia + '%';
        
        // Cambiar color de tasa según porcentaje
        const tasaElement = document.getElementById('tasa-asistencia');
        if (tasaAsistencia >= 90) {
            tasaElement.style.color = 'var(--color-success)';
        } else if (tasaAsistencia >= 70) {
            tasaElement.style.color = 'var(--color-warning)';
        } else {
            tasaElement.style.color = 'var(--color-error)';
        }
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
                DashboardApp.init();
            } else {
                setTimeout(waitForStellarSdk, 100);
            }
        }
        waitForStellarSdk();
    });
} else {
    function waitForStellarSdk() {
        if (typeof StellarSdk !== 'undefined') {
            DashboardApp.init();
        } else {
            setTimeout(waitForStellarSdk, 100);
        }
    }
    waitForStellarSdk();
}

