// resumen.js
import { generarResumenTotalizado } from './generarResumenTotalizado.js';
import { crearExcelResumen } from './generarExcelResumen.js'; // <-- nuevo
import { enviarMensaje } from './utils.js';

export async function resumen(chatId) {
  try {
    await generarResumenTotalizado();   // 1️⃣ ya lo calculaste
    await crearExcelResumen(chatId);    // 2️⃣ Genera y envía el Excel
    await enviarMensaje(chatId, '✅ Totalización y hoja Excel enviada correctamente.');
  } catch (err) {
    console.error('❌ Error al generar resumen:', err);
    await enviarMensaje(chatId, '⚠️ Ocurrió un error al generar o enviar el resumen en Excel.');
  }
}
