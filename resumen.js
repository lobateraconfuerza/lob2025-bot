// resumen.js
import { generarResumenTotalizado } from './generarResumenTotalizado.js';
import { crearPDFResumen } from './generarPDFResumen.js'; // <-- NUEVO
import { enviarMensaje } from './utils.js';

export async function resumen(chatId) {
  try {
    await generarResumenTotalizado(); // 1️⃣ Actualiza los datos
    await crearPDFResumen();          // 2️⃣ Genera y guarda el PDF con gráficos
    await enviarMensaje(chatId, '✅ La totalización y el resumen gráfico fueron generados correctamente.');
  } catch (err) {
    console.error('❌ Error al generar el resumen:', err);
    await enviarMensaje(chatId, '⚠️ Ocurrió un error al generar la totalización o el resumen gráfico.');
  }
}