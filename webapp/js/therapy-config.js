// Configuración del contrato de sesiones terapéuticas DIVERGE
// 
// IMPORTANTE: Configurar el ID del contrato cuando esté desplegado
//
const TherapyConfig = {
    // Red (reutilizar de StellarConfig o configurar aquí)
    network: 'testnet',
    
    // URLs de Soroban RPC
    sorobanRpcUrls: {
        testnet: 'https://soroban-testnet.stellar.org',
        mainnet: 'https://soroban-rpc.mainnet.stellar.org'
    },
    
    // ID del contrato de sesiones terapéuticas (Soroban)
    // Contrato "DivergeProofOfService" desplegado en testnet
    therapyContractId: 'CDPXKROEYGEWENYC4FTXOOALCLMTFPLV5I4WROTOGDWRF5GAJ2LQGMS3',
    
    // URL del backend API que maneja las transacciones con el contrato
    // IMPORTANTE: Configurar con la URL real del backend cuando esté disponible
    backendApiUrl: 'http://localhost:3000/api', // Cambiar en producción
    
    // Salt para generar Address desde nombre del beneficiario
    // Debe ser el mismo que se use en el contrato/backend
    beneficiarySalt: 'DIVERGE_SALT',
    
    // Obtener URL de Soroban RPC según la red
    getSorobanRpcUrl: function() {
        return this.sorobanRpcUrls[this.network];
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
    
    // Obtener networkPassphrase como string (útil para el backend)
    getNetworkPassphraseString: function() {
        if (typeof StellarSdk === 'undefined') {
            // Si StellarSdk no está cargado, retornar string directamente
            return this.network === 'testnet' 
                ? 'Test SDF Network ; September 2015'
                : 'Public Global Stellar Network ; September 2015';
        }
        return this.network === 'testnet' 
            ? StellarSdk.Networks.TESTNET 
            : StellarSdk.Networks.PUBLIC;
    }
};

