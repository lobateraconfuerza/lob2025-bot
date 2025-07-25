//📂 utils.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import FormData from 'form-data';
dotenv.config();

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
export const headers = {
  apikey: process.env.SUPABASE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// 📤 Enviar mensajes
export async function enviarMensaje(chatId, texto, modo = null, botones = null) {
  if (!chatId || !texto) return console.error('🚫 Falta chatId o texto para enviarMensaje');

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
    if (!result.ok) console.error('🚨 Telegram no envió mensaje:', result.description);
  } catch (error) {
    console.error('💥 Error al enviar mensaje:', error.message);
  }
}

// 🧼 Eliminar botones
export async function eliminarBotones(chatId, messageId) {
  if (!chatId || !messageId) return console.error('🚫 chatId o messageId faltante para eliminarBotones');

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

// 🎂 Calcular edad
export function calcularEdad(fechanac) {
  if (!fechanac) return 'N/A';
  const nacimiento = new Date(fechanac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

// ✨ Limpiar texto Markdown
export function limpiarTextoMarkdown(texto) {
  if (!texto) return '';
  return texto
    .replace(/[*_`\[\]]/g, '')
    .replace(/</g, '‹')
    .replace(/>/g, '›');
}

// 📤 Enviar archivo (Excel o PDF desde Buffer)
export async function enviarArchivo(chatId, buffer, nombreArchivo) {
  if (!chatId || !buffer || !nombreArchivo) return console.error('🚫 Parámetros incompletos para enviarArchivo');

  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('document', buffer, { filename: nombreArchivo });

  try {
    const response = await fetch(`${TELEGRAM_API}/sendDocument`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    const result = await response.json();
    if (!result.ok) console.error('🚨 Telegram no envió el archivo:', result.description);
  } catch (error) {
    console.error('💥 Error al enviar archivo:', error.message);
  }
}

// 📄 Enviar documento generado como Buffer, File o Blob
export async function enviarDocumento(chatId, archivo, nombre = 'Resumen_Totalizado.pdf') {
  if (!chatId || !archivo) {
    console.error('🚫 Parámetros incompletos para enviarDocumento');
    return;
  }

  const form = new FormData();
  form.append('chat_id', chatId);

  try {
    if (archivo instanceof Buffer) {
      console.log('📦 Documento recibido como Buffer. Tamaño:', archivo.length);
      form.append('document', archivo, { filename: nombre });
    } else if (archivo && typeof archivo.arrayBuffer === 'function') {
      const arrayBuffer = await archivo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log('📦 Documento convertido desde Blob/File. Tamaño:', buffer.length);
      form.append('document', buffer, { filename: nombre });
    } else {
      console.error('🚫 Tipo de archivo no soportado para enviarDocumento. Tipo recibido:', typeof archivo);
      return;
    }

    const response = await fetch(`${TELEGRAM_API}/sendDocument`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    const result = await response.json();
    if (!result.ok) {
      console.error('🚨 Telegram no envió el documento:', result.description);
    } else {
      console.log('✅ Documento enviado correctamente a Telegram');
    }
  } catch (error) {
    console.error('💥 Error al enviar documento:', error.message);
  }
}

// 📊 Consulta datos desde Supabase
export async function obtenerDatosCrudos() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/participacion_bot?select=cedula,respuesta,chat_id,datos(cedula,elector,fechanac,parroquia,nombre_centro)`;
  try {
    const response = await fetch(url, { method: 'GET', headers });
    const data = await response.json();
    console.log('📊 Datos crudos recibidos:', JSON.stringify(data, null, 2));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('💥 Error al obtener datos crudos:', error.message);
    return [];
  }
}
