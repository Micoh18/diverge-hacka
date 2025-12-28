# Corporación El Trampolín - Landing Page

Landing page para la Corporación El Trampolín con integración de pagos Stellar.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js (v14 o superior)
- npm (viene con Node.js)

### Instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

   Esto iniciará un servidor HTTP en `http://localhost:8000` y abrirá automáticamente el navegador.

3. **Para producción:**
   ```bash
   npm start
   ```

## 📁 Estructura del Proyecto

```
.
├── index.html                  # Página principal
├── centro-integral-diverge.html # Página del centro integral
├── pago-stellar.html          # Página de pagos con Stellar
├── transparencia.html         # Página de transparencia
├── js/
│   ├── animations.js          # Animaciones
│   ├── carousel.js            # Carrusel
│   ├── flipCards.js           # Tarjetas flip
│   ├── nav.js                 # Navegación
│   ├── stellar-config.js      # Configuración Stellar
│   └── stellar-payment.js     # Lógica de pagos Stellar
├── package.json               # Dependencias y scripts
└── STELLAR_SETUP.md          # Documentación de Stellar
```

## 💳 Configuración de Pagos Stellar

Para configurar los pagos con Stellar, consulta el archivo [STELLAR_SETUP.md](./STELLAR_SETUP.md).

### Configuración Rápida

1. Edita `js/stellar-config.js` y configura:
   - `destinationAccount`: Tu cuenta Stellar pública (empieza con 'G')
   - `network`: 'testnet' para desarrollo, 'mainnet' para producción

2. Para testnet, crea una cuenta en: https://laboratory.stellar.org/#account-creator?network=test

## 🛠️ Tecnologías Utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- Stellar SDK v11.2.2
- http-server (servidor de desarrollo)

## 📝 Notas Importantes

- El proyecto usa un servidor HTTP simple para desarrollo
- Los pagos Stellar están configurados para testnet por defecto
- Asegúrate de tener conexión a internet para cargar el Stellar SDK desde CDN
- Para usar Freighter wallet, instálalo desde: https://freighter.app

## 🐛 Solución de Problemas

### Error: "StellarSdk.Server is not a constructor"

- Verifica tu conexión a internet (el SDK se carga desde CDN)
- Asegúrate de que el navegador no esté bloqueando scripts externos
- Revisa la consola del navegador para más detalles

### Error: "Freighter no está disponible"

- Instala la extensión Freighter desde https://freighter.app
- Asegúrate de que la extensión esté habilitada en tu navegador
- Recarga la página después de instalar Freighter

### El servidor no inicia

- Verifica que el puerto 8000 no esté en uso
- Asegúrate de haber ejecutado `npm install` primero
- Verifica que Node.js esté instalado correctamente

## 📄 Licencia

Este proyecto es propiedad de la Corporación El Trampolín.

