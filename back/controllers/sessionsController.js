/**
 * Controlador para endpoints de sesiones terapéuticas
 */
import { TransactionBuilder, Operation, xdr, Address, scValToNative } from '@stellar/stellar-sdk';
import { getSorobanServer, getContract, getNetworkPassphrase, getTherapistKeypair, getAccount } from '../config/stellar.js';
import { formatDateToYYMM, validatePin, validateName } from '../utils/dataConverter.js';
import db from '../database/db.js';

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
                error: 'beneficiario_nombre es requerido y debe tener entre 1 y 100 caracteres'
            });
        }
        
        if (!validatePin(beneficiario_pin)) {
            return res.status(400).json({
                success: false,
                error: 'beneficiario_pin es requerido y debe ser un número de 1 a 6 dígitos'
            });
        }
        
        if (!tipo_terapia || !['KINESIO', 'FONO', 'PSICO', 'OCUPACIONAL'].includes(tipo_terapia)) {
            return res.status(400).json({
                success: false,
                error: 'tipo_terapia debe ser uno de: KINESIO, FONO, PSICO, OCUPACIONAL'
            });
        }
        
        // Validación más permisiva: permite 0 o mayor, con un máximo razonable (ej: 480 minutos = 8 horas)
        if (typeof duracion_minutos !== 'number' || duracion_minutos < 0 || duracion_minutos > 480) {
            return res.status(400).json({
                success: false,
                error: 'duracion_minutos debe ser un número entre 0 y 480 minutos (8 horas)'
            });
        }
        
        if (!asistencia || !['COMPLETADA', 'NO_ASISTIO', 'CANCELADA'].includes(asistencia)) {
            return res.status(400).json({
                success: false,
                error: 'asistencia debe ser uno de: COMPLETADA, NO_ASISTIO, CANCELADA'
            });
        }
        
        // Convertir nombre y PIN a Bytes (hex)
        // Asegurarse de que los valores sean strings antes de trim y conversión
        const nombreStr = String(beneficiario_nombre || '').trim();
        const pinStr = String(beneficiario_pin || '').trim();
        const notasStr = notas ? String(notas).trim() : '';
        
        // Validar nuevamente después de trim (por si acaso quedó vacío)
        if (!nombreStr) {
            return res.status(400).json({
                success: false,
                error: 'beneficiario_nombre no puede estar vacío'
            });
        }
        
        if (!pinStr) {
            return res.status(400).json({
                success: false,
                error: 'beneficiario_pin no puede estar vacío'
            });
        }
        
        // Convertir strings a hexadecimal usando Buffer nativo (más robusto que textToBytes)
        const nombreBytes = Buffer.from(nombreStr, 'utf8').toString('hex');
        const pinBytes = Buffer.from(pinStr, 'utf8').toString('hex');
        const notasBytes = Buffer.from(notasStr, 'utf8').toString('hex');
        
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
        
        // 1. Obtener Address del Terapeuta (Keypair)
        const therapistAddress = therapistKeypair.publicKey();
        
        // 2. Calcular YYYYMM (Fecha actual para estadísticas)
        const date = new Date();
        // Usar la misma función formatDateToYYMM para mantener consistencia
        const currentMonth = date.getMonth() + 1; // getMonth() retorna 0-11
        const currentYear = date.getFullYear();
        const yyyymm = formatDateToYYMM(currentMonth, currentYear); // Ej: 202512
        
        // Log para debugging
        console.log('📝 Registro de sesión:');
        console.log('  - Nombre:', nombreStr, '(hex:', nombreBytes + ')');
        console.log('  - PIN:', pinStr, '(hex:', pinBytes + ')');
        console.log('  - Fecha actual -> yyyymm:', yyyymm, '(año:', date.getFullYear() + ', mes:', (date.getMonth() + 1) + ')');
        
        // 3. Preparar ScVals (TIPOS EXACTOS DEL CONTRATO)
        // Convertir Address a ScVal usando Address del SDK
        const therapistAddressObj = new Address(therapistAddress);
        const therapistScVal = therapistAddressObj.toScVal();
        
        // Convertir strings a Bytes (ScVal)
        const nombreScVal = xdr.ScVal.scvBytes(Buffer.from(nombreBytes, 'hex'));
        const pinScVal = xdr.ScVal.scvBytes(Buffer.from(pinBytes, 'hex'));
        const tipoScVal = xdr.ScVal.scvSymbol(tipo_terapia);
        const statusScVal = xdr.ScVal.scvSymbol(asistencia); // En contrato se llama 'status'
        const yyyymmScVal = xdr.ScVal.scvU32(yyyymm);
        
        // NOTA: duracion y notas NO se envían al contrato, 
        // se guardarán en una base de datos tradicional (futuro)
        
        // 4. Construir Transacción (ORDEN EXACTO según el contrato)
        let transaction = new TransactionBuilder(sourceAccount, {
            fee: '100',
            networkPassphrase: networkPassphrase
        })
        .addOperation(
            contract.call(
                'record_session',
                therapistScVal,   // <--- 1. Terapeuta (Address)
                nombreScVal,      // <--- 2. Nombre (Bytes)
                pinScVal,         // <--- 3. PIN (Bytes)
                tipoScVal,        // <--- 4. Kind/Tipo (Symbol)
                statusScVal,      // <--- 5. Status (Symbol)
                yyyymmScVal       // <--- 6. Fecha (u32)
            )
        )
        .setTimeout(600)
        .build();
        
        // Preparar transacción (obtiene los recursos necesarios)
        console.log('Preparando transacción...');
        transaction = await server.prepareTransaction(transaction);
        
        // Firmar transacción con el keypair del terapeuta (IMPORTANTE: antes de simular/enviar)
        // Esto es necesario porque el contrato tiene require_auth() que valida la firma
        console.log('Firmando transacción con keypair del terapeuta...');
        transaction.sign(therapistKeypair);
        
        // Simular transacción (pre-flight) - ahora con la firma incluida
        console.log('Simulando transacción...');
        const simulation = await server.simulateTransaction(transaction);
        
        if (simulation.errorResult) {
            const error = simulation.errorResult.value();
            throw new Error(`Error en simulación: ${JSON.stringify(error)}`);
        }
        
        // Enviar transacción
        console.log('Enviando transacción...');
        let sendResponse = await server.sendTransaction(transaction);
        
        // 1. Verificar si fue aceptada inicialmente
        if (sendResponse.status !== 'PENDING' && sendResponse.errorResult) {
            const error = sendResponse.errorResult.value();
            throw new Error(`Error al enviar transacción: ${JSON.stringify(error)}`);
        }
        
        if (sendResponse.status !== 'PENDING') {
            throw new Error(`Fallo inicial al enviar: ${sendResponse.status}`);
        }
        
        console.log(`Transacción enviada hash: ${sendResponse.hash}`);
        console.log('Esperando confirmación (Polling)...');
        
        // 2. Loop de Polling (Esperar hasta SUCCESS o FAILED)
        let statusResponse;
        let retries = 0;
        const maxRetries = 15; // 15 intentos (30 segundos total con 2s de espera)
        const waitTime = 2000; // 2 segundos
        
        while (retries < maxRetries) {
            // Esperar 2 segundos
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Consultar estado
            try {
                statusResponse = await server.getTransaction(sendResponse.hash);
                
                if (statusResponse.status === 'SUCCESS') {
                    console.log('✅ Transacción exitosa!');
                    break; // Salir del loop
                } else if (statusResponse.status === 'FAILED') {
                    console.error('❌ Transacción fallida:', statusResponse);
                    throw new Error('La transacción falló en la red.');
                } else if (statusResponse.status === 'NOT_FOUND') {
                    console.log(`⏳ Aún no encontrada (intento ${retries + 1}/${maxRetries})...`);
                    // Continuar esperando, es normal al principio
                } else if (statusResponse.status === 'PENDING') {
                    console.log(`⏳ Transacción pendiente (intento ${retries + 1}/${maxRetries})...`);
                    // Continuar esperando
                }
            } catch (error) {
                // Si hay error al consultar (ej: NOT_FOUND), continuar esperando
                console.log(`⏳ Error al consultar estado (intento ${retries + 1}/${maxRetries}):`, error.message);
            }
            
            retries++;
        }
        
        if (!statusResponse || statusResponse.status !== 'SUCCESS') {
            throw new Error(`Tiempo de espera agotado (Timeout) confirmando transacción. Último estado: ${statusResponse?.status || 'NOT_FOUND'}`);
        }
        
        // 3. Extraer session_id del resultado de la transacción
        let sessionId = null;
        try {
            // El resultado puede estar en diferentes formatos dependiendo de la versión del SDK
            // Intentamos múltiples formas de extraerlo
            
            // Método 1: Si returnValue está disponible directamente
            if (statusResponse.returnValue) {
                console.log('Intentando parsear returnValue...');
                console.log('Tipo de returnValue:', typeof statusResponse.returnValue);
                console.log('returnValue:', statusResponse.returnValue);
                
                let returnVal;
                
                // returnValue puede ser un string base64 o ya un objeto ScVal parseado
                if (typeof statusResponse.returnValue === 'string') {
                    // Si es string, parsearlo desde base64
                    console.log('returnValue es string, parseando desde base64...');
                    returnVal = xdr.ScVal.fromXDR(statusResponse.returnValue, 'base64');
                } else {
                    // Si ya es un objeto (ChildUnion/ScVal parseado), usarlo directamente
                    console.log('returnValue ya es objeto, usando directamente...');
                    returnVal = statusResponse.returnValue;
                }
                
                // Usar scValToNative para convertir a valor nativo de JavaScript
                sessionId = scValToNative(returnVal);
                console.log('✅ session_id extraído:', sessionId, typeof sessionId);
            }
            // Método 2: Si está en resultMetaXdr (formato más complejo)
            else if (statusResponse.resultMetaXdr) {
                console.log('Intentando parsear resultMetaXdr...');
                const resultMeta = xdr.TransactionMeta.fromXDR(statusResponse.resultMetaXdr, 'base64');
                
                // Buscar el valor de retorno en los resultados de las operaciones
                const operations = resultMeta.v3().operations();
                if (operations && operations.length > 0) {
                    const firstOp = operations[0];
                    if (firstOp && firstOp.result() && firstOp.result().tr()) {
                        const invokeHostResult = firstOp.result().tr().invokeHostResult();
                        if (invokeHostResult && invokeHostResult.success()) {
                            const returnVal = invokeHostResult.success();
                            sessionId = scValToNative(returnVal);
                            console.log('✅ session_id extraído de resultMetaXdr:', sessionId);
                        }
                    }
                }
            }
            // Método 3: Si está en el campo result directamente
            else if (statusResponse.result) {
                console.log('Intentando parsear result...');
                if (statusResponse.result.retval) {
                    const returnVal = xdr.ScVal.fromXDR(statusResponse.result.retval.toXDR('base64'), 'base64');
                    sessionId = scValToNative(returnVal);
                    console.log('✅ session_id extraído de result:', sessionId);
                }
            }
            
            // Validar que sessionId sea un número válido
            if (sessionId !== null && (typeof sessionId === 'number' || typeof sessionId === 'bigint')) {
                sessionId = Number(sessionId);
            } else if (sessionId === null || sessionId === undefined) {
                console.warn('⚠️ session_id no encontrado en la respuesta de la transacción');
            }
            
        } catch (error) {
            console.error('❌ Error al extraer session_id:', error);
            console.error('Detalles del error:', error.message);
            console.error('Stack:', error.stack);
            // No lanzamos el error, solo lo registramos
            // El hash de la transacción es prueba suficiente de éxito
        }
        
        // 4. Guardar sesión en base de datos SQLite
        try {
            const insertSession = db.prepare(`
                INSERT INTO sessions (
                    session_id,
                    transaction_hash,
                    therapist_address,
                    beneficiary_name,
                    beneficiary_pin,
                    therapy_type,
                    status,
                    duration_minutes,
                    notes,
                    yyyymm
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            insertSession.run(
                sessionId || null,
                sendResponse.hash,
                therapistAddress,
                nombreStr,
                pinStr,
                tipo_terapia,
                asistencia,
                duracion_minutos,
                notasStr || null,
                yyyymm
            );
            
            console.log('✅ Sesión guardada en base de datos SQLite');
        } catch (dbError) {
            // Si falla la inserción en BD, solo loguear el error pero no fallar
            // La transacción blockchain ya fue exitosa
            console.error('⚠️ Error al guardar sesión en BD (no crítico):', dbError.message);
            if (dbError.message.includes('UNIQUE constraint')) {
                console.warn('  La sesión ya existe en la BD (transaction_hash duplicado)');
            }
        }
        
        // 5. Responder al cliente con ÉXITO
        // El hash de la transacción es prueba suficiente de que se registró correctamente
        res.status(200).json({
            success: true,
            message: 'Sesión registrada correctamente en Blockchain',
            transaction_hash: sendResponse.hash,
            session_id: sessionId || 'Registrado (verificar en Explorer)',
            explorer_url: `https://stellar.expert/explorer/testnet/tx/${sendResponse.hash}`
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
        // Asegurarse de que los valores sean strings antes de trim y conversión
        const nombreStr = String(beneficiario_nombre || '').trim();
        const pinStr = String(beneficiario_pin || '').trim();
        
        // Validar nuevamente después de trim
        if (!nombreStr) {
            return res.status(400).json({
                success: false,
                error: 'beneficiario_nombre no puede estar vacío'
            });
        }
        
        if (!pinStr) {
            return res.status(400).json({
                success: false,
                error: 'beneficiario_pin no puede estar vacío'
            });
        }
        
        // Convertir strings a hexadecimal usando Buffer nativo (más robusto que textToBytes)
        const nombreBytes = Buffer.from(nombreStr, 'utf8').toString('hex');
        const pinBytes = Buffer.from(pinStr, 'utf8').toString('hex');
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
        // El contrato get_monthly_count requiere: (nombre, pin, yyyymm, kind)
        // Para la familia, consultamos todos los tipos de terapia y obtenemos el desglose
        const tiposTerapia = ['KINESIO', 'FONO', 'PSICO', 'OCUPACIONAL'];
        let totalCount = 0;
        const breakdownByType = {
            'KINESIO': 0,
            'FONO': 0,
            'PSICO': 0,
            'OCUPACIONAL': 0
        }; // Desglose por tipo de terapia (inicializar todos en 0)
        
        console.log('🔍 Búsqueda de sesiones:');
        console.log('  - Nombre:', nombreStr, '(hex:', nombreBytes + ')');
        console.log('  - PIN:', pinStr, '(hex:', pinBytes + ')');
        console.log('  - Mes/Año:', month + '/' + year, '-> yyyymm:', yyyymm);
        console.log('  - Consultando todos los tipos de terapia...');
        
        // Consultar cada tipo de terapia y obtener el desglose
        for (const tipo of tiposTerapia) {
            try {
                const nombreScVal = xdr.ScVal.scvBytes(Buffer.from(nombreBytes, 'hex'));
                const pinScVal = xdr.ScVal.scvBytes(Buffer.from(pinBytes, 'hex'));
                const yyyymmScVal = xdr.ScVal.scvU32(yyyymm);
                const kindScVal = xdr.ScVal.scvSymbol(tipo);
                
                // Construir transacción de lectura para este tipo
                let transaction = new TransactionBuilder(sourceAccount, {
                    fee: '100',
                    networkPassphrase: networkPassphrase
                })
                .addOperation(
                    contract.call(
                        'get_monthly_count',
                        nombreScVal,
                        pinScVal,
                        yyyymmScVal,
                        kindScVal
                    )
                )
                .setTimeout(600)
                .build();
                
                // Simular transacción
                const simulation = await server.simulateTransaction(transaction);
                
                if (simulation.errorResult) {
                    console.warn(`  ⚠️ Error consultando ${tipo}:`, simulation.errorResult.value());
                    breakdownByType[tipo] = 0; // Registrar 0 si hay error
                    continue; // Continuar con el siguiente tipo
                }
                
                // Extraer resultado
                let count = 0;
                if (simulation.result && simulation.result.retval) {
                    try {
                        let returnVal = simulation.result.retval;
                        
                        // Convertir a ScVal si es necesario
                        if (typeof returnVal === 'string') {
                            returnVal = xdr.ScVal.fromXDR(returnVal, 'base64');
                        } else if (returnVal.toXDR) {
                            returnVal = xdr.ScVal.fromXDR(returnVal.toXDR('base64'), 'base64');
                        }
                        
                        count = scValToNative(returnVal);
                        if (typeof count === 'number') {
                            totalCount += count;
                            breakdownByType[tipo] = count;
                            console.log(`  ✅ ${tipo}: ${count} sesiones`);
                        } else {
                            breakdownByType[tipo] = 0;
                        }
                    } catch (error) {
                        console.warn(`  ⚠️ Error extrayendo count para ${tipo}:`, error.message);
                        breakdownByType[tipo] = 0;
                    }
                } else {
                    breakdownByType[tipo] = 0;
                }
            } catch (error) {
                console.warn(`  ⚠️ Error consultando ${tipo}:`, error.message);
                breakdownByType[tipo] = 0; // Registrar 0 si hay error
                continue; // Continuar con el siguiente tipo
            }
        }
        
        console.log(`  📊 Total de sesiones: ${totalCount}`);
        
        // 4. Consultar base de datos SQLite para obtener lista detallada de sesiones
        let sessionsList = [];
        try {
            const getSessions = db.prepare(`
                SELECT 
                    id,
                    session_id,
                    transaction_hash,
                    therapist_address,
                    beneficiary_name,
                    beneficiary_pin,
                    therapy_type,
                    status,
                    duration_minutes,
                    notes,
                    yyyymm,
                    created_at
                FROM sessions
                WHERE beneficiary_name = ?
                  AND beneficiary_pin = ?
                  AND yyyymm = ?
                ORDER BY created_at DESC
            `);
            
            const sessions = getSessions.all(nombreStr, pinStr, yyyymm);
            sessionsList = sessions.map(session => ({
                id: session.id,
                session_id: session.session_id,
                transaction_hash: session.transaction_hash,
                therapist_address: session.therapist_address,
                therapy_type: session.therapy_type,
                status: session.status,
                duration_minutes: session.duration_minutes,
                notes: session.notes,
                yyyymm: session.yyyymm,
                created_at: session.created_at
            }));
            
            console.log(`  📋 Sesiones encontradas en BD: ${sessionsList.length}`);
        } catch (dbError) {
            console.error('⚠️ Error al consultar sesiones en BD:', dbError.message);
            // Continuar sin las sesiones de BD, solo con el conteo del contrato
        }
        
        // 5. Retornar el total, desglose y lista detallada de sesiones
        res.json({
            success: true,
            count: totalCount,
            breakdown: breakdownByType, // Desglose por tipo de terapia (del contrato)
            sessions: sessionsList, // Lista detallada de sesiones (de BD)
            month: month,
            year: year,
            beneficiary_name: nombreStr // Incluir el nombre para referencia
        });
        
        return; // Salir temprano, ya respondimos
        
    } catch (error) {
        console.error('Error en getMonthlyCount:', error);
        next(error);
    }
}

