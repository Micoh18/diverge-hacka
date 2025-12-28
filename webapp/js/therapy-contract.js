// Módulo de interacción con el backend API para sesiones terapéuticas
// El backend maneja las transacciones con el contrato Soroban
const TherapyContract = {
    
    // Realizar petición HTTP al backend
    apiRequest: async function(endpoint, method, data) {
        const baseUrl = TherapyConfig.backendApiUrl || 'http://localhost:3000/api';
        const url = `${baseUrl}${endpoint}`;
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `Error HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            throw error;
        }
    },
    
    // Registrar una sesión terapéutica
    // Envía datos al backend que los convierte a Bytes/Hex y llama a record_session del contrato
    recordSession: async function(beneficiarioNombre, beneficiarioPin, tipo, duracion, asistencia, notas) {
        try {
            const data = {
                beneficiario_nombre: beneficiarioNombre.trim(),
                beneficiario_pin: beneficiarioPin.trim(),
                tipo_terapia: tipo, // "KINESIO", "FONO", "PSICO", "OCUPACIONAL"
                duracion_minutos: parseInt(duracion),
                asistencia: asistencia, // "COMPLETADA", "NO_ASISTIO", "CANCELADA"
                notas: notas ? notas.trim() : ''
            };
            
            // Validar datos requeridos
            if (!data.beneficiario_nombre) {
                throw new Error('El nombre del beneficiario es requerido');
            }
            if (!data.beneficiario_pin) {
                throw new Error('El PIN del beneficiario es requerido');
            }
            if (!data.tipo_terapia) {
                throw new Error('El tipo de terapia es requerido');
            }
            if (typeof data.duracion_minutos !== 'number' || data.duracion_minutos < 0 || data.duracion_minutos > 480) {
                throw new Error('La duración debe ser un número entre 0 y 480 minutos (8 horas)');
            }
            if (!data.asistencia) {
                throw new Error('El estado de asistencia es requerido');
            }
            
            const result = await this.apiRequest('/sessions/record', 'POST', data);
            
            if (!result.success) {
                throw new Error(result.error || 'Error al registrar la sesión');
            }
            
            return {
                session_id: result.session_id,
                transaction_hash: result.transaction_hash
            };
            
        } catch (error) {
            throw error;
        }
    },
    
    // Obtener conteo mensual de sesiones de un beneficiario
    // El backend llama a get_monthly_count del contrato
    getMonthlyCount: async function(beneficiarioNombre, beneficiarioPin, mes, anio) {
        try {
            const data = {
                beneficiario_nombre: beneficiarioNombre.trim(),
                beneficiario_pin: beneficiarioPin.trim(),
                mes: parseInt(mes), // 1-12
                anio: parseInt(anio) // ej: 2025
            };
            
            // Validar datos requeridos
            if (!data.beneficiario_nombre) {
                throw new Error('El nombre del beneficiario es requerido');
            }
            if (!data.beneficiario_pin) {
                throw new Error('El PIN del beneficiario es requerido');
            }
            if (!data.mes || data.mes < 1 || data.mes > 12) {
                throw new Error('El mes debe ser un número entre 1 y 12');
            }
            if (!data.anio || data.anio < 2000 || data.anio > 2100) {
                throw new Error('El año debe ser válido');
            }
            
            const result = await this.apiRequest('/sessions/monthly-count', 'POST', data);
            
            // El backend retorna { count: number, breakdown: object, sessions: array, ... }
            return {
                count: result.count || 0,
                breakdown: result.breakdown || null,
                sessions: result.sessions || [], // Incluir sessions en el retorno
                month: result.month,
                year: result.year,
                beneficiary_name: result.beneficiary_name
            };
            
        } catch (error) {
            throw error;
        }
    },
    
    // Obtener estadísticas del mes (opcional, si el backend lo expone)
    getMonthlyStats: async function(mes, anio) {
        try {
            const data = {
                mes: parseInt(mes),
                anio: parseInt(anio)
            };
            
            if (!data.mes || data.mes < 1 || data.mes > 12) {
                throw new Error('El mes debe ser un número entre 1 y 12');
            }
            if (!data.anio || data.anio < 2000 || data.anio > 2100) {
                throw new Error('El año debe ser válido');
            }
            
            // Intentar obtener estadísticas del backend
            try {
                const result = await this.apiRequest('/stats/monthly', 'POST', data);
                return result;
            } catch (error) {
                // Si el endpoint no existe, retornar null
                if (error.message.includes('404') || error.message.includes('Not Found')) {
                    return null;
                }
                throw error;
            }
            
        } catch (error) {
            throw error;
        }
    }
};
