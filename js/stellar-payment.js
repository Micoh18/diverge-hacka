// Lógica de pagos con Stellar
const StellarPayment = {
    server: null,
    sourceKeypair: null,
    selectedCurrency: 'XLM',
    
    init: function() {
        this.setupEventListeners();
        this.initStellar();
        this.updateConversionInfo();
    },
    
    initStellar: function() {
        try {
            const horizonUrl = StellarConfig.getHorizonUrl();
            this.server = new StellarSdk.Server(horizonUrl);
            console.log('Stellar inicializado:', horizonUrl);
        } catch (error) {
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
        document.getElementById('connectLobstr').addEventListener('click', () => this.connectLobstr());
        document.getElementById('manualPayment').addEventListener('click', () => this.showManualInput());
        
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
    
    connectFreighter: async function() {
        // Verificar si Freighter está disponible
        if (typeof window.freighterApi === 'undefined') {
            // Intentar cargar Freighter API
            try {
                await window.freighterApi?.isConnected();
            } catch (e) {
                this.showMessage('Freighter no está instalado. Por favor instálalo desde https://freighter.app', 'error');
                return;
            }
        }
        
        try {
            const isConnected = await window.freighterApi.isConnected();
            let publicKey;
            
            if (isConnected) {
                publicKey = await window.freighterApi.getPublicKey();
            } else {
                publicKey = await window.freighterApi.connect();
            }
            
            this.sourceKeypair = { publicKey: publicKey };
            this.showAccountInfo(publicKey);
            this.showMessage('Freighter conectado exitosamente', 'success');
        } catch (error) {
            this.showMessage('Error al conectar Freighter: ' + error.message, 'error');
        }
    },
    
    connectLobstr: function() {
        this.showMessage('Integración con Lobstr próximamente. Por ahora usa Freighter o ingresa clave manualmente (solo testnet).', 'info');
    },
    
    showManualInput: function() {
        if (!StellarConfig.isTestnet()) {
            this.showMessage('La entrada manual solo está disponible en testnet por seguridad.', 'error');
            return;
        }
        
        const privateKey = prompt('Ingresa tu clave privada (solo testnet):');
        if (!privateKey) return;
        
        try {
            const keypair = StellarSdk.Keypair.fromSecret(privateKey);
            this.sourceKeypair = keypair;
            this.showAccountInfo(keypair.publicKey());
            this.showMessage('Cuenta conectada (testnet)', 'success');
        } catch (error) {
            this.showMessage('Clave privada inválida: ' + error.message, 'error');
        }
    },
    
    showAccountInfo: function(publicKey) {
        document.getElementById('accountInfo').style.display = 'block';
        document.getElementById('accountAddress').textContent = publicKey;
        document.getElementById('submitPayment').disabled = false;
        this.checkAccountBalance(publicKey);
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
        
        // Firmar transacción
        if (typeof window.freighterApi !== 'undefined' && this.sourceKeypair.publicKey && !this.sourceKeypair.secretKey) {
            // Firmar con Freighter
            try {
                const signedXdr = await window.freighterApi.signTransaction(transaction.toXDR(), {
                    network: StellarConfig.network,
                    accountToSign: this.sourceKeypair.publicKey
                });
                transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarConfig.getNetworkPassphrase());
            } catch (error) {
                throw new Error('Error al firmar con Freighter: ' + error.message);
            }
        } else if (this.sourceKeypair.secretKey) {
            // Firmar con clave privada (solo testnet)
            transaction.sign(this.sourceKeypair);
        } else {
            throw new Error('No se puede firmar la transacción. Conecta una billetera.');
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
        
        // Resetear formulario
        document.getElementById('paymentForm').reset();
        document.getElementById('accountInfo').style.display = 'none';
        document.getElementById('submitPayment').disabled = true;
        document.getElementById('submitPayment').textContent = 'Procesar Pago';
        this.sourceKeypair = null;
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

