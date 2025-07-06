// resumen.js – Reporte técnico por centro de votación
import PDFDocument from 'pdfkit';
import { obtenerDatosCrudos, enviarArchivo } from './utils.js';
import fs from 'fs';

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

  // Agrupar por centro de votación
  const mapa = new Map();
  for (const r of registros) {
    const d = r.datos ?? {};
    const centro = d.nombre_centro ?? 'Centro desconocido';
    const parroquia = d.parroquia ?? 'Sin parroquia';
    const codCV = d.cod_cv ?? ''; // solo si lo tienes en los datos
    const key = `${parroquia}|${codCV}|${centro}`;

    if (!mapa.has(key)) {
      mapa.set(key, { total: 0, si: 0, nose: 0, no: 0 });
    }

    const actual = mapa.get(key);
    actual.total++;
    const respuesta = r.respuesta?.toLowerCase();
    if (actual.hasOwnProperty(respuesta)) actual[respuesta]++;
  }

  const formato = (v) => (isFinite(v) ? v.toFixed(1) : '0.0');

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', async () => {
    const pdfBuffer = Buffer.concat(buffers);
    console.log(`📤 Resumen técnico PDF generado. Enviando a chatId: ${chatId}`);
    await enviarArchivo(chatId, pdfBuffer, 'resumen.pdf');
  });

  // 🖼️ Logo + encabezado institucional
  try {
    if (fs.existsSync('logo.png')) {
      doc.image('logo.png', { fit: [80, 80], align: 'center', valign: 'top' });
      doc.moveDown();
    }
  } catch (err) {
    console.warn('⚠️ No se pudo insertar el logo:', err.message);
  }

  doc.font('Helvetica');
  doc.fontSize(20).text('Lobatera + Fuerte 💪🇻🇪', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text('Resumen Técnico por Centro de Votación');
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  // 📊 Encabezado tipo tabla
  doc.fontSize(9).text(
    `# | PARROQUIA | CÓD. CV | CENTRO DE VOTACIÓN | ENCUESTADOS | % SÍ | % NO SÉ | % NO`,
    { underline: true }
  );
  doc.moveDown(0.5);

  let index = 1;
  for (const [key, datos] of mapa.entries()) {
    const [parroquia, codCV, centro] = key.split('|');
    const { total, si, nose, no } = datos;

    const pctSi = formato((si / total) * 100);
    const pctNose = formato((nose / total) * 100);
    const pctNo = formato((no / total) * 100);

    doc.text(`${index} | ${parroquia} | ${codCV} | ${centro} | ${total} | ${pctSi}% | ${pctNose}% | ${pctNo}%`);
    index++;
  }

  doc.moveDown();
  doc.fontSize(8).text('Este reporte refleja la participación digital comunitaria organizada desde Lobatera + Fuerte.');
  doc.end();
}