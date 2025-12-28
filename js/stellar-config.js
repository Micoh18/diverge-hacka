// Configuración de Stellar
// 
// INSTRUCCIONES PARA PRODUCCIÓN:
// 1. Crear una cuenta Stellar para la Corporación El Trampolín
//    - Testnet: https://laboratory.stellar.org/#account-creator?network=test
//    - Mainnet: Usar Stellar Laboratory o billetera (Freighter, Lobstr, etc.)
// 2. Reemplazar 'destinationAccount' con la clave pública de la cuenta
// 3. Cambiar 'network' a 'mainnet' cuando esté listo para producción
// 4. Fondear la cuenta con XLM (mínimo 1 XLM para activar)
//
const StellarConfig = {
    // Cambiar a 'mainnet' para producción
    network: 'testnet',
    
    // Servidores Horizon
    horizonUrls: {
        testnet: 'https://horizon-testnet.stellar.org',
        mainnet: 'https://horizon.stellar.org'
    },
    
    // Cuenta destino de la Corporación El Trampolín
    // IMPORTANTE: Reemplazar con la cuenta real en producción
    // Formato: G seguido de 56 caracteres alfanuméricos
    destinationAccount: 'GBVPBV47W65WHV7KLUDUTMMIGJAOPIYVQJDVPYD6NOIZVO5LN6KPYJX7',
    
    // Montos mínimos y máximos (en XLM)
    minAmount: 0.1,
    maxAmount: 10000,
    
    // Configuración de Soroban RPC
    sorobanRpcUrls: {
        testnet: 'https://soroban-testnet.stellar.org',
        mainnet: 'https://soroban-rpc.mainnet.stellar.org'
    },
    
    // ID del contrato de suscripciones (Soroban)
    // IMPORTANTE: Reemplazar con el ID real del contrato desplegado
    subscriptionContractId: 'CONTRACT_ID_AQUI',
    
    // Obtener URL de Soroban RPC según la red
    getSorobanRpcUrl: function() {
        return this.sorobanRpcUrls[this.network];
    },
    
    // Obtener URL de Horizon según la red
    getHorizonUrl: function() {
        return this.horizonUrls[this.network];
    },
    
    // Obtener configuración de red para Stellar SDK
    getNetworkPassphrase: function() {
        if (typeof StellarSdk === 'undefined') {
            throw new Error('Stellar SDK no está cargado');
        }
        return this.network === 'testnet' 
            ? StellarSdk.Networks.TESTNET 
            : StellarSdk.Networks.PUBLIC;
    },
    
    // Verificar si estamos en testnet
    isTestnet: function() {
        return this.network === 'testnet';
    },
    
    // Obtener networkPassphrase como string para comparación con Freighter
    getNetworkPassphraseString: function() {
        if (typeof StellarSdk === 'undefined') {
            throw new Error('Stellar SDK no está cargado');
        }
        return this.network === 'testnet' 
            ? StellarSdk.Networks.TESTNET 
            : StellarSdk.Networks.PUBLIC;
    }
};

