<div align="center">
  <img src="front-inicial/centro%20integral%20diverge/2.png" alt="Centro Integral Diverge El Trampolín" width="300">
</div>

# DIVERGE

Si quieres acceder a la guía de uso, visita [Guia.md](./Guia.md).

---

## Sobre el Centro

El **Centro Integral DiVerge** es una iniciativa terapéutica y social gratuita ubicada en la comuna de Curacautín, Provincia de Malleco, Chile.

Este centro es impulsado por la **Corporación El Trampolín** y está diseñado para ofrecer apoyo especializado a personas con Síndrome de Down y Condición del Espectro Autista (CEA), así como a sus familias.

### Misión y Objetivo

Su propósito fundamental es promover el desarrollo integral de niños, niñas, adolescentes y jóvenes (desde la primera infancia hasta el inicio de la adultez) para mejorar su calidad de vida y fomentar su autonomía e inclusión social. Busca cubrir la falta de centros especializados en la zona, donde las familias a menudo deben viajar a Temuco para recibir atención.

### Servicios y Metodología

El centro plantea un modelo de intervención interdisciplinario y gratuito que incluye:

- **Atención Terapéutica**: Sesiones individuales y grupales con un equipo que incluye terapeutas ocupacionales, kinesiólogos, fonoaudiólogos y educadores diferenciales.

- **Apoyo Familiar**: Talleres y capacitaciones para cuidadores, abarcando temas como crianza respetuosa, manejo del diagnóstico y estrategias de estimulación en casa.

- **Vinculación Educativa**: Trabajo colaborativo con escuelas y jardines para favorecer la inclusión escolar y realizar ajustes razonables.

---

## ¿Por qué Stellar?

Para un proyecto que busca financiarse con donaciones, la tecnología aquí actúa como un **"auditor incorruptible"**.

### 1. Transparencia Radical y "Prueba de Ayuda"

**El problema principal** de muchas ONGs es demostrar que los fondos se usan realmente en lo que dicen.

**La Solución Stellar**: Al registrar cada sesión en la blockchain (función `record_session`), el centro genera una huella digital inmutable de su trabajo.

**El Impacto**: Si el centro dice "Realizamos 500 sesiones de Kinesiología en diciembre", no es solo un número en un Excel que alguien podría haber inventado. Es un dato verificable públicamente en la red (usando `get_monthly_count`). Esto eleva enormemente la credibilidad ante donantes (socios del "Trampolín") y fondos estatales, actuando como una **"garantía criptográfica"** de que el servicio se entregó.

### 2. Viabilidad Económica (Costos "Micro")

DIVERGE es un centro gratuito con recursos limitados. Usar blockchains tradicionales (como Ethereum o Bitcoin) sería inviable por sus costos.

**La Ventaja Stellar**: Las transacciones en Stellar cuestan fracciones de centavo de dólar (aprox. 0.00001 XLM).

**En la Práctica**: Con apenas **1 USD**, el Centro Diverge podría registrar miles de sesiones terapéuticas. Esto asegura que el presupuesto se vaya a pagar el centro y no a pagar "gas" o comisiones de red.

### 3. Privacidad + Verificación (Arquitectura Híbrida)

Stellar permite un equilibrio perfecto entre lo que debe ser público y lo que debe ser privado, algo crítico en salud (Ley de Derechos y Deberes del Paciente).

- **Público (Blockchain)**: "Se realizó una sesión de Fonoaudiología el día X a la hora Y, estado: COMPLETADA". (Esto prueba el trabajo).

- **Privado (SQLite)**: "El paciente Juan avanzó en su pronunciación de la letra R". (Esto es confidencial).

**Por qué Stellar**: Soroban permite estructurar estos datos "meta" sin exponer la identidad sensible del niño, usando identificadores o hashes, protegiendo la dignidad de los beneficiarios mientras se asegura la transparencia administrativa.

### 4. Velocidad de Uso (Experiencia de Usuario)

Los terapeutas no tienen tiempo para esperar 10 minutos a que una transacción se confirme.

**Rapidez**: Stellar finaliza transacciones en **3 a 5 segundos**.

**Flujo**: Para el terapeuta, la experiencia es idéntica a usar una web normal. Guarda la sesión y, para cuando ha guardado sus cosas para atender al siguiente paciente, la blockchain ya ha confirmado y guardado el registro para siempre.

### 5. Lógica Inteligente (Soroban)

No basta con guardar datos; se necesita lógica.

**Contratos Inteligentes**: Soroban permite programar reglas. Por ejemplo, la función `record_session` asegura que solo un terapeuta autorizado (con su firma criptográfica) pueda validar una sesión. Una base de datos tradicional podría ser alterada por un administrador de sistemas; el contrato en Soroban, una vez desplegado, sigue reglas estrictas que nadie puede saltarse silenciosamente.
