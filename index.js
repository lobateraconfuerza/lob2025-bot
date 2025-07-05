import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

app.use('/favicon.ico', express.static('favicon.ico'));
app.use(bodyParser.json());

// 🚪 Webhook principal
app.post('/', async (req, res) => {
  console.log('🧾 Entrada recibida del webhook:', JSON.stringify(req.body));
  const body = req.body;

  // ✅ Mensaje original o editado
  if (body.message || body.edited_message) {
    const message = body.message || body.edited_message;
    const chatId = message.chat.id;
    const text = message.text?.trim();

    console.log('📩 Mensaje recibido:', text);
    console.log('🆔 Chat ID:', chatId);

    if (text.startsWith('/start')) {
      const partes = text.split(' ');
      const cedula = partes[1];

      if (!cedula) {
        await enviarMensaje(chatId, '⚠️ Por favor incluya su cédula después de /start. Ejemplo: `/start 12345678`', 'Markdown');
        return res.sendStatus(200);
      }

      const elector = await buscarElectorPorCedula(cedula);
      console.log('🔎 Elector encontrado:', elector);

      if (elector) {
        const edad = calcularEdad(elector.fechanac);
        const texto = `🗳️ *${elector.elector}* (${cedula})\n🏫 Centro: *${elector.nombre_centro}*\n🎂 Edad: *${edad} años*\n\n¿Estás dispuesto a acompañar este proceso electoral?`;

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
        await enviarMensaje(chatId, `😕 No encontré al elector con cédula ${cedula}. Verifique si está registrado.`);
      }

      return res.sendStatus(200);
    }
  }

  // 📥 Manejo de respuestas con botones
  if (body.callback_query) {
    const callback = body.callback_query;
    const chatId = callback.message.chat.id;
    const respuesta = callback.data;
    const [opcion, cedula] = respuesta.split(':');

    console.log('📥 Respuesta recibida:', opcion, 'para la cédula', cedula);

    // Aquí puedes guardar en Supabase si quieres:
    // await registrarDecision(cedula, opcion, chatId);

    const texto = `✅ Registramos tu respuesta: *${opcion === 'si' ? 'Sí' : opcion === 'nose' ? 'No sé' : 'No'}*`;
    await enviarMensaje(chatId, texto, 'Markdown');

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// 🖥️ Ruta de salud
app.get('/', (req, res) => {
  res.send('Bot Lobatera está activo 🟢');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot Lobatera activo en puerto ${PORT}`);
});

// 🔍 Supabase: Buscar elector
async function buscarElectorPorCedula(cedula) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/electores?cedula=eq.${cedula}`;
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
}

// 🧠 Enviar mensaje
async function enviarMensaje(chatId, texto, modo = null, botones = null) {
  const payload = {
    chat_id: chatId,
    text: texto
  };
  if (modo) payload.parse_mode = modo;
  if (botones) payload.reply_markup = botones;

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// 📆 Calcular edad
function calcularEdad(fechanac) {
  const nacimiento = new Date(fechanac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}