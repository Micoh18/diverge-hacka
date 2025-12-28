/**
 * Controlador para endpoints de sesiones terapéuticas
 */
import { TransactionBuilder, Operation, xdr } from '@stellar/stellar-sdk';
import { getSorobanServer, getContract, getNetworkPassphrase, getTherapistKeypair, getAccount } from '../config/stellar.js';
import { textToBytes, formatDateToYYMM, validatePin, validateName } from '../utils/dataConverter.js';

/**
 * Registra una nueva sesión terapéutica
 * POST /api/sessions/record
 */
export async function recordSession(req, res, next) {
    try {
        const { 
            beneficiario_nombre, 
            beneficiario_pin, 
            tipo_terapia, 
            duracion_minutos, 
            asistencia, 
            notas 
        } = req.body;
        
        // Validar datos de entrada
        if (!validateName(beneficiario_nombre)) {
            return res.status(400).json({
                success: false,
                error: 'beneficiario_nombre es requerido y debe ser un string válido'
            });
        }
        
        if (!validatePin(beneficiario_pin)) {
            return res.status(400).json({
                success: false,
                error: 'beneficiario_pin es requerido y debe ser un string válido'
            });
        }
        
        if (!tipo_terapia || !['KINESIO', 'FONO', 'PSICO', 'OCUPACIONAL'].includes(tipo_terapia)) {
            return res.status(400).json({
                success: false,
                error: 'tipo_terapia debe ser uno de: KINESIO, FONO, PSICO, OCUPACIONAL'
            });
        }
        
        if (!duracion_minutos || typeof duracion_minutos !== 'number' || duracion_minutos < 1) {
            return res.status(400).json({
                success: false,
                error: 'duracion_minutos debe ser un número mayor a 0'
            });
        }
        
        if (!asistencia || !['COMPLETADA', 'NO_ASISTIO', 'CANCELADA'].includes(asistencia)) {
            return res.status(400).json({
                success: false,
                error: 'asistencia debe ser uno de: COMPLETADA, NO_ASISTIO, CANCELADA'
            });
        }
        
        // Convertir nombre y PIN a Bytes (hex)
        const nombreBytes = textToBytes(beneficiario_nombre.trim());
        const pinBytes = textToBytes(beneficiario_pin.trim());
        const notasBytes = notas ? textToBytes(notas.trim()) : textToBytes('');
        
        // Obtener instancias
        const server = getSorobanServer();
        const contract = getContract();
        const networkPassphrase = getNetworkPassphrase();
        
        // Obtener cuenta del terapeuta (modo custodial)
        const therapistKeypair = getTherapistKeypair();
        if (!therapistKeypair) {
            return res.status(500).json({
                success: false,
                error: 'THERAPIST_SECRET no configurado. El backend necesita la clave del terapeuta para firmar transacciones.'
            });
        }
        
        const sourceAccount = await getAccount(therapistKeypair.publicKey());
        
        // Construir argumentos para el contrato
        // Convertir strings a Bytes (ScVal)
        const nombreScVal = xdr.ScVal.scvBytes(Buffer.from(nombreBytes, 'hex'));
        const pinScVal = xdr.ScVal.scvBytes(Buffer.from(pinBytes, 'hex'));
        const tipoScVal = xdr.ScVal.scvSymbol(tipo_terapia);
        const duracionScVal = xdr.ScVal.scvU32(duracion_minutos);
        const asistenciaScVal = xdr.ScVal.scvSymbol(asistencia);
        const notasScVal = xdr.ScVal.scvBytes(Buffer.from(notasBytes, 'hex'));
        
        // Construir transacción
        let transaction = new TransactionBuilder(sourceAccount, {
            fee: '100', // Fee base
            networkPassphrase: networkPassphrase
        })
        .addOperation(
            contract.call(
                'record_session',
                nombreScVal,
                pinScVal,
                tipoScVal,
                duracionScVal,
                asistenciaScVal,
                notasScVal
            )
        )
        .setTimeout(600)
        .build();
        
        // Simular transacción (pre-flight)
        console.log('Simulando transacción...');
        const simulation = await server.simulateTransaction(transaction);
        
        if (simulation.errorResult) {
            const error = simulation.errorResult.value();
            throw new Error(`Error en simulación: ${JSON.stringify(error)}`);
        }
        
        // Preparar transacción con los recursos estimados
        transaction = await server.prepareTransaction(transaction);
        
        // Firmar transacción
        transaction.sign(therapistKeypair);
        
        // Enviar transacción
        console.log('Enviando transacción...');
        const sendResult = await server.sendTransaction(transaction);
        
        if (sendResult.errorResult) {
            const error = sendResult.errorResult.value();
            throw new Error(`Error al enviar transacción: ${JSON.stringify(error)}`);
        }
        
        // Esperar confirmación
        console.log('Esperando confirmación...', sendResult.hash);
        let finalResult = sendResult;
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts && finalResult.status === 'PENDING') {
            await new Promise(resolve => setTimeout(resolve, 2000));
            finalResult = await server.getTransaction(sendResult.hash);
            attempts++;
        }
        
        if (finalResult.status !== 'SUCCESS') {
            throw new Error(`La transacción falló con estado: ${finalResult.status}`);
        }
        
        // Extraer session_id del resultado (si está disponible)
        let sessionId = null;
        if (finalResult.returnValue) {
            try {
                const returnVal = xdr.ScVal.fromXDR(finalResult.returnValue, 'base64');
                if (returnVal.switch() === xdr.ScValType.scvU32()) {
                    sessionId = returnVal.u32();
                }
            } catch (error) {
                console.warn('No se pudo extraer session_id:', error);
            }
        }
        
        // Retornar éxito
        res.json({
            success: true,
            session_id: sessionId,
            transaction_hash: sendResult.hash
        });
        
    } catch (error) {
        console.error('Error en recordSession:', error);
        next(error);
    }
}

