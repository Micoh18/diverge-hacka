# Backend API - Sistema de Sesiones Terapéuticas DIVERGE

Backend en Node.js/Express que actúa como intermediario entre el frontend y el contrato Soroban desplegado en Stellar.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js (v18 o superior)
- npm (viene con Node.js)
- Cuenta Stellar con XLM para pagar fees de transacciones

### Instalación

1. **Instalar dependencias:**
   ```bash
   cd back
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.ejemplo .env
   ```
   
   Edita `.env` y completa con tus valores:
   - `SOROBAN_RPC_URL`: URL del RPC de Soroban (testnet)
   - `NETWORK_PASSPHRASE`: Passphrase de la red
   - `CONTRACT_ID`: ID del contrato desplegado
   - `THERAPIST_SECRET`: Secret key del terapeuta (modo custodial)
   - `PORT`: Puerto del servidor (default: 3000)

3. **Iniciar el servidor:**
   ```bash
   npm start
   ```
   
   O en modo desarrollo (con auto-reload):
   ```bash
   npm run dev
   ```

## 📁 Estructura del Proyecto

```
back/
├── package.json              # Dependencias y scripts
├── .env.ejemplo             # Variables de entorno de ejemplo
├── .gitignore               # Archivos a ignorar
├── server.js                 # Servidor Express principal
├── config/
│   └── stellar.js           # Configuración Stellar/Soroban
├── controllers/
│   └── sessionsController.js # Lógica de endpoints
├── utils/
│   ├── dataConverter.js     # Conversión texto → hex/Bytes
│   └── errorHandler.js      # Manejo de errores
└── routes/
    └── sessions.js          # Definición de rutas
```

## 🔌 Endpoints de la API

### POST /api/sessions/record

Registra una nueva sesión terapéutica.

**Request Body:**
```json
{
  "beneficiario_nombre": "Juanito García",
  "beneficiario_pin": "1234",
  "tipo_terapia": "KINESIO",
  "duracion_minutos": 60,
  "asistencia": "COMPLETADA",
  "notas": "Trabajó voluntad motriz gruesa..."
}
```

**Response:**
```json
{
  "success": true,
  "session_id": 4782,
  "transaction_hash": "abc123..."
}
```

### POST /api/sessions/monthly-count

Obtiene el conteo mensual de sesiones de un beneficiario.

**Request Body:**
```json
{
  "beneficiario_nombre": "Juanito García",
  "beneficiario_pin": "1234",
  "mes": 12,
  "anio": 2025
}
```

**Response:**
```json
{
  "success": true,
  "count": 7
}
```

### POST /api/stats/monthly

Obtiene estadísticas mensuales del centro (opcional).

**Request Body:**
```json
{
  "mes": 12,
  "anio": 2025
}
```

**Response:**
```json
{
  "success": true,
  "completadas": 318,
  "no_asistio": 18,
  "canceladas": 6
}
```

## 🔧 Configuración

### Variables de Entorno

- `SOROBAN_RPC_URL`: URL del RPC de Soroban
- `NETWORK_PASSPHRASE`: Passphrase de la red Stellar
- `CONTRACT_ID`: ID del contrato desplegado
- `ADMIN_SECRET`: Secret key del admin (opcional, para autorizar terapeutas)
- `THERAPIST_SECRET`: Secret key del terapeuta (requerido para modo custodial)
- `PORT`: Puerto del servidor (default: 3000)
- `CORS_ORIGIN`: Origen permitido para CORS (default: http://localhost:8000)

### Modo Custodial vs Non-Custodial

**Modo Custodial (Actual):**
- El backend tiene la secret key del terapeuta
- El backend firma las transacciones automáticamente
- Requiere configurar `THERAPIST_SECRET` en `.env`

**Modo Non-Custodial (Futuro):**
- El backend retorna la transacción XDR sin firmar
- El frontend usa Freighter para firmar
- Más seguro pero requiere cambios en el código

## 🛠️ Tecnologías Utilizadas

- **Express**: Framework web para Node.js
- **@stellar/stellar-sdk**: SDK oficial de Stellar (v14.4.3)
- **dotenv**: Carga variables de entorno
- **cors**: Habilitar CORS para el frontend

## 📝 Notas Importantes

- ⚠️ **Nunca subas el archivo `.env` a GitHub** - contiene secret keys
- El backend convierte automáticamente texto (nombre, PIN) a formato Bytes para el contrato
- Todas las transacciones se simulan antes de enviar (pre-flight)
- El backend espera confirmación de las transacciones antes de responder

## 🐛 Solución de Problemas

### Error: "THERAPIST_SECRET no configurado"
- Verifica que `THERAPIST_SECRET` esté en tu archivo `.env`
- Asegúrate de que la secret key sea válida (formato S...)

### Error: "No se pudo obtener una cuenta para la consulta"
- Verifica que `THERAPIST_SECRET` esté configurado
- Asegúrate de que la cuenta tenga XLM suficiente para pagar fees

### Error: "Error en simulación"
- Verifica que los parámetros sean correctos
- Revisa que el contrato esté desplegado y el `CONTRACT_ID` sea correcto
- Verifica que el terapeuta esté autorizado en el contrato

## 📄 Licencia

Este proyecto es propiedad de DIVERGE.

