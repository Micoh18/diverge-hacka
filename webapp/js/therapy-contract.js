// Módulo de interacción con el contrato de sesiones terapéuticas
const TherapyContract = {
    sorobanServer: null,
    horizonServer: null,
    
    init: function() {
        this.initSoroban();
        this.initHorizon();
    },
    
    initSoroban: function() {
        try {
            if (typeof StellarSdk === 'undefined') {
                throw new Error('Stellar SDK no está cargado');
            }
            
            // Verificar que SorobanRpc esté disponible
            if (!StellarSdk.SorobanRpc || !StellarSdk.SorobanRpc.Server) {
                console.warn('SorobanRpc no está disponible en esta versión del SDK');
                return;
            }
            
            const sorobanRpcUrl = TherapyConfig.getSorobanRpcUrl();
            this.sorobanServer = new StellarSdk.SorobanRpc.Server(sorobanRpcUrl, { 
                allowHttp: TherapyConfig.isTestnet() 
            });
            console.log('Soroban RPC inicializado:', sorobanRpcUrl);
        } catch (error) {
            console.error('Error al inicializar Soroban:', error);
        }
    },
    
    initHorizon: function() {
        try {
            if (typeof StellarSdk === 'undefined') {
                throw new Error('Stellar SDK no está cargado');
            }
            
            // Reutilizar configuración de red de StellarConfig si está disponible
            let horizonUrl;
            if (typeof StellarConfig !== 'undefined') {
                horizonUrl = StellarConfig.getHorizonUrl();
            } else {
                horizonUrl = TherapyConfig.isTestnet()
                    ? 'https://horizon-testnet.stellar.org'
                    : 'https://horizon.stellar.org';
            }
            
            if (typeof StellarSdk.Server === 'function') {
                this.horizonServer = new StellarSdk.Server(horizonUrl, { 
                    allowHttp: TherapyConfig.isTestnet() 
                });
            } else if (StellarSdk.Horizon && typeof StellarSdk.Horizon.Server === 'function') {
                this.horizonServer = new StellarSdk.Horizon.Server(horizonUrl, { 
                    allowHttp: TherapyConfig.isTestnet() 
                });
            } else {
                throw new Error('No se pudo encontrar Server en StellarSdk');
            }
            
            console.log('Horizon Server inicializado:', horizonUrl);
        } catch (error) {
            console.error('Error al inicializar Horizon:', error);
        }
    },
    
    // Convertir nombre del beneficiario a Address Stellar usando hash determinístico
    nombreABeneficiarioAddress: function(nombre) {
        try {
            // Normalizar nombre: trim, uppercase
            const nombreNormalizado = nombre.trim().toUpperCase();
            
            // Crear string para hash: nombre + salt
            const hashInput = nombreNormalizado + TherapyConfig.beneficiarioSalt;
            
            // Generar hash determinístico usando método simple
            // NOTA: En producción, esto debe ser consistente con el contrato
            // Usar el mismo método que el contrato para generar Address desde nombre
            const hashString = this.simpleHash(hashInput);
            
            // Generar keypair desde el hash (determinístico)
            // Usar el hash como seed para generar un keypair
            const seed = this.hashToSeed(hashString);
            const keypair = StellarSdk.Keypair.fromSecret(seed);
            
            return StellarSdk.Address.fromString(keypair.publicKey());
        } catch (error) {
            console.error('Error convirtiendo nombre a Address:', error);
            throw new Error('No se pudo convertir el nombre a Address: ' + error.message);
        }
    },
    
    // Hash simple determinístico (para demo - en producción usar SHA256 real)
    simpleHash: function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    },
    
    // Convertir hash a seed de Stellar (formato S...)
    hashToSeed: function(hash) {
        // Generar un seed determinístico de 56 caracteres
        // Repetir el hash hasta tener 55 caracteres, luego agregar 'S' al inicio
        let seed = hash;
        while (seed.length < 55) {
            seed += hash;
        }
        seed = seed.substring(0, 55);
        return 'S' + seed;
    },
    
    // Registrar una sesión terapéutica
    registrarSesion: async function(terapeutaAddress, beneficiarioNombre, tipo, duracion, asistencia, notas) {
        if (!this.sorobanServer) {
            throw new Error('Soroban RPC no está inicializado');
        }
        
        if (!this.horizonServer) {
            throw new Error('Horizon Server no está inicializado');
        }
        
        const contractId = TherapyConfig.therapyContractId;
        if (!contractId || contractId === 'CONTRACT_ID_AQUI') {
            throw new Error('Contrato de sesiones no configurado. Contacta al administrador.');
        }
        
        try {
            // Obtener cuenta del terapeuta
            const account = await this.horizonServer.getAccount(terapeutaAddress);
            
            // Convertir nombre del beneficiario a Address
            const beneficiarioAddress = this.nombreABeneficiarioAddress(beneficiarioNombre);
            
            // Construir argumentos para el contrato
            const terapeutaScVal = StellarSdk.nativeToScVal(
                StellarSdk.Address.fromString(terapeutaAddress), 
                { type: 'address' }
            );
            const beneficiarioScVal = StellarSdk.nativeToScVal(beneficiarioAddress, { type: 'address' });
            const tipoScVal = StellarSdk.nativeToScVal(tipo, { type: 'string' });
            const duracionScVal = StellarSdk.nativeToScVal(duracion, { type: 'u32' });
            const asistenciaScVal = StellarSdk.nativeToScVal(asistencia, { type: 'string' });
            const notasScVal = StellarSdk.nativeToScVal(notas, { type: 'string' });
            
            // Construir transacción
            let transaction = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: TherapyConfig.getNetworkPassphrase()
            })
            .addOperation(
                StellarSdk.Operation.invokeContractFunction({
                    contract: contractId,
                    function: 'registrar_sesion',
                    args: [terapeutaScVal, beneficiarioScVal, tipoScVal, duracionScVal, asistenciaScVal, notasScVal]
                })
            )
            .setTimeout(600)
            .build();
            
            // Simular transacción
            const simulation = await this.sorobanServer.simulateTransaction(transaction);
            if (simulation.error) {
                throw new Error('Error en simulación: ' + JSON.stringify(simulation.error));
            }
            
            // Preparar transacción
            transaction = await this.sorobanServer.prepareTransaction(transaction);
            
            // Firmar con Freighter
            const freighter = window.freighter || window.freighterApi;
            if (!freighter) {
                throw new Error('Freighter no está disponible');
            }
            
            const signResult = await freighter.signTransaction(transaction.toXDR(), {
                networkPassphrase: TherapyConfig.getNetworkPassphraseString(),
                accountToSign: terapeutaAddress
            });
            
            if (signResult.error) {
                throw new Error(signResult.error);
            }
            
            const signedXdr = signResult.signedTransaction || signResult.signedTxXdr || signResult.signedXDR;
            if (!signedXdr) {
                throw new Error('No se recibió XDR firmada');
            }
            
            // Enviar transacción
            const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(
                signedXdr, 
                TherapyConfig.getNetworkPassphrase()
            );
            const response = await this.sorobanServer.sendTransaction(transactionToSubmit);
            
            if (response.status === 'PENDING') {
                // Esperar confirmación
                const final = await this.waitForTransaction(response.hash);
                if (final.status !== 'SUCCESS') {
                    throw new Error('La transacción falló: ' + final.status);
                }
                return this.extractSessionId(final);
            } else if (response.status !== 'SUCCESS') {
                throw new Error('La transacción no fue aceptada: ' + response.status);
            }
            
            return this.extractSessionId(response);
            
        } catch (error) {
            console.error('Error registrando sesión:', error);
            throw error;
        }
    },
    
    // Obtener sesiones de un beneficiario
    obtenerSesionesBeneficiario: async function(beneficiarioNombre) {
        if (!this.sorobanServer) {
            throw new Error('Soroban RPC no está inicializado');
        }
        
        if (!this.horizonServer) {
            throw new Error('Horizon Server no está inicializado');
        }
        
        const contractId = TherapyConfig.therapyContractId;
        if (!contractId || contractId === 'CONTRACT_ID_AQUI') {
            throw new Error('Contrato de sesiones no configurado');
        }
        
        try {
            // Necesitamos una cuenta para construir la transacción (puede ser cualquier cuenta)
            // En este caso, usamos una cuenta dummy o la cuenta del contrato
            // Para consultas de solo lectura, podemos usar cualquier cuenta existente
            const dummyAccount = await this.horizonServer.getAccount(
                'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
            ).catch(() => {
                // Si falla, crear una cuenta temporal
                return null;
            });
            
            // Convertir nombre a Address
            const beneficiarioAddress = this.nombreABeneficiarioAddress(beneficiarioNombre);
            const beneficiarioScVal = StellarSdk.nativeToScVal(beneficiarioAddress, { type: 'address' });
            
            // Para consultas, necesitamos una cuenta válida
            // Usaremos una cuenta de prueba o la primera cuenta disponible
            const testAccount = await this.horizonServer.getAccount(
                'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
            ).catch(async () => {
                // Si no existe, crear una cuenta temporal para la consulta
                const keypair = StellarSdk.Keypair.random();
                return {
                    accountId: keypair.publicKey(),
                    sequenceNumber: () => '0'
                };
            });
            
            let transaction = new StellarSdk.TransactionBuilder(testAccount, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: TherapyConfig.getNetworkPassphrase()
            })
            .addOperation(
                StellarSdk.Operation.invokeContractFunction({
                    contract: contractId,
                    function: 'obtener_sesiones_beneficiario',
                    args: [beneficiarioScVal]
                })
            )
            .setTimeout(600)
            .build();
            
            const simulation = await this.sorobanServer.simulateTransaction(transaction);
            if (simulation.error) {
                throw new Error('Error en simulación: ' + JSON.stringify(simulation.error));
            }
            
            // Decodificar resultado
            const scv = simulation.result?.retval ?? simulation.result?.returnValue ?? simulation.returnValue;
            if (!scv) {
                return []; // No hay sesiones
            }
            
            const sesiones = StellarSdk.scValToNative(scv);
            return Array.isArray(sesiones) ? sesiones : [sesiones];
            
        } catch (error) {
            console.error('Error obteniendo sesiones:', error);
            throw error;
        }
    },
    
    // Obtener una sesión por ID
    obtenerSesion: async function(sessionId) {
        if (!this.sorobanServer) {
            throw new Error('Soroban RPC no está inicializado');
        }
        
        const contractId = TherapyConfig.therapyContractId;
        if (!contractId || contractId === 'CONTRACT_ID_AQUI') {
            throw new Error('Contrato de sesiones no configurado');
        }
        
        try {
            const testAccount = await this.horizonServer.getAccount(
                'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
            ).catch(async () => {
                const keypair = StellarSdk.Keypair.random();
                return {
                    accountId: keypair.publicKey(),
                    sequenceNumber: () => '0'
                };
            });
            
            const sessionIdScVal = StellarSdk.nativeToScVal(sessionId, { type: 'u32' });
            
            let transaction = new StellarSdk.TransactionBuilder(testAccount, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: TherapyConfig.getNetworkPassphrase()
            })
            .addOperation(
                StellarSdk.Operation.invokeContractFunction({
                    contract: contractId,
                    function: 'obtener_sesion',
                    args: [sessionIdScVal]
                })
            )
            .setTimeout(600)
            .build();
            
            const simulation = await this.sorobanServer.simulateTransaction(transaction);
            if (simulation.error) {
                throw new Error('Error en simulación: ' + JSON.stringify(simulation.error));
            }
            
            const scv = simulation.result?.retval ?? simulation.result?.returnValue ?? simulation.returnValue;
            if (!scv) {
                throw new Error('Sesión no encontrada');
            }
            
            return StellarSdk.scValToNative(scv);
            
        } catch (error) {
            console.error('Error obteniendo sesión:', error);
            throw error;
        }
    },
    
    // Obtener estadísticas del mes
    estadisticasMes: async function(mes, anio) {
        if (!this.sorobanServer) {
            throw new Error('Soroban RPC no está inicializado');
        }
        
        const contractId = TherapyConfig.therapyContractId;
        if (!contractId || contractId === 'CONTRACT_ID_AQUI') {
            throw new Error('Contrato de sesiones no configurado');
        }
        
        try {
            const testAccount = await this.horizonServer.getAccount(
                'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
            ).catch(async () => {
                const keypair = StellarSdk.Keypair.random();
                return {
                    accountId: keypair.publicKey(),
                    sequenceNumber: () => '0'
                };
            });
            
            const mesScVal = StellarSdk.nativeToScVal(mes, { type: 'u32' });
            const anioScVal = StellarSdk.nativeToScVal(anio, { type: 'u32' });
            
            let transaction = new StellarSdk.TransactionBuilder(testAccount, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: TherapyConfig.getNetworkPassphrase()
            })
            .addOperation(
                StellarSdk.Operation.invokeContractFunction({
                    contract: contractId,
                    function: 'estadisticas_mes',
                    args: [mesScVal, anioScVal]
                })
            )
            .setTimeout(600)
            .build();
            
            const simulation = await this.sorobanServer.simulateTransaction(transaction);
            if (simulation.error) {
                throw new Error('Error en simulación: ' + JSON.stringify(simulation.error));
            }
            
            const scv = simulation.result?.retval ?? simulation.result?.returnValue ?? simulation.returnValue;
            if (!scv) {
                return [0, 0, 0]; // [completadas, no_asistio, canceladas]
            }
            
            const stats = StellarSdk.scValToNative(scv);
            return Array.isArray(stats) ? stats : [stats];
            
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            throw error;
        }
    },
    
    // Helper: Esperar confirmación de transacción
    waitForTransaction: async function(hash, maxWait = 60000) {
        const start = Date.now();
        while (Date.now() - start < maxWait) {
            try {
                const tx = await this.sorobanServer.getTransaction(hash);
                if (tx.status === 'SUCCESS' || tx.status === 'FAILED') {
                    return tx;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        throw new Error('Timeout esperando confirmación de transacción');
    },
    
    // Helper: Extraer session ID de la respuesta
    extractSessionId: function(transactionResponse) {
        try {
            const returnValue = transactionResponse.returnValue || transactionResponse.result?.retval;
            if (returnValue) {
                const scv = StellarSdk.xdr.ScVal.fromXDR(returnValue, 'base64');
                const native = StellarSdk.scValToNative(scv);
                if (typeof native === 'object' && native.id) {
                    return Number(native.id);
                }
                if (typeof native === 'number') {
                    return native;
                }
            }
            return null;
        } catch (error) {
            console.warn('No se pudo extraer session ID:', error);
            return null;
        }
    }
};

