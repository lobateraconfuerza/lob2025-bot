// index.js – Bot Lobatera + Fuerte completo
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

// 🔧 Utilitarios generales
import {
  enviarMensaje,
  enviarArchivo,
  eliminarBotones,
  calcularEdad,
  limpiarTextoMarkdown
} from './utils.js';

// 🧠 Lógica de encuestas
import {
  procesarCedula,
  registrarDecision
} from './encuestas.js';

// 🎨 Presentación institucional
import {
  mostrarElectorConMensaje
} from './mensajes.js';

// 📊 Reporte crudo en Excel
import {
  generarReporteGeneral
} from './reporte.js';

// 📄 Resumen PDF visual con porcentajes
import {
  generarResumenPDF
} from './resumen.js';

const app = express();
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

// 🛑 Evita error favicon en Render
app.use('/favicon.ico', express.static('favicon.ico'));
app.use(bodyParser.json());

// ❤️ Ruta de salud para monitoreo
app.get('/', (req, res) => {
  res.send('Bot Lobatera + Fuerte activo 🟢');
});

// 🤖 Webhook de Telegram
app.post('/', async (req, res) => {
  const body = req.body;

  // 📝 Mensajes de texto
  if (body.message || body.edited_message) {
    const message = body.message || body.edited_message;
    const chatId = message.chat.id;
    const text = message.text?.trim();

    // 👉 /start con cédula
    if (text.startsWith('/start')) {
      const partes = text.split(' ');
      const cedula = partes[1];
      if (!cedula || !/^\d+$/.test(cedula)) {
        await enviarMensaje(chatId,
          `👋 Bienvenido al *Bot Lobatera + Fuerte*\n\nPara comenzar, escribe tu cédula después del comando:\n\nEjemplo: \`/start 12345678\`\n\nEstamos construyendo comunidad con tecnología y convicción 🇻🇪`,
          'Markdown');
        return res.sendStatus(200);
      }
      await procesarCedula(chatId, 'V', cedula);
      return res.sendStatus(200);
    }

    // 👉 Entrada directa: V12345678 o E12345678
    if (/^[VE]\d{6,10}$/i.test(text)) {
      const tipo = text.charAt(0).toUpperCase();
      const cedula = text.slice(1);
      await procesarCedula(chatId, tipo, cedula);
      return res.sendStatus(200);
    }

    // 📊 Comando /reporte
    if (text.toLowerCase() === '/reporte') {
      const archivo = await generarReporteGeneral();
      await enviarArchivo(chatId, archivo.buffer, 'reporte.xlsx');
      return res.sendStatus(200);
    }

    // 📄 Comando /resumen
    if (text.toLowerCase() === '/resumen') {
      const pdf = await generarResumenPDF();
      await generarResumenPDF(chatId);
      return res.sendStatus(200);
    }
  }

  // 🔘 Respuestas con botones
  if (body.callback_query) {
    const callback = body.callback_query;
    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;
    const respuesta = callback.data;
    const [opcion, cedula] = respuesta.split(':');
    const tipo = 'V'; // Por defecto, puedes adaptarlo si quieres registrar tipo

    const estado = await registrarDecision(cedula, opcion, chatId);
    await eliminarBotones(chatId, messageId);

    if (estado === 'duplicado') {
      await mostrarElectorConMensaje(chatId, 'duplicado', cedula, tipo);
    } else if (estado === 'registrado') {
      await mostrarElectorConMensaje(chatId, 'registrado', cedula, tipo, opcion);
    } else {
      await enviarMensaje(chatId, `💥 Hubo un error registrando tu respuesta. Intenta de nuevo más tarde.`);
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// 🚀 Activación del bot
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot Lobatera + Fuerte operativo en puerto ${PORT}`);
});