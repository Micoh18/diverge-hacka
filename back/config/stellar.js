/**
 * Configuración de conexión a Stellar Soroban
 */
import { SorobanRpc, Contract, Networks, Keypair, xdr } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configuración desde variables de entorno
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;
const CONTRACT_ID = process.env.CONTRACT_ID;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const THERAPIST_SECRET = process.env.THERAPIST_SECRET;

// Instancia del servidor Soroban RPC
let sorobanServer = null;
let contract = null;
let adminKeypair = null;
let therapistKeypair = null;

/**
 * Inicializa la conexión a Soroban RPC
 */
export function initSoroban() {
    try {
        sorobanServer = new SorobanRpc.Server(SOROBAN_RPC_URL, {
            allowHttp: true // Permitir HTTP en testnet
        });
        
        console.log('✅ Soroban RPC conectado:', SOROBAN_RPC_URL);
        
        // Crear instancia del contrato
        if (CONTRACT_ID) {
            contract = new Contract(CONTRACT_ID);
            console.log('✅ Contrato inicializado:', CONTRACT_ID);
        } else {
            console.warn('⚠️  CONTRACT_ID no configurado en .env');
        }
        
        // Inicializar keypairs si están configurados
        if (ADMIN_SECRET) {
            try {
                adminKeypair = Keypair.fromSecret(ADMIN_SECRET);
                console.log('✅ Admin keypair inicializado:', adminKeypair.publicKey());
            } catch (error) {
                console.warn('⚠️  Error al inicializar admin keypair:', error.message);
            }
        }
        
        if (THERAPIST_SECRET) {
            try {
                therapistKeypair = Keypair.fromSecret(THERAPIST_SECRET);
                console.log('✅ Terapeuta keypair inicializado:', therapistKeypair.publicKey());
            } catch (error) {
                console.warn('⚠️  Error al inicializar terapeuta keypair:', error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Error al inicializar Soroban:', error);
        throw error;
    }
}

/**
 * Obtiene la instancia del servidor Soroban RPC
 * @returns {SorobanRpc.Server} - Instancia del servidor
 */
export function getSorobanServer() {
    if (!sorobanServer) {
        throw new Error('Soroban RPC no está inicializado. Llama a initSoroban() primero.');
    }
    return sorobanServer;
}

/**
 * Obtiene la instancia del contrato
 * @returns {Contract} - Instancia del contrato
 */
export function getContract() {
    if (!contract) {
        throw new Error('Contrato no está inicializado. Verifica CONTRACT_ID en .env');
    }
    return contract;
}

/**
 * Obtiene el network passphrase
 * @returns {string} - Network passphrase
 */
export function getNetworkPassphrase() {
    return NETWORK_PASSPHRASE;
}

/**
 * Obtiene el keypair del admin
 * @returns {Keypair|null} - Keypair del admin o null si no está configurado
 */
export function getAdminKeypair() {
    return adminKeypair;
}

/**
 * Obtiene el keypair del terapeuta (modo custodial)
 * @returns {Keypair|null} - Keypair del terapeuta o null si no está configurado
 */
export function getTherapistKeypair() {
    return therapistKeypair;
}

/**
 * Crea un keypair desde una secret key
 * @param {string} secret - Secret key (formato S...)
 * @returns {Keypair} - Keypair creado
 */
export function createKeypairFromSecret(secret) {
    if (!secret || !secret.startsWith('S')) {
        throw new Error('Secret key inválida. Debe empezar con "S"');
    }
    return Keypair.fromSecret(secret);
}

/**
 * Obtiene la cuenta de una dirección pública
 * @param {string} publicKey - Clave pública (formato G...)
 * @returns {Promise<object>} - Información de la cuenta
 */
export async function getAccount(publicKey) {
    const server = getSorobanServer();
    return await server.getAccount(publicKey);
}

// Exportar configuración
export const config = {
    SOROBAN_RPC_URL,
    NETWORK_PASSPHRASE,
    CONTRACT_ID,
    hasAdmin: !!adminKeypair,
    hasTherapist: !!therapistKeypair
};

