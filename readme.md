# Bot Lobatera + Fuerte 🇻🇪💪

Sistema comunitario digital para encuestar, registrar y visualizar participación ciudadana, construido con amor técnico, soberanía institucional y convicción social.

---

## 🔧 Características principales

- Registro por cédula con verificación contra base Supabase
- Presentación humanizada y visual del encuestado
- Botones inline para respuestas tipo ✅ "Sí" / 🤔 "No sé" / ❌ "No"
- Registro único por persona, evitando duplicados
- Comando `/reporte` para generar Excel institucional
- Comando `/resumen` para generar PDF con porcentajes y diseño comunitario
- Estilo Markdown con narrativa Lobatera + Fuerte
- Control vía Telegram en tiempo real y desde terreno

---

## 📁 Estructura del proyecto

bot-lobatera/ ├── index.js               # Archivo principal del bot Telegram ├── utils.js               # Funciones auxiliares: mensaje, edad, limpieza ├── encuestas.js           # Registro por cédula y Supabase ├── mensajes.js            # Presentación institucional de electores ├── reporte.js             # Generación de Excel completo ├── resumen.js             # Generación de PDF visual con logo y porcentajes ├── logo.png               # Logotipo institucional para encabezado PDF ├── .env                   # Variables de entorno (token, Supabase) └── README.md              # Este archivo 😄

---

## 🛠️ Requisitos para ejecución

- Node.js v16 o superior
- Supabase con tablas:
  - `datos` (con cédula, nombre, fechanac, parroquia, codcv, centro)
  - `participacion_bot` (con respuesta y chat_id)
- Archivo `.env` con las siguientes variables:


BOT_TOKEN=tu_token_de_telegram SUPABASE_URL=https://tu_instancia.supabase.co SUPABASE_KEY=tu_clave_privada_de_supabase

---

## 🚀 Instrucciones de uso

1. Clonar el proyecto

```bash
git clone https://github.com/oxieldev/bot-lobatera.git
cd bot-lobatera


- Instalar dependencias
npm install


- Ejecutar localmente (para pruebas)
node index.js


- Configurar el webhook en Telegram usando ngrok, Render o tu propio dominio:
https://api.telegram.org/bot<tu_bot_token>/setWebhook?url=https://tudominio.com/



🔗 Comandos disponibles en el bot
- /start 12345678 → Inicia el proceso con cédula (formato nacional)
- V12345678 o E12345678 → También válido como entrada directa
- /reporte → Genera archivo Excel con todos los encuestados
- /resumen → Genera archivo PDF visual con totales y porcentajes

🌱 Flujo de desarrollo por lotes (rutas técnicas)
main
├── lote-a-inicio         # Express + webhook base
├── lote-b-utils          # Funciones auxiliares
├── lote-c-encuestas      # Lógica de verificación y registro
├── lote-d-mensajes       # Mensaje institucional del encuestado
├── lote-f-reporte        # Generación de Excel
└── lote-g-resumen        # Generación de PDF con totales y logo



📢 Créditos
- 💡 Desarrollo técnico comunitario: Oxiel
- 🧠 Asistencia arquitectónica: Copilot IA
- 🫀 Inspiración: Pueblo de Lobatera y su fuerza ciudadana

📜 Licencia
Este proyecto se ofrece con espíritu libre, educativo y comunitario. Puede ser replicado para fines cívicos, institucionales o colaborativos. ¡Lobatera + Fuerte es más que un bot: es participación digital viva!


---

📁 Guarda este contenido como `README.md` dentro de tu repositorio. Si necesitas que lo exporte a un archivo real `.md` listo para GitHub o Render, me lo pides y te lo estructuro con emojis, estilos o incluso integración visual. ¡Este proyecto ya tiene alma propia, y tú lo encabezas con corazón técnico! 🇻🇪✨📲


---

## 🛠️ Requisitos para ejecución

- Node.js v16 o superior
- Supabase con tablas:
  - `datos` (con cédula, nombre, fechanac, parroquia, codcv, centro)
  - `participacion_bot` (con respuesta y chat_id)
- Archivo `.env` con las siguientes variables:

BOT_TOKEN=tu_token_de_telegram SUPABASE_URL=https://tu_instancia.supabase.co SUPABASE_KEY=tu_clave_privada_de_supabase


---

## 🚀 Instrucciones de uso

1. Clonar el proyecto

```bash
git clone https://github.com/oxieldev/bot-lobatera.git
cd bot-lobatera

- Instalar dependencias

npm install

- Ejecutar localmente (para pruebas)

node index.js

https://api.telegram.org/bot<tu_bot_token>/setWebhook?url=https://tudominio.com/

🔗 Comandos disponibles en el bot
- /start 12345678 → Inicia el proceso con cédula (formato nacional)
- V12345678 o E12345678 → También válido como entrada directa
- /reporte → Genera archivo Excel con todos los encuestados
- /resumen → Genera archivo PDF visual con totales y porcentajes

main
├── lote-a-inicio         # Express + webhook base
├── lote-b-utils          # Funciones auxiliares
├── lote-c-encuestas      # Lógica de verificación y registro
├── lote-d-mensajes       # Mensaje institucional del encuestado
├── lote-f-reporte        # Generación de Excel
└── lote-g-resumen        # Generación de PDF con totales y logo

📢 Créditos
- 💡 Desarrollo técnico comunitario: Oxiel
- 🧠 Asistencia arquitectónica: Copilot IA
- 🫀 Inspiración: Pueblo de Lobatera y su fuerza ciudadana

📜 Licencia
Este proyecto se ofrece con espíritu libre, educativo y comunitario. Puede ser replicado para fines cívicos, institucionales o colaborativos. ¡Lobatera + Fuerte es más que un bot: es participación digital viva!


