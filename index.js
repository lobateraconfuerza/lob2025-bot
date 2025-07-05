import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

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
async function enviarPreguntaPersonalizada(chatId, nombre, cedula, centro, edad) {
  const pregunta = `📌 Usted elector *${nombre}*, de cédula *${cedula}*, con *${edad} años*, registrado en el centro electoral *${centro}*, ¿acompañaría el próximo *12 de septiembre de 2025* al equipo de Lobatera con Fuerza?\n\n⬇️ Por favor seleccione una opción:`;

  const botones = {
    inline_keyboard: [[
      { text: '✅ Sí', callback_data: 'SI' },
      { text: '🤔 No sé', callback_data: 'NO_SE' },
      { text: '❌ No', callback_data: 'NO' }
    ]]
  };

  //await fetch(`${TELEGRAM_API}/sendMessage`, {
  //  method: 'POST',
  //  headers: { 'Content-Type': 'application/json' },
  //  body: JSON.stringify({
  //    chat_id: chatId,
  //    text: pregunta,
  //    reply_markup: botones,
  //    parse_mode: 'Markdown'
  //  })
  //});

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