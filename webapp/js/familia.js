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
            
            // Renderizar resultado con desglose si está disponible
            this.renderResult(result.count, mes, anio, result.breakdown);
            
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
    
    renderResult: function(count, mes, anio, breakdown) {
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
        
        // Actualizar desglose por tipo de terapia si existe
        const breakdownContainer = document.getElementById('breakdown-container');
        console.log('breakdown recibido:', breakdown);
        console.log('breakdownContainer:', breakdownContainer);
        
        if (breakdown && breakdownContainer) {
            this.renderBreakdown(breakdown, breakdownContainer);
        } else if (breakdown) {
            console.warn('breakdown existe pero no se encontró breakdown-container en el DOM');
        } else {
            console.warn('No se recibió breakdown en la respuesta');
        }
    },
    
    renderBreakdown: function(breakdown, container) {
        // Mapeo de nombres de terapia más legibles
        const tipoNombres = {
            'KINESIO': 'Kinesioterapia',
            'FONO': 'Fonoaudiología',
            'PSICO': 'Psicología',
            'OCUPACIONAL': 'Terapia Ocupacional'
        };
        
        console.log('Renderizando breakdown:', breakdown);
        
        // Verificar si hay algún tipo con sesiones
        const tieneSesiones = Object.values(breakdown).some(cantidad => cantidad > 0);
        
        if (!tieneSesiones) {
            container.style.display = 'none';
            return;
        }
        
        // Crear HTML del desglose
        let html = '<div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e0e0e0; text-align: left;">';
        html += '<h3 style="font-size: 18px; margin-bottom: 1rem; color: #333; text-align: center;">Desglose por tipo de terapia:</h3>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;">';
        
        // Ordenar por cantidad (mayor a menor) y mostrar solo los que tienen sesiones
        const tiposConSesiones = Object.entries(breakdown)
            .filter(([tipo, cantidad]) => cantidad > 0)
            .sort((a, b) => b[1] - a[1]); // Ordenar de mayor a menor
        
        for (const [tipo, cantidad] of tiposConSesiones) {
            const nombreTipo = tipoNombres[tipo] || tipo;
            html += `
                <div style="padding: 1rem; background: #f5f5f5; border-radius: 8px; text-align: center; border: 1px solid #e0e0e0;">
                    <div style="font-size: 28px; font-weight: 700; color: #0070f3; margin-bottom: 0.5rem;">
                        ${cantidad}
                    </div>
                    <div style="font-size: 14px; color: #666; font-weight: 500;">
                        ${nombreTipo}
                    </div>
                </div>
            `;
        }
        
        html += '</div></div>';
        container.innerHTML = html;
        container.style.display = 'block';
        console.log('Breakdown renderizado correctamente');
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
