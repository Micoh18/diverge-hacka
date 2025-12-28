// Lógica de suscripciones mensuales con contrato Soroban
const StellarSubscription = {
    sorobanServer: null,
    connectedAddress: null,
    
    init: function() {
        this.initSoroban();
    },
    
    initSoroban: function() {
        try {
            // Verificar que StellarSdk esté disponible
            if (typeof StellarSdk === 'undefined') {
                throw new Error('Stellar SDK no está cargado');
            }
            
            // Verificar que SorobanRpc esté disponible
            if (!StellarSdk.SorobanRpc || !StellarSdk.SorobanRpc.Server) {
                console.warn('SorobanRpc no está disponible en esta versión del SDK');
                return;
            }
            
            const sorobanRpcUrl = StellarConfig.getSorobanRpcUrl();
            this.sorobanServer = new StellarSdk.SorobanRpc.Server(sorobanRpcUrl, { allowHttp: StellarConfig.isTestnet() });
            console.log('Soroban RPC inicializado:', sorobanRpcUrl);
        } catch (error) {
            console.error('Error al inicializar Soroban:', error);
        }
    },
    
    // Establecer dirección conectada (desde StellarPayment)
    setConnectedAddress: function(address) {
        this.connectedAddress = address;
    },
    
    // Crear nueva suscripción
    createSubscription: async function(amount, startDate = null) {
        if (!this.connectedAddress) {
            throw new Error('Conecta tu billetera primero');
        }
        
        if (!this.sorobanServer) {
            throw new Error('Soroban RPC no está inicializado');
        }
        
        const contractId = StellarConfig.subscriptionContractId;
        if (!contractId || contractId === 'CONTRACT_ID_AQUI') {
            throw new Error('Contrato de suscripciones no configurado. Contacta al administrador.');
        }
        
        try {
            // Obtener cuenta del usuario usando el servidor de StellarPayment
            if (!StellarPayment || !StellarPayment.server) {
                throw new Error('Servidor Stellar no está inicializado');
            }
            const account = await StellarPayment.server.getAccount(this.connectedAddress);
            
            // Convertir monto a stroops (1 XLM = 10,000,000 stroops)
            const amountStroops = BigInt(Math.round(amount * 10000000));
            
            // Fecha de inicio (si no se proporciona, usar fecha actual)
            const startTimestamp = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : Math.floor(Date.now() / 1000);
            
            // Construir argumentos para el contrato
            const userAddress = StellarSdk.Address.fromString(this.connectedAddress);
            const destinationAddress = StellarSdk.Address.fromString(StellarConfig.destinationAccount);
            
            const userScVal = StellarSdk.nativeToScVal(userAddress, { type: 'address' });
            const destinationScVal = StellarSdk.nativeToScVal(destinationAddress, { type: 'address' });
            const amountScVal = StellarSdk.nativeToScVal(amountStroops, { type: 'i128' });
            const startDateScVal = StellarSdk.nativeToScVal(startTimestamp, { type: 'u64' });
            
            // Construir transacción
            let transaction = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: StellarConfig.getNetworkPassphrase()
            })
            .addOperation(
                StellarSdk.Operation.invokeContractFunction({
                    contract: contractId,
                    function: 'create_subscription',
                    args: [userScVal, destinationScVal, amountScVal, startDateScVal]
                })
            )
            .setTimeout(600)
            .build();
            
            // Simular transacción
            const simulation = await this.sorobanServer.simulateTransaction(transaction);
            if (simulation.error) {
                throw new Error('Error en simulación: ' + simulation.error);
            }
            
            // Preparar transacción
            transaction = await this.sorobanServer.prepareTransaction(transaction);
            
            // Firmar con Freighter
            const freighter = window.freighter || window.freighterApi;
            if (!freighter) {
                throw new Error('Freighter no está disponible');
            }
            
            const signResult = await freighter.signTransaction(transaction.toXDR(), {
                networkPassphrase: StellarConfig.getNetworkPassphraseString(),
                accountToSign: this.connectedAddress
            });
            
            if (signResult.error) {
                throw new Error(signResult.error);
            }
            
            const signedXdr = signResult.signedTransaction || signResult.signedTxXdr || signResult.signedXDR;
            if (!signedXdr) {
                throw new Error('No se recibió XDR firmada');
            }
            
            // Enviar transacción
            const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarConfig.getNetworkPassphrase());
            const response = await this.sorobanServer.sendTransaction(transactionToSubmit);
            
            if (response.status === 'PENDING') {
                // Esperar confirmación
                const final = await this.waitForTransaction(response.hash);
                if (final.status !== 'SUCCESS') {
                    throw new Error('La transacción falló: ' + final.status);
                }
                return this.extractSubscriptionId(final);
            } else if (response.status !== 'SUCCESS') {
                throw new Error('La transacción no fue aceptada: ' + response.status);
            }
            
            return this.extractSubscriptionId(response);
            
        } catch (error) {
            console.error('Error creando suscripción:', error);
            throw error;
        }
    },
    
    // Obtener suscripciones activas del usuario
    getUserSubscriptions: async function() {
        if (!this.connectedAddress) {
            throw new Error('Conecta tu billetera primero');
        }
        
        if (!this.sorobanServer) {
            throw new Error('Soroban RPC no está inicializado');
        }
        
        const contractId = StellarConfig.subscriptionContractId;
        if (!contractId || contractId === 'CONTRACT_ID_AQUI') {
            throw new Error('Contrato de suscripciones no configurado');
        }
        
        try {
            if (!StellarPayment || !StellarPayment.server) {
                throw new Error('Servidor Stellar no está inicializado');
            }
            const account = await StellarPayment.server.getAccount(this.connectedAddress);
            const userAddress = StellarSdk.Address.fromString(this.connectedAddress);
            const userScVal = StellarSdk.nativeToScVal(userAddress, { type: 'address' });
            
            let transaction = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: StellarConfig.getNetworkPassphrase()
            })
            .addOperation(
                StellarSdk.Operation.invokeContractFunction({
                    contract: contractId,
                    function: 'get_user_subscriptions',
                    args: [userScVal]
                })
            )
            .setTimeout(600)
            .build();
            
            const simulation = await this.sorobanServer.simulateTransaction(transaction);
            if (simulation.error) {
                throw new Error('Error en simulación: ' + simulation.error);
            }
            
            // Decodificar resultado
            const scv = simulation.result?.retval ?? simulation.result?.returnValue ?? simulation.returnValue;
            if (!scv) {
                return []; // No hay suscripciones
            }
            
            const subscriptions = StellarSdk.scValToNative(scv);
            return Array.isArray(subscriptions) ? subscriptions : [subscriptions];
            
        } catch (error) {
            console.error('Error obteniendo suscripciones:', error);
            throw error;
        }
    },
    
    // Cancelar suscripción
    cancelSubscription: async function(subscriptionId) {
        if (!this.connectedAddress) {
            throw new Error('Conecta tu billetera primero');
        }
        
        if (!this.sorobanServer) {
            throw new Error('Soroban RPC no está inicializado');
        }
        
        const contractId = StellarConfig.subscriptionContractId;
        if (!contractId || contractId === 'CONTRACT_ID_AQUI') {
            throw new Error('Contrato de suscripciones no configurado');
        }
        
        try {
            if (!StellarPayment || !StellarPayment.server) {
                throw new Error('Servidor Stellar no está inicializado');
            }
            const account = await StellarPayment.server.getAccount(this.connectedAddress);
            const userAddress = StellarSdk.Address.fromString(this.connectedAddress);
            
            const subscriptionIdScVal = StellarSdk.nativeToScVal(subscriptionId, { type: 'u32' });
            const userScVal = StellarSdk.nativeToScVal(userAddress, { type: 'address' });
            
            let transaction = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: StellarConfig.getNetworkPassphrase()
            })
            .addOperation(
                StellarSdk.Operation.invokeContractFunction({
                    contract: contractId,
                    function: 'cancel_subscription',
                    args: [subscriptionIdScVal, userScVal]
                })
            )
            .setTimeout(600)
            .build();
            
            const simulation = await this.sorobanServer.simulateTransaction(transaction);
            if (simulation.error) {
                throw new Error('Error en simulación: ' + simulation.error);
            }
            
            transaction = await this.sorobanServer.prepareTransaction(transaction);
            
            // Firmar con Freighter
            const freighter = window.freighter || window.freighterApi;
            const signResult = await freighter.signTransaction(transaction.toXDR(), {
                networkPassphrase: StellarConfig.getNetworkPassphraseString(),
                accountToSign: this.connectedAddress
            });
            
            if (signResult.error) {
                throw new Error(signResult.error);
            }
            
            const signedXdr = signResult.signedTransaction || signResult.signedTxXdr || signResult.signedXDR;
            const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarConfig.getNetworkPassphrase());
            const response = await this.sorobanServer.sendTransaction(transactionToSubmit);
            
            if (response.status === 'PENDING') {
                const final = await this.waitForTransaction(response.hash);
                if (final.status !== 'SUCCESS') {
                    throw new Error('La transacción falló: ' + final.status);
                }
                return true;
            } else if (response.status !== 'SUCCESS') {
                throw new Error('La transacción no fue aceptada: ' + response.status);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error cancelando suscripción:', error);
            throw error;
        }
    },
    
    // Obtener historial de pagos de una suscripción
    getPaymentHistory: async function(subscriptionId) {
        if (!this.connectedAddress) {
            throw new Error('Conecta tu billetera primero');
        }
        
        if (!this.sorobanServer) {
            throw new Error('Soroban RPC no está inicializado');
        }
        
        const contractId = StellarConfig.subscriptionContractId;
        if (!contractId || contractId === 'CONTRACT_ID_AQUI') {
            throw new Error('Contrato de suscripciones no configurado');
        }
        
        try {
            if (!StellarPayment || !StellarPayment.server) {
                throw new Error('Servidor Stellar no está inicializado');
            }
            const account = await StellarPayment.server.getAccount(this.connectedAddress);
            const subscriptionIdScVal = StellarSdk.nativeToScVal(subscriptionId, { type: 'u32' });
            
            let transaction = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: StellarConfig.getNetworkPassphrase()
            })
            .addOperation(
                StellarSdk.Operation.invokeContractFunction({
                    contract: contractId,
                    function: 'get_payment_history',
                    args: [subscriptionIdScVal]
                })
            )
            .setTimeout(600)
            .build();
            
            const simulation = await this.sorobanServer.simulateTransaction(transaction);
            if (simulation.error) {
                throw new Error('Error en simulación: ' + simulation.error);
            }
            
            const scv = simulation.result?.retval ?? simulation.result?.returnValue ?? simulation.returnValue;
            if (!scv) {
                return []; // No hay historial
            }
            
            const history = StellarSdk.scValToNative(scv);
            return Array.isArray(history) ? history : [history];
            
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            throw error;
        }
    },
    
    // Procesar pago mensual manual (si el contrato lo requiere)
    processMonthlyPayment: async function(subscriptionId) {
        if (!this.connectedAddress) {
            throw new Error('Conecta tu billetera primero');
        }
        
        if (!this.sorobanServer) {
            throw new Error('Soroban RPC no está inicializado');
        }
        
        const contractId = StellarConfig.subscriptionContractId;
        if (!contractId || contractId === 'CONTRACT_ID_AQUI') {
            throw new Error('Contrato de suscripciones no configurado');
        }
        
        try {
            if (!StellarPayment || !StellarPayment.server) {
                throw new Error('Servidor Stellar no está inicializado');
            }
            const account = await StellarPayment.server.getAccount(this.connectedAddress);
            const subscriptionIdScVal = StellarSdk.nativeToScVal(subscriptionId, { type: 'u32' });
            
            let transaction = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: StellarConfig.getNetworkPassphrase()
            })
            .addOperation(
                StellarSdk.Operation.invokeContractFunction({
                    contract: contractId,
                    function: 'process_payment',
                    args: [subscriptionIdScVal]
                })
            )
            .setTimeout(600)
            .build();
            
            const simulation = await this.sorobanServer.simulateTransaction(transaction);
            if (simulation.error) {
                throw new Error('Error en simulación: ' + simulation.error);
            }
            
            transaction = await this.sorobanServer.prepareTransaction(transaction);
            
            // Firmar con Freighter
            const freighter = window.freighter || window.freighterApi;
            const signResult = await freighter.signTransaction(transaction.toXDR(), {
                networkPassphrase: StellarConfig.getNetworkPassphraseString(),
                accountToSign: this.connectedAddress
            });
            
            if (signResult.error) {
                throw new Error(signResult.error);
            }
            
            const signedXdr = signResult.signedTransaction || signResult.signedTxXdr || signResult.signedXDR;
            const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarConfig.getNetworkPassphrase());
            const response = await this.sorobanServer.sendTransaction(transactionToSubmit);
            
            if (response.status === 'PENDING') {
                const final = await this.waitForTransaction(response.hash);
                if (final.status !== 'SUCCESS') {
                    throw new Error('La transacción falló: ' + final.status);
                }
                return final.hash;
            } else if (response.status !== 'SUCCESS') {
                throw new Error('La transacción no fue aceptada: ' + response.status);
            }
            
            return response.hash;
            
        } catch (error) {
            console.error('Error procesando pago mensual:', error);
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
    
    // Helper: Extraer subscription ID de la respuesta de la transacción
    extractSubscriptionId: function(transactionResponse) {
        try {
            // Intentar extraer del returnValue
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
            
            // Fallback: buscar en eventos
            // Nota: Esto requeriría acceso a eventos, que puede no estar disponible inmediatamente
            return null;
        } catch (error) {
            console.warn('No se pudo extraer subscription ID:', error);
            return null;
        }
    },
    
    // Mostrar mensaje (reutilizar de StellarPayment)
    showMessage: function(message, type) {
        if (typeof StellarPayment !== 'undefined' && StellarPayment.showMessage) {
            StellarPayment.showMessage(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
};

