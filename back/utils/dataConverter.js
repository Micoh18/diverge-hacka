/**
 * Utilidades para conversión de datos entre formato humano y formato blockchain
 */

/**
 * Convierte un string de texto a representación hexadecimal (Bytes)
 * @param {string} text - Texto a convertir
 * @returns {string} - Representación hexadecimal del texto
 */
export function textToBytes(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('textToBytes: Se requiere un string válido');
    }
    return Buffer.from(text, 'utf8').toString('hex');
}

/**
 * Convierte un string hexadecimal a Buffer
 * Helper para crear ScVal Bytes más fácilmente
 * @param {string} hexString - String hexadecimal
 * @returns {Buffer} - Buffer del string hexadecimal
 */
export function hexToBuffer(hexString) {
    if (!hexString || typeof hexString !== 'string') {
        throw new Error('hexToBuffer: Se requiere un string hexadecimal válido');
    }
    return Buffer.from(hexString, 'hex');
}

/**
 * Convierte mes y año a formato yyyymm (u32)
 * @param {number} month - Mes (1-12)
 * @param {number} year - Año (ej: 2025)
 * @returns {number} - Formato yyyymm como número (ej: 202512)
 */
export function formatDateToYYMM(month, year) {
    if (!month || month < 1 || month > 12) {
        throw new Error('formatDateToYYMM: Mes debe estar entre 1 y 12');
    }
    if (!year || year < 2000 || year > 2100) {
        throw new Error('formatDateToYYMM: Año debe estar entre 2000 y 2100');
    }
    
    // Formato: yyyymm (ej: 202512 para diciembre 2025)
    return parseInt(`${year}${String(month).padStart(2, '0')}`);
}

/**
 * Valida que un string sea un PIN válido
 * @param {string} pin - PIN a validar
 * @returns {boolean} - true si es válido
 */
export function validatePin(pin) {
    if (!pin || typeof pin !== 'string') {
        return false;
    }
    const pinTrimmed = pin.trim();
    // PIN debe ser solo números, entre 1 y 6 dígitos
    const pinRegex = /^\d{1,6}$/;
    return pinRegex.test(pinTrimmed);
}

/**
 * Valida que un nombre sea válido
 * @param {string} name - Nombre a validar
 * @returns {boolean} - true si es válido
 */
export function validateName(name) {
    if (!name || typeof name !== 'string') {
        return false;
    }
    const nameTrimmed = name.trim();
    // Nombre debe tener entre 1 y 100 caracteres (incluye nombres y apellidos)
    return nameTrimmed.length > 0 && nameTrimmed.length <= 100;
}

