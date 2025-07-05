import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

app.use('/favicon.ico', express.static('favicon.ico'));

app.use(bodyParser.json());

// 🚪 Endpoint de entrada del webhook
app.post('/', async (req, res) => {
  const message = req.body?.message;
  const chatId = message?.chat?.id;
  const text = message?.text;

  if (!chatId || !text) return res.sendStatus(200);

  console.log('📩 Mensaje recibido:', text);
  console.log('🆔 Chat ID:', chatId);

  if (text.startsWith('/start')) {
    const partes = text.split(' ');
    const cedula = partes[1];

    if (!cedula) {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '⚠️ Por favor incluya su cédula después de /start. Ejemplo: `/start 12345678`',
          parse_mode: 'Markdown'
        })
      });
      return res.sendStatus(200);
    }

    const elector = await buscarElectorPorCedula(cedula);

    if (elector) {
      const edad = calcularEdad(elector.fechanac);
      await enviarPreguntaPersonalizada(chatId, elector.elector, elector.cedula, elector.nombre_centro, edad);
    } else {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `😕 No encontré al elector con cédula ${cedula}. Verifique si está registrado.`
        })
      });
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// 🧠 Función que envía la encuesta personalizada

await fetch(`${TELEGRAM_API}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: msg.chat.id,
    text: '👋 ¡Hola, bienvenido!',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Sí', callback_data: 'si' },
          { text: '🤔 No sé', callback_data: 'nose' },
          { text: '❌ No', callback_data: 'no' }
        ]
      ]
    }
  })
});

await fetch(`${TELEGRAM_API}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text: pregunta, // Sin Markdown
    reply_markup: botones
  })
});

}

// 🖥️ Puerto en Render
app.get('/', (req, res) => {
  res.send('Bot Lobatera está activo 🟢');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot Lobatera activo en puerto ${PORT}`);
});

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

function calcularEdad(fechanac) {
  const nacimiento = new Date(fechanac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}