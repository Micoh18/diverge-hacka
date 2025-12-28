# Configuración de Pagos Stellar - Corporación El Trampolín

## Descripción
Sistema de pagos únicos mediante blockchain Stellar para donaciones a la Corporación El Trampolín.

## Archivos del Sistema

- `pago-stellar.html` - Página de pago con formulario
- `js/stellar-config.js` - Configuración de red y cuenta destino
- `js/stellar-payment.js` - Lógica de procesamiento de pagos

## Configuración Inicial

### 1. Crear Cuenta Stellar para la Corporación

#### En Testnet (Desarrollo):
1. Visita: https://laboratory.stellar.org/#account-creator?network=test
2. Genera una nueva cuenta
3. Copia la **clave pública** (empieza con 'G')
4. Usa Friendbot para fondear la cuenta con XLM de prueba

#### En Mainnet (Producción):
1. Usa una billetera Stellar (Freighter, Lobstr, etc.)
2. Crea una nueva cuenta
3. Fondéala con XLM real (mínimo 1 XLM para activar)
4. Copia la **clave pública**

### 2. Configurar cuenta destino

Edita `js/stellar-config.js`:

```javascript
destinationAccount: 'TU_CLAVE_PUBLICA_AQUI',
```

### 3. Cambiar a Mainnet (Producción)

En `js/stellar-config.js`, cambia:

```javascript
network: 'mainnet',
```

## Funcionalidades

- ✅ Pagos en XLM (nativo de Stellar)
- ✅ Pagos en USDC (Stablecoin)
- ✅ Integración con Freighter (billetera)
- ✅ Entrada manual de clave privada (solo testnet)
- ✅ Conversión de precios a CLP (referencia)
- ✅ Memo opcional para identificar donaciones
- ✅ Verificación de transacciones en Stellar Explorer

## Uso

1. Usuario hace clic en "Pagar con Stellar" en la landing
2. Se redirige a `/pago-stellar`
3. Ingresa monto y selecciona moneda (XLM o USDC)
4. Conecta billetera o ingresa clave privada (solo testnet)
5. Confirma y procesa el pago
6. Recibe confirmación con hash de transacción

## Seguridad

⚠️ **IMPORTANTE:**
- Nunca expongas claves privadas en producción
- Usa billeteras externas (Freighter) cuando sea posible
- La entrada manual de clave privada solo funciona en testnet
- Siempre usa HTTPS en producción
- Valida montos en backend si implementas uno

## Testing

Para probar en testnet:

1. Crea una cuenta de prueba en: https://laboratory.stellar.org/#account-creator?network=test
2. Fondéala usando Friendbot
3. Usa esa cuenta para hacer pagos de prueba
4. Verifica las transacciones en: https://stellar.expert/explorer/testnet

## Recursos

- Documentación Stellar: https://developers.stellar.org/es
- Stellar Laboratory: https://laboratory.stellar.org
- Freighter Wallet: https://freighter.app
- Stellar Explorer: https://stellar.expert

## Notas

- Los precios de conversión a CLP son aproximados y deben actualizarse con una API real si se requiere precisión
- El sistema está configurado para testnet por defecto
- La cuenta destino debe estar activa (fondada) antes de recibir pagos

