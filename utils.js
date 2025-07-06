// utils.js – Funciones de utilidad para el bot Lobatera + Fuerte
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import FormData from 'form-data';
dotenv.config();

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

// 📤 Enviar mensajes a Telegram
export async function enviarMensaje(chatId, texto, modo = null, botones = null) {
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

// 🧼 Eliminar botones después de interacción
export async function eliminarBotones(chatId, messageId) {
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

// 🎂 Calcular edad desde fecha de nacimiento
export function calcularEdad(fechanac) {
  const nacimiento = new Date(fechanac);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

// ✨ Limpiar caracteres especiales para Markdown
export function limpiarTextoMarkdown(texto) {
  return texto
    .replace(/[*_`\[\]]/g, '')
    .replace(/</g, '‹')
    .replace(/>/g, '›');
}

// 📤 Enviar archivo (Excel o PDF) al usuario
export async function enviarArchivo(chatId, buffer, nombreArchivo) {
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
    if (!result.ok) {
      console.error('🚨 Telegram no envió el archivo:', result.description);
    }
  } catch (error) {
    console.error('💥 Error al enviar archivo:', error.message);
  }
}