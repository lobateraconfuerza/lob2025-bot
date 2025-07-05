import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

app.use('/favicon.ico', express.static('favicon.ico'));
app.use(bodyParser.json());

// 🟢 Ruta de salud
app.get('/', (req, res) => {
  res.send('Bot Lobatera está activo 🟢');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot Lobatera activo en puerto ${PORT}`);
});

// lote 2

// 🚀 Webhook principal
app.post('/', async (req, res) => {
  const body = req.body;

  // 📥 MENSAJES DE TEXTO
  if (body.message || body.edited_message) {
    const message = body.message || body.edited_message;
    const chatId = message.chat.id;
    const text = message.text?.trim();
    const user = message.from;

    // 👉 1. Comando /start con cédula
    if (text.startsWith('/start')) {
      const partes = text.split(' ');
      const cedula = partes[1];

      if (!cedula || !/^\d+$/.test(cedula)) {
        await enviarMensaje(chatId, `👋 Bienvenido al *Bot Lobatera con Fuerza*\n\nPara comenzar, escribe tu cédula después del comando:\n\nEjemplo: \`/start 12345678\`\n\nEstamos construyendo comunidad con tecnología y convicción 🇻🇪`, 'Markdown');
        return res.sendStatus(200);
      }

      await procesarCedula(chatId, 'V', cedula);
      return res.sendStatus(200);
    }

    // 👉 2. Entrada tipo V12345678 o E12345678
    if (/^[VE]\d{6,10}$/i.test(text)) {
      const tipo = text.charAt(0).toUpperCase();
      const cedula = text.slice(1);
      await procesarCedula(chatId, tipo, cedula);
      return res.sendStatus(200);
    }
  }

  // 📥 RESPUESTAS CON BOTONES
  if (body.callback_query) {
    const callback = body.callback_query;
    const chatId = callback.message.chat.id;
    const messageId = callback.message.message_id;
    const respuesta = callback.data;
    const [opcion, cedula] = respuesta.split(':');

    const estado = await registrarDecision(cedula, opcion, chatId);
    await eliminarBotones(chatId, messageId);

    if (estado === 'duplicado') {
      await enviarMensaje(chatId, `🙌 Ya registramos tu participación anteriormente.\n\n¡Gracias por ser parte activa de Lobatera con Fuerza!`);
    } else if (estado === 'registrado') {
      await enviarMensaje(chatId, `✅ Registramos tu respuesta: *${opcion === 'si' ? 'Sí' : opcion === 'nose' ? 'No sé' : 'No'}*\n\n🎉 ¡Ya formas parte de este gran equipo de Lobatera con Fuerza!`, 'Markdown');
    } else {
      await enviarMensaje(chatId, `💥 Hubo un error registrando tu respuesta. Intenta de nuevo más tarde.`);
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

//lote 3

// 🧠 Procesar cédula y mostrar botones
async function procesarCedula(chatId, tipo, cedula) {
  const elector = await buscarElectorPorCedula(cedula);

  if (elector) {
    const edad = calcularEdad(elector.fechanac);
    const texto = `🗳️ *${limpiarTextoMarkdown(elector.elector)}* (${tipo}${cedula})\n🏫 Centro: *${limpiarTextoMarkdown(elector.nombre_centro)}*\n🎂 Edad: *${edad} años*\n\n¿Estás dispuesto a acompañar este proceso electoral?`;

    const botones = {
      inline_keyboard: [
        [
          { text: '✅ Sí', callback_data: `si:${cedula}` },
          { text: '🤔 No sé', callback_data: `nose:${cedula}` },
          { text: '❌ No', callback_data: `no:${cedula}` }
        ]
      ]
    };

    await enviarMensaje(chatId, texto, 'Markdown', botones);
  } else {
    await enviarMensaje(chatId, `😕 No encontré al elector con cédula ${tipo}${cedula}. Verifique si está registrado.`);
  }
}

// 🔍 Buscar en Supabase tabla "datos"
async function buscarElectorPorCedula(cedula) {
  const cedulaNumerica = parseInt(cedula, 10);
  const url = `${process.env.SUPABASE_URL}/rest/v1/datos?cedula=eq.${cedulaNumerica}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('💥 Error al consultar Supabase:', error.message);
    return null;
  }
}

// 💾 Registrar decisión (con validación de duplicado)
async function registrarDecision(cedula, respuesta, chatId) {
  const cedulaNumerica = parseInt(cedula, 10);
  const urlVerificar = `${process.env.SUPABASE_URL}/rest/v1/participacion_bot?cedula=eq.${cedulaNumerica}&select=id`;
  const urlInsertar = `${process.env.SUPABASE_URL}/rest/v1/participacion_bot`;

  try {
    const verificar = await fetch(urlVerificar, {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const existe = await verificar.json();
    if (existe.length > 0) return 'duplicado';

    const payload = {
      cedula: cedulaNumerica,
      respuesta: respuesta,
      chat_id: chatId
    };

    const insertar = await fetch(urlInsertar, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const result = await insertar.json();
    if (insertar.status >= 400) {
      console.error('🚨 Error Supabase:', result);
      return 'error';
    }

    return 'registrado';
  } catch (error) {
    console.error('💥 Error técnico en registrarDecision:', error.message);
    return 'error';
  }
}

// 🧼 Eliminar botones después de respuesta
async function eliminarBotones(chatId, messageId) {
  try {
    await fetch(`${TELEGRAM_API}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] }
      })
    });
  } catch (error) {
    console.error('💥 Error al eliminar botones:', error.message);
  }
}

// 📤 Enviar mensajes a Telegram
async function enviarMensaje(chatId, texto, modo = null, botones = null) {
  const payload = { chat_id: chatId, text: texto };
  if (modo) payload.parse_mode = modo;
  if (botones) payload.reply_markup = botones;

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('🚨 Telegram no envió mensaje:', result.description);
    }
  } catch (error) {
    console.error('💥 Error al enviar mensaje:', error.message);
  }
}

// 🎂 Calcular edad a partir de la fecha de nacimiento
function calcularEdad(fechanac) {
  const nacimiento = new Date(fechanac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

// ✨ Limpiar texto para evitar errores Markdown
function limpiarTextoMarkdown(texto) {
  return texto
    .replace(/[*_`\[\]]/g, '')
    .replace(/</g, '‹')
    .replace(/>/g, '›');
}