/**
 * Obtiene estadísticas mensuales generales del centro
 * POST /api/stats/monthly
 * Consulta la base de datos SQLite para obtener estadísticas agregadas del mes
 */
export async function getMonthlyStats(req, res, next) {
    try {
        console.log('📊 [getMonthlyStats] === INICIO ===');
        console.log('📊 [getMonthlyStats] Body recibido:', req.body);
        console.log('📊 [getMonthlyStats] Headers:', req.headers);
        
        const { mes, anio } = req.body;
        console.log('📊 [getMonthlyStats] mes extraído:', mes, 'tipo:', typeof mes);
        console.log('📊 [getMonthlyStats] anio extraído:', anio, 'tipo:', typeof anio);
        
        const month = parseInt(mes);
        const year = parseInt(anio);
        console.log('📊 [getMonthlyStats] month parseado:', month);
        console.log('📊 [getMonthlyStats] year parseado:', year);
        
        if (!month || month < 1 || month > 12) {
            console.error('📊 [getMonthlyStats] ❌ Validación fallida: mes inválido');
            return res.status(400).json({
                success: false,
                error: 'mes debe ser un número entre 1 y 12'
            });
        }
        
        if (!year || year < 2000 || year > 2100) {
            console.error('📊 [getMonthlyStats] ❌ Validación fallida: año inválido');
            return res.status(400).json({
                success: false,
                error: 'anio debe ser un número válido'
            });
        }
        
        const yyyymm = formatDateToYYMM(month, year);
        console.log(`📊 [getMonthlyStats] Consultando estadísticas generales del centro para ${month}/${year} (yyyymm: ${yyyymm})`);
        
        // Consultar base de datos SQLite para obtener estadísticas agregadas
        try {
            console.log('📊 [getMonthlyStats] Preparando consultas a BD...');
            
            // Consulta para obtener conteos por estado
            const getStatsByStatus = db.prepare(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM sessions
                WHERE yyyymm = ?
                GROUP BY status
            `);
            
            console.log('📊 [getMonthlyStats] Ejecutando consulta por estado con yyyymm:', yyyymm);
            const statsByStatus = getStatsByStatus.all(yyyymm);
            console.log('📊 [getMonthlyStats] Resultados por estado:', statsByStatus);
            
            // Inicializar contadores
            let completadas = 0;
            let noAsistio = 0;
            let canceladas = 0;
            
            // Procesar resultados
            for (const row of statsByStatus) {
                const status = row.status;
                const count = row.count;
                console.log(`📊 [getMonthlyStats] Procesando: status=${status}, count=${count}`);
                
                if (status === 'COMPLETADA') {
                    completadas = count;
                } else if (status === 'NO_ASISTIO') {
                    noAsistio = count;
                } else if (status === 'CANCELADA') {
                    canceladas = count;
                }
            }
            
            // Consulta adicional para obtener desglose por tipo de terapia
            const getStatsByType = db.prepare(`
                SELECT 
                    therapy_type,
                    COUNT(*) as count
                FROM sessions
                WHERE yyyymm = ?
                GROUP BY therapy_type
            `);
            
            console.log('📊 [getMonthlyStats] Ejecutando consulta por tipo de terapia...');
            const statsByType = getStatsByType.all(yyyymm);
            console.log('📊 [getMonthlyStats] Resultados por tipo:', statsByType);
            
            const breakdownByType = {};
            
            for (const row of statsByType) {
                breakdownByType[row.therapy_type] = row.count;
            }
            
            const total = completadas + noAsistio + canceladas;
            
            console.log(`📊 [getMonthlyStats] ✅ Estadísticas encontradas: ${total} sesiones totales`);
            console.log(`📊 [getMonthlyStats]     - Completadas: ${completadas}`);
            console.log(`📊 [getMonthlyStats]     - No asistió: ${noAsistio}`);
            console.log(`📊 [getMonthlyStats]     - Canceladas: ${canceladas}`);
            console.log(`📊 [getMonthlyStats]     - Breakdown por tipo:`, breakdownByType);
            
            const responseData = {
                success: true,
                completadas: completadas,
                no_asistio: noAsistio,
                canceladas: canceladas,
                total: total,
                breakdown_by_type: breakdownByType,
                month: month,
                year: year,
                yyyymm: yyyymm
            };
            
            console.log('📊 [getMonthlyStats] Enviando respuesta:', responseData);
            res.json(responseData);
            console.log('📊 [getMonthlyStats] === FIN (éxito) ===');
            
        } catch (dbError) {
            console.error('📊 [getMonthlyStats] ⚠️ Error al consultar estadísticas en BD:', dbError.message);
            console.error('📊 [getMonthlyStats] Stack:', dbError.stack);
            // Si falla la BD, retornar ceros en lugar de error
            const fallbackResponse = {
                success: true,
                completadas: 0,
                no_asistio: 0,
                canceladas: 0,
                total: 0,
                breakdown_by_type: {},
                month: month,
                year: year,
                yyyymm: yyyymm
            };
            console.log('📊 [getMonthlyStats] Enviando respuesta fallback:', fallbackResponse);
            res.json(fallbackResponse);
            console.log('📊 [getMonthlyStats] === FIN (fallback) ===');
        }
        
    } catch (error) {
        console.error('📊 [getMonthlyStats] ❌ Error general:', error);
        console.error('📊 [getMonthlyStats] Stack:', error.stack);
        console.log('📊 [getMonthlyStats] === FIN (error) ===');
        next(error);
    }
}

