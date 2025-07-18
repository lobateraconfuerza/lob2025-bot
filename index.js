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

// 📄 Resumen totalizado
import {
  resumen
} from './resumen.js';

const app = express();

// 🛑 Evita error favicon en Render
app.use('/favicon.ico', express.static('favicon.ico'));
app.use(bodyParser.json());

// ❤️ Ruta de salud para monitoreo
app.get('/', (req, res) => {
  res.send('Bot Lobatera + Fuerte activo 🟢');
});

// 🤖 Webhook de Telegram
app.post('/', async (req, res) => {
  // responde primero para evitar timeouts
  res.sendStatus(200);

  const body = req.body;

  // 📝 Mensajes de texto
  if (body.message || body.edited_message) {
    const message = body.message || body.edited_message;
    const chatId = message.chat?.id;
    const text = message.text?.trim();

    if (!chatId || !text) {
      console.error('🚫 chatId o texto no disponible');
      return;
    }

    // 👉 /start con cédula
    if (text.startsWith('/start')) {
      const partes = text.split(' ');
      const cedula = partes[1];
      if (!cedula || !/^\d+$/.test(cedula)) {
        await enviarMensaje(
          chatId,
          `👋 Bienvenido al *Bot Lobatera + Fuerte*\n\nPara comenzar, escribe tu cédula después de V o E:\n\nEjemplo: \`V12345678 ó E84456789\`\n\nEstamos construyendo comunidad con tecnología y convicción 🇻🇪`,
          'Markdown'
        );
        return;
      }
      await procesarCedula(chatId, 'V', cedula);
      return;
    }

    // 👉 Entrada directa: V12345678 o E12345678
    if (/^[VE]\d{6,10}$/i.test(text)) {
      const tipo = text.charAt(0).toUpperCase();
      const cedula = text.slice(1);
      await procesarCedula(chatId, tipo, cedula);
      return;
    }

    // 📊 Comando /reporte
    if (text.toLowerCase() === '/reporte') {
      console.log('📬 Generando Excel para chatId:', chatId);
      await generarReporteGeneral(chatId);
      return;
    }

    // 📄 Comando /resumen
    if (text.toLowerCase() === '/resumen') {
      console.log('📬 Ejecutando resumen general (totalización) para chatId:', chatId);
      await resumen(chatId);
      return;
    }

    return;
  }

  // 🔘 Respuestas con botones
  if (body.callback_query) {
    const callback = body.callback_query;
    const chatId = callback.message?.chat?.id;
    const messageId = callback.message?.message_id;
    const respuesta = callback.data;

    if (!chatId || !messageId || !respuesta) {
      console.error('🚫 Datos incompletos en callback');
      return;
    }

    const [opcion, cedula] = respuesta.split(':');
    const tipo = 'V';

    const estado = await registrarDecision(cedula, opcion, chatId);
    await eliminarBotones(chatId, messageId);

    if (estado === 'duplicado') {
      await mostrarElectorConMensaje(chatId, 'duplicado', cedula, tipo);
    } else if (estado === 'registrado') {
      await mostrarElectorConMensaje(chatId, 'registrado', cedula, tipo, opcion);
    } else {
      await enviarMensaje(chatId, `💥 Hubo un error registrando tu respuesta. Intenta de nuevo más tarde.`);
    }

    return;
  }

  // cualquier otro caso
  return;
});

// 🚀 Activación del bot
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot Lobatera + Fuerte operativo en puerto ${PORT}`);
});
