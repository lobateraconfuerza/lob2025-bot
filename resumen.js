import { generarResumenTotalizado } from './generarResumenTotalizado.js';
import { enviarMensaje } from './utils.js';

export async function resumen(chatId) {
  try {
    await generarResumenTotalizado();
    await enviarMensaje(chatId, '✅ La totalización ya fue generada correctamente.');
  } catch (err) {
    console.error('❌ Error al generar resumen:', err);
    await enviarMensaje(chatId, '⚠️ Ocurrió un error al generar la totalización.');
  }
}