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
            
            // Renderizar resultado con desglose y lista de sesiones si está disponible
            this.renderResult(result.count, mes, anio, result.breakdown, result.sessions || []);
            
        } catch (error) {
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
    
    renderResult: function(count, mes, anio, breakdown, sessions) {
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
        
        if (breakdown && breakdownContainer) {
            this.renderBreakdown(breakdown, breakdownContainer);
        }
        
        // Renderizar lista de sesiones individuales si existe
        const sessionsListContainer = document.getElementById('sessions-list');
        
        if (sessions && sessions.length > 0 && sessionsListContainer) {
            this.renderSessionsList(sessions, sessionsListContainer);
        } else if (sessionsListContainer) {
            sessionsListContainer.style.display = 'none';
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
    },
    
    renderSessionsList: function(sessions, container) {
        // Mapeo de nombres de terapia más legibles
        const tipoNombres = {
            'KINESIO': 'Kinesioterapia',
            'FONO': 'Fonoaudiología',
            'PSICO': 'Psicología',
            'OCUPACIONAL': 'Terapia Ocupacional'
        };
        
        // Mapeo de estados más legibles
        const estadoNombres = {
            'COMPLETADA': 'Completada',
            'NO_ASISTIO': 'No asistió',
            'CANCELADA': 'Cancelada'
        };
        
        // Mapeo de colores por estado
        const estadoColores = {
            'COMPLETADA': '#10b981',
            'NO_ASISTIO': '#ef4444',
            'CANCELADA': '#f59e0b'
        };
        
        let html = '<div style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid #e0e0e0;">';
        html += '<h3 style="font-size: 20px; margin-bottom: 1.5rem; color: #333; text-align: center; font-weight: 600;">Sesiones Individuales</h3>';
        html += '<div style="display: flex; flex-direction: column; gap: 1rem;">';
        
        for (const session of sessions) {
            const fecha = new Date(session.created_at);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const nombreTipo = tipoNombres[session.therapy_type] || session.therapy_type;
            const nombreEstado = estadoNombres[session.status] || session.status;
            const colorEstado = estadoColores[session.status] || '#666';
            
            html += `
                <div style="padding: 1.5rem; background: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                        <div>
                            <div style="font-size: 16px; font-weight: 600; color: #333; margin-bottom: 0.25rem;">
                                ${nombreTipo}
                            </div>
                            <div style="font-size: 14px; color: #666;">
                                ${fechaFormateada}
                            </div>
                        </div>
                        <div style="padding: 0.5rem 1rem; background: ${colorEstado}15; color: ${colorEstado}; border-radius: 6px; font-size: 14px; font-weight: 500;">
                            ${nombreEstado}
                        </div>
                    </div>
                    ${session.duration_minutes ? `
                        <div style="margin-bottom: 0.75rem;">
                            <span style="font-size: 14px; color: #666;">⏱️ Duración:</span>
                            <span style="font-size: 14px; color: #333; font-weight: 500; margin-left: 0.5rem;">${session.duration_minutes} minutos</span>
                        </div>
                    ` : ''}
                    ${session.notes ? `
                        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f0f0f0;">
                            <div style="font-size: 14px; color: #666; margin-bottom: 0.5rem;">📝 Notas:</div>
                            <div style="font-size: 14px; color: #333; line-height: 1.5; background: #f9f9f9; padding: 0.75rem; border-radius: 6px;">
                                ${session.notes}
                            </div>
                        </div>
                    ` : ''}
                    ${session.transaction_hash ? `
                        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f0f0f0;">
                            <a href="https://stellar.expert/explorer/testnet/tx/${session.transaction_hash}" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               style="font-size: 12px; color: #0070f3; text-decoration: none;">
                                🔗 Ver en Blockchain →
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        html += '</div></div>';
        container.innerHTML = html;
        container.style.display = 'block';
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
