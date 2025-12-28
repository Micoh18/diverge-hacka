/**
 * Manejo centralizado de errores para la API
 */

/**
 * Middleware de manejo de errores de Express
 * @param {Error} err - Error capturado
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next middleware
 */
export function errorHandler(err, req, res, next) {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body
    });
    
    // Parsear errores de Soroban
    if (err.message && err.message.includes('Soroban')) {
        return res.status(500).json({
            success: false,
            error: parseSorobanError(err),
            message: 'Error al interactuar con el contrato Soroban'
        });
    }
    
    // Errores de validación
    if (err.name === 'ValidationError' || err.message.includes('valid')) {
        return res.status(400).json({
            success: false,
            error: err.message,
            message: 'Error de validación de datos'
        });
    }
    
    // Error genérico
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Error interno del servidor',
        message: 'Ocurrió un error al procesar la solicitud'
    });
}

/**
 * Parsea errores de Soroban RPC para extraer mensajes útiles
 * @param {Error} error - Error de Soroban
 * @returns {string} - Mensaje de error parseado
 */
function parseSorobanError(error) {
    const errorMessage = error.message || '';
    const errorString = JSON.stringify(error);
    
    // Errores comunes del contrato
    if (errorMessage.includes('THERAPIST_NOT_AUTHORIZED') || errorString.includes('THERAPIST_NOT_AUTHORIZED')) {
        return 'El terapeuta no está autorizado para registrar sesiones';
    }
    
    if (errorMessage.includes('INVALID_BENEFICIARY') || errorString.includes('INVALID_BENEFICIARY')) {
        return 'Beneficiario inválido';
    }
    
    if (errorMessage.includes('INSUFFICIENT_BALANCE') || errorString.includes('INSUFFICIENT_BALANCE')) {
        return 'Saldo insuficiente para realizar la transacción';
    }
    
    if (errorMessage.includes('simulation') || errorString.includes('simulation')) {
        return 'Error en la simulación de la transacción. Verifica los parámetros.';
    }
    
    if (errorMessage.includes('contract') || errorString.includes('contract')) {
        return 'Error al interactuar con el contrato. Verifica que el contrato esté desplegado.';
    }
    
    // Retornar mensaje original si no se puede parsear
    return errorMessage || 'Error desconocido de Soroban';
}

/**
 * Middleware para validar que las variables de entorno estén configuradas
 */
export function validateEnv(req, res, next) {
    const required = ['SOROBAN_RPC_URL', 'NETWORK_PASSPHRASE', 'CONTRACT_ID'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        return res.status(500).json({
            success: false,
            error: `Variables de entorno faltantes: ${missing.join(', ')}`,
            message: 'El servidor no está configurado correctamente'
        });
    }
    
    next();
}

