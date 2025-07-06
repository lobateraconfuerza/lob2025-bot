// resumen.js – Resumen general con totales
import PDFDocument from 'pdfkit';
import { obtenerDatosCrudos, enviarArchivo } from './utils.js';

export async function generarResumenPDF(chatId) {
  const registros = await obtenerDatosCrudos();
  const totales = { si: 0, nose: 0, no: 0 };
  for (const r of registros) {
    if (['si', 'nose', 'no'].includes(r.respuesta)) totales[r.respuesta]++;
  }
  const total = totales.si + totales.nose + totales.no;
  const doc = new PDFDocument();
  const buffers = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', async () => {
    const pdfBuffer = Buffer.concat(buffers);
    await enviarArchivo(chatId, pdfBuffer, 'resumen.pdf');
  });

  doc.fontSize(20).text('Lobatera + Fuerte 💪🇻🇪', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Resumen General de Participación`);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  doc.text(`Total encuestados: ${total}`);
  doc.text(`✅ Sí: ${totales.si} (${((totales.si / total) * 100 || 0).toFixed(1)}%)`);
  doc.text(`🤔 No sé: ${totales.nose} (${((totales.nose / total) * 100 || 0).toFixed(1)}%)`);
  doc.text(`❌ No: ${totales.no} (${((totales.no / total) * 100 || 0).toFixed(1)}%)`);

  doc.moveDown();
  doc.fontSize(10).text('Este resumen refleja la participación digital ciudadana organizada desde Lobatera + Fuerte.');
  doc.end();
}