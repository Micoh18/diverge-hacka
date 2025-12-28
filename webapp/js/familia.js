// Lógica para la interfaz de familia
const FamiliaApp = {
    init: function() {
        this.setupEventListeners();
    },
    
    setupEventListeners: function() {
        const consultForm = document.getElementById('consult-form');
        if (consultForm) {
            consultForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleConsult();
            });
        }
        
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
    },
    
    handleConsult: async function() {
        const beneficiarioNombre = document.getElementById('beneficiario-nombre').value.trim();
        const beneficiarioPin = document.getElementById('beneficiario-pin').value.trim();
        const mesSelector = document.getElementById('mes-selector');
        const anioSelector = document.getElementById('anio-selector');
        
        const mes = mesSelector ? parseInt(mesSelector.value) : null;
        const anio = anioSelector ? parseInt(anioSelector.value) : null;
        
        // Validaciones
        if (!beneficiarioNombre) {
            this.showMessage('Por favor ingresa el nombre del beneficiario', 'error');
            return;
        }
        
        if (!beneficiarioPin) {
            this.showMessage('Por favor ingresa el PIN del beneficiario', 'error');
            return;
        }
        
        if (!mes || mes < 1 || mes > 12) {
            this.showMessage('Por favor selecciona un mes válido', 'error');
            return;
        }
        
        if (!anio || anio < 2000 || anio > 2100) {
            this.showMessage('Por favor selecciona un año válido', 'error');
            return;
        }
        
        try {
            // Mostrar loading
            const submitBtn = document.querySelector('#consult-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading"></span> Consultando...';
            }
            
            // Obtener conteo mensual vía backend
            const result = await TherapyContract.getMonthlyCount(
                beneficiarioNombre,
                beneficiarioPin,
                mes,
                anio
            );
            
            // Renderizar resultado
            this.renderResult(result.count, mes, anio);
            
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
    
    renderResult: function(count, mes, anio) {
        const resultsContainer = document.getElementById('results-container');
        const emptyState = document.getElementById('empty-state');
        
        if (count === 0) {
            resultsContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        resultsContainer.style.display = 'block';
        emptyState.style.display = 'none';
        
        // Actualizar valores
        document.getElementById('total-sesiones').textContent = count;
        
        // Actualizar información del mes
        const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const nombreMes = meses[mes] || 'Mes';
        document.getElementById('mes-info').textContent = `${nombreMes} ${anio}`;
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
        FamiliaApp.init();
    });
} else {
    FamiliaApp.init();
}
