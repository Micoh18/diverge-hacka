<div align="center">
  <img src="front-inicial/centro%20integral%20diverge/2.png" alt="Centro Integral Diverge El Trampolín" width="300">
</div>

# DIVERGE

Para usar la app, primero instala las dependencias. Ve a cada directorio (`back`, `front-inicial` y `webapp`) y ejecuta `npm install` en cada uno.

Después, crea un archivo `.env` dentro de `back` con estos parámetros:

**URL del RPC de testnet:**
```
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

**Passphrase de la testnet:**
```
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
```

**ID del contrato:**
```
CONTRACT_ID=CDPXKROEYGEWENYC4FTXOOALCLMTFPLV5I4WROTOGDWRF5GAJ2LQGMS3
```

**Clave del admin (para autorizar terapeutas en el smart contract):**
```
ADMIN_SECRET=S.....
```

**Clave secreta del terapeuta:**
Esta wallet es generada por el sistema y como es no custodial, se define acá. Se usa para firmar las transacciones al generar sesiones.
```
THERAPIST_SECRET=S...
```

**Puerto del servidor:**
Puede ser cualquiera, por ejemplo 3000.
```
PORT=3000
```

**Orígenes permitidos para CORS:**
Para desarrollo, dejo el "*".
```
CORS_ORIGIN=*
```

Luego de esto, ejecuta `npm run dev` en cada directorio (`back`, `front-inicial` y `webapp`) y ya debería funcionar!.
