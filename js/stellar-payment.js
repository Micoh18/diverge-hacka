// Lógica de pagos con Stellar
const StellarPayment = {
    server: null,
    sourceKeypair: null,
    selectedCurrency: 'XLM',
    walletWatcher: null,
    connectedAddress: null,
    
    init: function() {
        this.setupEventListeners();
        this.initStellar();
        this.updateConversionInfo();
    },
    
    initStellar: function() {
        try {
            // Verificar que StellarSdk esté disponible
            if (typeof StellarSdk === 'undefined') {
                throw new Error('Stellar SDK no está cargado. Verifica la conexión a internet.');
            }
            
            // Diagnóstico: ver qué está disponible en StellarSdk
            console.log('StellarSdk disponible:', typeof StellarSdk);
            console.log('StellarSdk keys:', Object.keys(StellarSdk).slice(0, 20));
            console.log('StellarSdk.Server:', typeof StellarSdk.Server);
            console.log('StellarSdk.Horizon:', typeof StellarSdk.Horizon);
            
            const horizonUrl = StellarConfig.getHorizonUrl();
            
            // Intentar diferentes formas de inicializar Server según la versión del SDK
            if (typeof StellarSdk.Server === 'function') {
                // Forma estándar: StellarSdk.Server
                this.server = new StellarSdk.Server(horizonUrl, { allowHttp: StellarConfig.isTestnet() });
            } else if (StellarSdk.Horizon && typeof StellarSdk.Horizon.Server === 'function') {
                // Forma alternativa: StellarSdk.Horizon.Server
                this.server = new StellarSdk.Horizon.Server(horizonUrl, { allowHttp: StellarConfig.isTestnet() });
            } else {
                throw new Error('No se pudo encontrar Server en StellarSdk. Verifica la versión del SDK.');
            }
            
            console.log('Stellar inicializado correctamente:', horizonUrl);
        } catch (error) {
            console.error('Error al inicializar Stellar:', error);
            this.showMessage('Error al inicializar Stellar: ' + error.message, 'error');
        }
    },
    
    setupEventListeners: function() {
        // Selector de moneda
        document.querySelectorAll('.currency-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.currency-option').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedCurrency = e.target.dataset.currency;
                this.updateConversionInfo();
            });
        });
        
        // Botones de billetera
        document.getElementById('connectFreighter').addEventListener('click', () => this.connectFreighter());
        
        // Listener para campo de monto
        this.setupAmountListener();
        
        // Formulario
        document.getElementById('paymentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processPayment();
        });
    },
    
    updateConversionInfo: function() {
        const amount = parseFloat(document.getElementById('amount').value) || 0;
        if (amount > 0) {
            // Conversión aproximada (actualizar con API real si es necesario)
            const xlmToClp = 1000; // 1 XLM ≈ 1000 CLP (ejemplo)
            const usdcToClp = 950; // 1 USDC ≈ 950 CLP (ejemplo)
            
            const clpAmount = this.selectedCurrency === 'XLM' 
                ? (amount * xlmToClp).toFixed(0)
                : (amount * usdcToClp).toFixed(0);
            
            document.getElementById('conversionInfo').textContent = 
                `≈ $${clpAmount} CLP (referencia aproximada)`;
        } else {
            document.getElementById('conversionInfo').textContent = '';
        }
    },
    
    setupAmountListener: function() {
        document.getElementById('amount').addEventListener('input', () => this.updateConversionInfo());
    },
    
    // Verificar si estamos en contexto seguro (HTTPS o localhost)
    isSecureContext: function() {
        return window.location.protocol === 'https:' || 
               window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1';
    },
    
    connectFreighter: async function() {
        // 1. Verificar contexto seguro
        if (!this.isSecureContext()) {
            this.showMessage(
                'Freighter requiere HTTPS para funcionar en producción. ' +
                'Usa HTTPS o localhost para desarrollo.',
                'error'
            );
            return;
        }
        
        // 2. Esperar a que Freighter API esté disponible
        await this.waitForFreighterAPI();
        
        // 3. Verificar que Freighter API esté disponible
        if (!window.freighterApi && !window.freighter) {
            this.showMessage(
                'Freighter no está instalado. Por favor instálalo desde https://freighter.app',
                'error'
            );
            return;
        }
        
        try {
            // Usar window.freighter (alias) o window.freighterApi
            const freighter = window.freighter || window.freighterApi;
            
            // 4. Verificar si Freighter está conectado
            const isConnectedResult = await freighter.isConnected();
            if (!isConnectedResult) {
                throw new Error('Freighter no está conectado. Asegúrate de que la extensión esté activa.');
            }
            
            // 5. Solicitar acceso usando requestAccess()
            const accessResult = await freighter.requestAccess();
            
            if (accessResult.error) {
                if (accessResult.error.message) {
                    throw new Error(accessResult.error.message);
                }
                throw new Error('Acceso rechazado por el usuario');
            }
            
            if (!accessResult.address) {
                throw new Error('No se pudo obtener la dirección de la cuenta');
            }
            
            const publicKey = accessResult.address;
            
            // 6. Validar red usando getNetworkDetails()
            const networkDetails = await freighter.getNetworkDetails();
            if (networkDetails.error) {
                throw new Error(networkDetails.error);
            }
            
            const expectedPassphrase = StellarConfig.getNetworkPassphraseString();
            if (networkDetails.networkPassphrase !== expectedPassphrase) {
                const networkName = StellarConfig.network === 'testnet' ? 'Testnet' : 'Mainnet';
                throw new Error(
                    `Red incorrecta en Freighter. La aplicación requiere ${networkName}. ` +
                    `Por favor cambia la red en Freighter y vuelve a intentar.`
                );
            }
            
            // 7. Guardar información de conexión
            this.connectedAddress = publicKey;
            this.sourceKeypair = { publicKey: publicKey };
            
            // 8. Iniciar watcher para cambios de cuenta/red
            this.startWalletWatcher();
            
            // 9. Mostrar información de cuenta
            this.showAccountInfo(publicKey);
            this.showMessage('Freighter conectado exitosamente', 'success');
            
        } catch (error) {
            console.error('Error al conectar Freighter:', error);
            
            // Mensajes de error más específicos
            let errorMessage = 'Error al conectar Freighter: ';
            if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Error desconocido. Verifica que Freighter esté instalado y habilitado.';
            }
            
            this.showMessage(errorMessage, 'error');
        }
    },
    
    // Esperar a que Freighter API se cargue
    waitForFreighterAPI: function() {
        return new Promise((resolve) => {
            // Si ya está disponible
            if (window.freighterApi || window.freighter) {
                resolve(true);
                return;
            }
            
            // Escuchar evento de carga del módulo
            const handleFreighterReady = () => {
                window.removeEventListener('freighter-ready', handleFreighterReady);
                resolve(true);
            };
            
            window.addEventListener('freighter-ready', handleFreighterReady);
            
            // Timeout después de 5 segundos
            setTimeout(() => {
                window.removeEventListener('freighter-ready', handleFreighterReady);
                resolve(false);
            }, 5000);
        });
    },
    
    startWalletWatcher: function() {
        // Limpiar watcher anterior si existe
        if (this.walletWatcher) {
            if (this.walletWatcher.stop) {
                this.walletWatcher.stop();
            }
            this.walletWatcher = null;
        }
        
        // Iniciar nuevo watcher si la API está disponible
        const freighter = window.freighter || window.freighterApi;
        if (freighter && typeof freighter.on === 'function') {
            try {
                // Usar el sistema de eventos de Freighter si está disponible
                // Nota: La API puede variar, esto es un ejemplo básico
                // En producción, verifica la documentación actual de Freighter para el método correcto
                console.log('Watcher de Freighter iniciado');
            } catch (error) {
                console.warn('No se pudo iniciar el watcher de Freighter:', error);
            }
        }
    },
    
    disconnectWallet: function() {
        if (this.walletWatcher) {
            this.walletWatcher.stop();
            this.walletWatcher = null;
        }
        this.sourceKeypair = null;
        this.connectedAddress = null;
        document.getElementById('accountInfo').style.display = 'none';
        document.getElementById('submitPayment').disabled = true;
        
        // Deshabilitar botón de crear suscripción
        const createSubBtn = document.getElementById('createSubscriptionBtn');
        if (createSubBtn) {
            createSubBtn.disabled = true;
        }
        
        // Limpiar lista de suscripciones
        const subscriptionsContainer = document.getElementById('subscriptions-container');
        if (subscriptionsContainer) {
            subscriptionsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>Conecta tu billetera para ver tus suscripciones</p>
                </div>
            `;
        }
    },
    
    showAccountInfo: function(publicKey) {
        document.getElementById('accountInfo').style.display = 'block';
        document.getElementById('accountAddress').textContent = publicKey;
        document.getElementById('submitPayment').disabled = false;
        this.checkAccountBalance(publicKey);
        
        // Habilitar botón de crear suscripción si existe
        const createSubBtn = document.getElementById('createSubscriptionBtn');
        if (createSubBtn) {
            createSubBtn.disabled = false;
        }
        
        // Cargar suscripciones del usuario si está en el tab de suscripciones
        if (typeof loadUserSubscriptions === 'function') {
            loadUserSubscriptions();
        }
    },
    
    checkAccountBalance: async function(publicKey) {
        try {
            const account = await this.server.loadAccount(publicKey);
            const xlmBalance = account.balances.find(b => b.asset_type === 'native');
            const balance = xlmBalance ? parseFloat(xlmBalance.balance).toFixed(2) : '0.00';
            document.getElementById('accountBalance').textContent = balance + ' XLM';
        } catch (error) {
            document.getElementById('accountBalance').textContent = 'Error al cargar';
        }
    },
    
    async processPayment() {
        const amount = parseFloat(document.getElementById('amount').value);
        const memo = document.getElementById('memo').value;
        
        if (!amount || amount < StellarConfig.minAmount) {
            this.showMessage(`El monto mínimo es ${StellarConfig.minAmount} ${this.selectedCurrency}`, 'error');
            return;
        }
        
        if (!this.sourceKeypair) {
            this.showMessage('Por favor conecta una billetera primero', 'error');
            return;
        }
        
        try {
            this.showMessage('Procesando pago...', 'info');
            document.getElementById('submitPayment').disabled = true;
            document.getElementById('submitPayment').innerHTML = '<span class="loading"></span> Procesando...';
            
            await this.createAndSubmitPayment(amount, memo);
        } catch (error) {
            this.showMessage('Error al procesar pago: ' + error.message, 'error');
            document.getElementById('submitPayment').disabled = false;
            document.getElementById('submitPayment').textContent = 'Procesar Pago';
        }
    },
    
    async createAndSubmitPayment(amount, memo) {
        const sourcePublicKey = this.sourceKeypair.publicKey || this.sourceKeypair;
        
        // Cargar cuenta fuente
        const sourceAccount = await this.server.loadAccount(sourcePublicKey);
        
        // Construir transacción
        let transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: StellarConfig.getNetworkPassphrase()
        });
        
        // Agregar pago
        const destination = StellarConfig.destinationAccount;
        
        // Validar que la dirección destino sea válida
        if (!destination || destination.length !== 56 || !destination.startsWith('G')) {
            throw new Error('Dirección destino inválida. Verifica la configuración.');
        }
        
        // Validar formato de dirección Stellar
        if (typeof StellarSdk.StrKey !== 'undefined' && !StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
            throw new Error('Dirección destino no es una dirección Stellar válida.');
        }
        
        let asset;
        
        if (this.selectedCurrency === 'USDC') {
            // USDC en Stellar (issuer principal)
            asset = new StellarSdk.Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5e34M4PARS');
        } else {
            // XLM (nativo)
            asset = StellarSdk.Asset.native();
        }
        
        transaction = transaction.addOperation(
            StellarSdk.Operation.payment({
                destination: destination,
                asset: asset,
                amount: amount.toString()
            })
        );
        
        // Agregar memo si existe
        if (memo && memo.trim()) {
            transaction = transaction.addMemo(StellarSdk.Memo.text(memo.substring(0, 28))); // Max 28 chars
        }
        
        transaction = transaction.setTimeout(30).build();
        
        // Validar red antes de firmar
        const freighter = window.freighter || window.freighterApi;
        if (this.connectedAddress && freighter) {
            try {
                const networkDetails = await freighter.getNetworkDetails();
                if (networkDetails.error) {
                    throw new Error(networkDetails.error);
                }
                
                const expectedPassphrase = StellarConfig.getNetworkPassphraseString();
                if (networkDetails.networkPassphrase !== expectedPassphrase) {
                    const networkName = StellarConfig.network === 'testnet' ? 'Testnet' : 'Mainnet';
                    throw new Error(
                        `Red incorrecta en Freighter. La aplicación requiere ${networkName}. ` +
                        `Por favor cambia la red en Freighter.`
                    );
                }
            } catch (error) {
                if (error.message && error.message.includes('Red incorrecta')) {
                    throw error;
                }
                console.warn('No se pudo validar la red antes de firmar:', error);
            }
        }
        
        // Firmar transacción con Freighter
        if (this.sourceKeypair && this.sourceKeypair.publicKey && !this.sourceKeypair.secretKey) {
            if (!freighter) {
                throw new Error('No se puede firmar la transacción. Freighter API no está disponible.');
            }
            
            try {
                const networkPassphrase = StellarConfig.getNetworkPassphraseString();
                const xdr = transaction.toXDR();
                
                // Usar signTransaction() de Freighter API
                const signResult = await freighter.signTransaction(xdr, {
                    networkPassphrase: networkPassphrase,
                    accountToSign: this.sourceKeypair.publicKey
                });
                
                if (signResult.error) {
                    if (signResult.error.message) {
                        throw new Error(signResult.error.message);
                    }
                    throw new Error('Error al firmar la transacción');
                }
                
                // Obtener XDR firmada (puede venir en diferentes propiedades)
                const signedXdr = signResult.signedTransaction || signResult.signedTxXdr || signResult.signedXDR;
                if (!signedXdr) {
                    throw new Error('Freighter no retornó XDR firmada');
                }
                
                // Reconstruir transacción firmada
                transaction = new StellarSdk.Transaction(signedXdr, StellarConfig.getNetworkPassphrase());
            } catch (error) {
                // Manejar errores específicos
                if (error.message && (error.message.includes('User rejected') || error.message.includes('rechazado'))) {
                    throw new Error('Firma rechazada por el usuario');
                } else if (error.message && error.message.includes('network')) {
                    throw error; // Ya tiene un mensaje de red incorrecta
                } else {
                    throw new Error('Error al firmar con Freighter: ' + (error.message || 'Error desconocido'));
                }
            }
        } else {
            throw new Error('No se puede firmar la transacción. Conecta Freighter primero.');
        }
        
        // Enviar transacción
        const result = await this.server.submitTransaction(transaction);
        
        // Mostrar éxito
        const hash = result.hash;
        const explorerUrl = StellarConfig.isTestnet()
            ? `https://stellar.expert/explorer/testnet/tx/${hash}`
            : `https://stellar.expert/explorer/public/tx/${hash}`;
        
        this.showMessage(
            `¡Pago exitoso! Hash: <div class="transaction-hash"><a href="${explorerUrl}" target="_blank">${hash}</a></div>`,
            'success'
        );
        
        // Resetear formulario (mantener conexión de wallet)
        document.getElementById('paymentForm').reset();
        // No desconectar la wallet después del pago exitoso
        // this.disconnectWallet(); // Comentado para mantener la conexión
    },
    
    showMessage: function(message, type) {
        const msgEl = document.getElementById('statusMessage');
        msgEl.className = 'status-message ' + type;
        msgEl.innerHTML = message;
        
        if (type === 'success') {
            setTimeout(() => {
                msgEl.className = 'status-message';
                msgEl.innerHTML = '';
            }, 10000);
        }
    }
};

