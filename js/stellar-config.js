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
    destinationAccount: 'GDEXAMPLE1234567890123456789012345678901234567890',
    
    // Montos mínimos y máximos (en XLM)
    minAmount: 0.1,
    maxAmount: 10000,
    
    // Obtener URL de Horizon según la red
    getHorizonUrl: function() {
        return this.horizonUrls[this.network];
    },
    
    // Obtener configuración de red para Stellar SDK
    getNetworkPassphrase: function() {
        return this.network === 'testnet' 
            ? StellarSdk.Networks.TESTNET 
            : StellarSdk.Networks.PUBLIC;
    },
    
    // Verificar si estamos en testnet
    isTestnet: function() {
        return this.network === 'testnet';
    }
};

