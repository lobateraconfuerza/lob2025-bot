import PDFDocument from 'pdfkit';
import { obtenerDatosCrudos, enviarArchivo } from './utils.js';
import fs from 'fs';

export async function generarResumenPDF(chatId) {
  if (!chatId) return console.error('🚫 chatId no proporcionado');

  const registros = await obtenerDatosCrudos();
  if (!registros.length) return console.warn('⚠️ No hay registros');

  // Agrupación por parroquia y centro
  const agrupado = {};
  for (const r of registros) {
    const d = r.datos ?? {};
    const parroquia = d.parroquia ?? 'Sin parroquia';
    const centro = d.nombre_centro ?? 'Centro desconocido';
    const codCV = d.cod_cv ?? '';
    const electores = Number(d.electores) || 0;

    if (!agrupado[parroquia]) agrupado[parroquia] = {};
    const clave = `${codCV}||${centro}`;

    if (!agrupado[parroquia][clave]) {
      agrupado[parroquia][clave] = { electores, total: 0, si: 0, nose: 0, no: 0 };
    }

    const res = r.respuesta?.toLowerCase();
    agrupado[parroquia][clave].total++;
    if (['si', 'nose', 'no'].includes(res)) agrupado[parroquia][clave][res]++;
  }

  const formato = (v) => isFinite(v) ? v.toFixed(1) : '0.0';

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', async () => {
    const pdfBuffer = Buffer.concat(buffers);
    await enviarArchivo(chatId, pdfBuffer, 'resumen.pdf');
  });

  // Logo + encabezado
  doc.addPage();
  try {
    if (fs.existsSync('logo.png')) {
      doc.image('logo.png', { fit: [80, 80], align: 'center', valign: 'top' });
      doc.moveDown();
    }
  } catch (err) {
    console.warn('⚠️ Logo no insertado:', err.message);
  }

  doc.font('Helvetica');
  doc.fontSize(18).text('Lobatera + Fuerte', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Informe de Participación por Centro de Votación', { align: 'center' });
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown();

  let totalElectores = 0, totalEncuestados = 0, totalSi = 0, totalNo = 0, totalNose = 0;

  for (const parroquia in agrupado) {
    doc.addPage();
    doc.fontSize(14).text(`Parroquia: ${parroquia}`, { underline: true });
    doc.moveDown();

    const centros = Object.entries(agrupado[parroquia])
      .filter(([, d]) => d.total > 0); // solo con encuestados

    if (centros.length === 0) {
      doc.fontSize(10).text('No se registraron encuestas en esta parroquia.');
      continue;
    }

    let count = 0;
    for (let i = 0; i < centros.length; i++) {
      const [clave, datos] = centros[i];
      const [codCV, nombreCentro] = clave.split('||');
      const { electores, total, si, nose, no } = datos;

      const xBase = count % 2 === 0 ? 50 : 300;
      const yBase = 100 + Math.floor(count / 2) % 2 * 220;

      const pctPart = electores > 0 ? formato((total / electores) * 100) : '0.0';
      const pctSi = total > 0 ? formato((si / total) * 100) : '0.0';
      const pctNose = total > 0 ? formato((nose / total) * 100) : '0.0';
      const pctNo = total > 0 ? formato((no / total) * 100) : '0.0';

      doc.fontSize(9).text(`Centro de votación: ${nombreCentro}`, xBase, yBase);
      doc.text(`Código CV: ${codCV}`, xBase);
      doc.text(`Electores registrados: ${electores}`, xBase);
      doc.text(`Encuestados: ${total}`, xBase);
      doc.text(`Participación: ${pctPart}%`, xBase);
      doc.text(`Sí: ${si} (${pctSi}%)`, xBase);
      doc.text(`No sé: ${nose} (${pctNose}%)`, xBase);
      doc.text(`No: ${no} (${pctNo}%)`, xBase);

      totalElectores += electores;
      totalEncuestados += total;
      totalSi += si;
      totalNose += nose;
      totalNo += no;
      count++;

      if (count % 4 === 0) doc.addPage();
    }

    const subtotal = centros.reduce((acc, [, d]) => acc + d.total, 0);
    doc.moveDown();
    doc.fontSize(10).text(`Subtotal de encuestados en la parroquia ${parroquia}: ${subtotal}`);
  }

  const globalPart = totalElectores > 0 ? formato((totalEncuestados / totalElectores) * 100) : '0.0';
  const globalSi = totalEncuestados > 0 ? formato((totalSi / totalEncuestados) * 100) : '0.0';
  const globalNose = totalEncuestados > 0 ? formato((totalNose / totalEncuestados) * 100) : '0.0';
  const globalNo = totalEncuestados > 0 ? formato((totalNo / totalEncuestados) * 100) : '0.0';

  doc.addPage();
  doc.fontSize(12).text('Resumen Final Global', { underline: true });
  doc.moveDown();
  doc.fontSize(10).text(`Total electores: ${totalElectores}`);
  doc.text(`Total encuestados: ${totalEncuestados}`);
  doc.text(`Participación global: ${globalPart}%`);
  doc.text(`Sí: ${totalSi} (${globalSi}%)`);
  doc.text(`No sé: ${totalNose} (${globalNose}%)`);
  doc.text(`No: ${totalNo} (${globalNo}%)`);

  doc.moveDown();
  doc.fontSize(8).text('Este informe refleja la participación ciudadana organizada desde Lobatera + Fuerte, agrupada por parroquia y centro de votación.');
  doc.end();
}