/**
 * Obtiene el conteo mensual de sesiones de un beneficiario
 * POST /api/sessions/monthly-count
 */
export async function getMonthlyCount(req, res, next) {
    try {
        const { beneficiario_nombre, beneficiario_pin, mes, anio } = req.body;
        
        // Validar datos
        if (!validateName(beneficiario_nombre)) {
            return res.status(400).json({
                success: false,
                error: 'beneficiario_nombre es requerido'
            });
        }
        
        if (!validatePin(beneficiario_pin)) {
            return res.status(400).json({
                success: false,
                error: 'beneficiario_pin es requerido'
            });
        }
        
        const month = parseInt(mes);
        const year = parseInt(anio);
        
        if (!month || month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                error: 'mes debe ser un número entre 1 y 12'
            });
        }
        
        if (!year || year < 2000 || year > 2100) {
            return res.status(400).json({
                success: false,
                error: 'anio debe ser un número válido'
            });
        }
        
        // Convertir datos
        const nombreBytes = textToBytes(beneficiario_nombre.trim());
        const pinBytes = textToBytes(beneficiario_pin.trim());
        const yyyymm = formatDateToYYMM(month, year);
        
        // Obtener instancias
        const server = getSorobanServer();
        const contract = getContract();
        const networkPassphrase = getNetworkPassphrase();
        
        // Necesitamos una cuenta para construir la transacción (puede ser cualquier cuenta existente)
        // Usaremos la cuenta del terapeuta si está disponible, o crearemos una cuenta dummy
        let sourceAccount;
        try {
            const therapistKeypair = getTherapistKeypair();
            if (therapistKeypair) {
                sourceAccount = await getAccount(therapistKeypair.publicKey());
            } else {
                // Crear una cuenta temporal para la simulación
                // En producción, deberías tener una cuenta dedicada para consultas
                throw new Error('No hay cuenta disponible para consultas');
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: 'No se pudo obtener una cuenta para la consulta. Verifica la configuración.'
            });
        }
        
        // Construir argumentos
        const nombreScVal = xdr.ScVal.scvBytes(Buffer.from(nombreBytes, 'hex'));
        const pinScVal = xdr.ScVal.scvBytes(Buffer.from(pinBytes, 'hex'));
        const yyyymmScVal = xdr.ScVal.scvU32(yyyymm);
        
        // Construir transacción de lectura
        let transaction = new TransactionBuilder(sourceAccount, {
            fee: '100',
            networkPassphrase: networkPassphrase
        })
        .addOperation(
            contract.call(
                'get_monthly_count',
                nombreScVal,
                pinScVal,
                yyyymmScVal
            )
        )
        .setTimeout(600)
        .build();
        
        // Simular transacción (no se firma ni envía)
        const simulation = await server.simulateTransaction(transaction);
        
        if (simulation.errorResult) {
            const error = simulation.errorResult.value();
            throw new Error(`Error en simulación: ${JSON.stringify(error)}`);
        }
        
        // Extraer resultado
        let count = 0;
        if (simulation.result) {
            try {
                const returnVal = xdr.ScVal.fromXDR(simulation.result.retval.toXDR('base64'), 'base64');
                if (returnVal.switch() === xdr.ScValType.scvU32()) {
                    count = returnVal.u32();
                }
            } catch (error) {
                console.warn('No se pudo extraer count:', error);
            }
        }
        
        res.json({
            success: true,
            count: count
        });
        
    } catch (error) {
        console.error('Error en getMonthlyCount:', error);
        next(error);
    }
}

