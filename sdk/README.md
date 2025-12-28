# SDK de Stellar para Desplegar Contratos

Este directorio contiene el SDK de Stellar configurado para desplegar y gestionar contratos inteligentes Soroban.

## Instalación

El SDK ya está instalado. Las dependencias incluyen:

- `@stellar/stellar-sdk`: SDK oficial de Stellar con soporte completo para contratos Soroban

## Uso

### Importar el SDK

```javascript
const StellarSdk = require('@stellar/stellar-sdk');
```

### Ejemplo: Desplegar un Contrato

```javascript
const StellarSdk = require('@stellar/stellar-sdk');

// Configurar el servidor Soroban RPC
const sorobanServer = new StellarSdk.SorobanRpc.Server(
  'https://soroban-testnet.stellar.org',
  { allowHttp: true }
);

// Cargar la cuenta
const sourceKeypair = StellarSdk.Keypair.fromSecret('YOUR_SECRET_KEY');
const account = await sorobanServer.getAccount(sourceKeypair.publicKey());

// Leer el WASM del contrato
const contractWasm = fs.readFileSync('./contract.wasm');

// Subir el contrato
const uploadTx = new StellarSdk.TransactionBuilder(account, {
  fee: StellarSdk.BASE_FEE,
  networkPassphrase: StellarSdk.Networks.TESTNET
})
  .addOperation(
    StellarSdk.Operation.uploadContractWasm({
      contract: contractWasm
    })
  )
  .setTimeout(600)
  .build();

// Firmar y enviar
uploadTx.sign(sourceKeypair);
const uploadResult = await sorobanServer.sendTransaction(uploadTx);
```

### Funciones Principales

- **SorobanRpc.Server**: Cliente para interactuar con el RPC de Soroban
- **uploadContractWasm**: Subir código WASM del contrato
- **createContract**: Crear una instancia del contrato
- **invokeContract**: Invocar funciones del contrato

## Documentación

- [Stellar SDK Documentation](https://developers.stellar.org/docs/tools/sdks)
- [Soroban Contract SDKs](https://developers.stellar.org/docs/tools/sdks/contract-sdks)
- [Stellar CLI](https://developers.stellar.org/docs/tools/stellar-cli)

## Redes

- **Testnet**: `https://soroban-testnet.stellar.org`
- **Mainnet**: `https://soroban-rpc.mainnet.stellar.org`

