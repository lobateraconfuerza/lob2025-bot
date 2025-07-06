// resumen.js – Resumen general con totales
import PDFDocument from 'pdfkit';
import { obtenerDatosCrudos, enviarArchivo } from './utils.js';

export async function generarResumenPDF(chatId) {
  if (!chatId) {
    console.error('🚫 chatId no proporcionado para resumen PDF');
    return;
  }

  const registros = await obtenerDatosCrudos();
  if (!registros.length) {
    console.warn('⚠️ No se encontraron registros para generar el resumen');
    return;
  }

  const totales = { si: 0, nose: 0, no: 0 };
  for (const r of registros) {
    const respuesta = r.respuesta?.toLowerCase();
    if (totales.hasOwnProperty(respuesta)) totales[respuesta]++;
  }

  const total = totales.si + totales.nose + totales.no;
  const doc = new PDFDocument();
  const buffers = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', async () => {
    const pdfBuffer = Buffer.concat(buffers);
    console.log(`📤 Resumen PDF generado. Enviando a chatId: ${chatId}`);
    await enviarArchivo(chatId, pdfBuffer, 'resumen.pdf');
  });

  doc.fontSize(20).text('Lobatera + Fuerte 💪🇻🇪', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text('Resumen General de Participación');
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  doc.text(`Total encuestados: ${total.toLocaleString()}`);
  doc.text(`✅ Sí: ${totales.si.toLocaleString()} (${((totales.si / total) * 100 || 0).toFixed(1)}%)`);
  doc.text(`🤔 No sé: ${totales.nose.toLocaleString()} (${((totales.nose / total) * 100 || 0).toFixed(1)}%)`);
  doc.text(`❌ No: ${totales.no.toLocaleString()} (${((totales.no / total) * 100 || 0).toFixed(1)}%)`);

  doc.moveDown();
  doc.fontSize(10).text('Este resumen refleja la participación digital ciudadana organizada desde Lobatera + Fuerte.');
  doc.end();
}