/**
 * Obtiene estadísticas mensuales del centro (opcional)
 * POST /api/stats/monthly
 */
export async function getMonthlyStats(req, res, next) {
    try {
        const { mes, anio } = req.body;
        
        const month = parseInt(mes);
        const year = parseInt(anio);
        
        if (!month || month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                error: 'mes debe ser un número entre 1 y 12'
            });
        }
        
        if (!year || year < 2000 || year > 2100) {
            return res.status(400).json({
                success: false,
                error: 'anio debe ser un número válido'
            });
        }
        
        const yyyymm = formatDateToYYMM(month, year);
        
        // Obtener instancias
        const server = getSorobanServer();
        const contract = getContract();
        const networkPassphrase = getNetworkPassphrase();
        
        // Obtener cuenta para consulta
        let sourceAccount;
        try {
            const therapistKeypair = getTherapistKeypair();
            if (therapistKeypair) {
                sourceAccount = await getAccount(therapistKeypair.publicKey());
            } else {
                throw new Error('No hay cuenta disponible para consultas');
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: 'No se pudo obtener una cuenta para la consulta'
            });
        }
        
        // Construir transacción de lectura
        let transaction = new TransactionBuilder(sourceAccount, {
            fee: '100',
            networkPassphrase: networkPassphrase
        })
        .addOperation(
            contract.call(
                'estadisticas_mes',
                xdr.ScVal.scvU32(month),
                xdr.ScVal.scvU32(year)
            )
        )
        .setTimeout(600)
        .build();
        
        // Simular transacción
        const simulation = await server.simulateTransaction(transaction);
        
        if (simulation.errorResult) {
            const error = simulation.errorResult.value();
            throw new Error(`Error en simulación: ${JSON.stringify(error)}`);
        }
        
        // Extraer resultado (asumiendo que retorna una tupla: [completadas, no_asistio, canceladas])
        let completadas = 0;
        let noAsistio = 0;
        let canceladas = 0;
        
        if (simulation.result) {
            try {
                const returnVal = xdr.ScVal.fromXDR(simulation.result.retval.toXDR('base64'), 'base64');
                // Si es una tupla, extraer los valores
                if (returnVal.switch() === xdr.ScValType.scvVec()) {
                    const vec = returnVal.vec();
                    if (vec && vec.length >= 3) {
                        if (vec[0].switch() === xdr.ScValType.scvU32()) completadas = vec[0].u32();
                        if (vec[1].switch() === xdr.ScValType.scvU32()) noAsistio = vec[1].u32();
                        if (vec[2].switch() === xdr.ScValType.scvU32()) canceladas = vec[2].u32();
                    }
                }
            } catch (error) {
                console.warn('No se pudo extraer estadísticas:', error);
            }
        }
        
        res.json({
            success: true,
            completadas: completadas,
            no_asistio: noAsistio,
            canceladas: canceladas
        });
        
    } catch (error) {
        console.error('Error en getMonthlyStats:', error);
        next(error);
    }
}

