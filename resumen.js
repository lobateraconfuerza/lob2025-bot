// resumen.js – Lobatera + Fuerte: generación PDF completa
import PDFDocument from 'pdfkit';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

// 🔌 Headers Supabase
const headers = {
  'apikey': process.env.SUPABASE_KEY,
  'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// 📊 Consulta registros
async function obtenerResumenDatos() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/participacion_bot?select=respuesta,cedula,datos(parroquia,codcv,nombre_centro)&order=datos.parroquia.asc`;

  try {
    const response = await fetch(url, { method: 'GET', headers });
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('💥 Error en resumen Supabase:', error.message);
    return [];
  }
}

// 📄 PDF visual completo
export async function generarResumenPDF() {
  const registros = await obtenerResumenDatos();
  const agrupado = {};

  for (const r of registros) {
    const { parroquia, codcv, nombre_centro } = r.datos || {};
    if (!parroquia || !nombre_centro) continue;

    if (!agrupado[parroquia]) agrupado[parroquia] = {};
    const centroKey = `${codcv} - ${nombre_centro}`;
    if (!agrupado[parroquia][centroKey]) agrupado[parroquia][centroKey] = { si: 0, nose: 0, no: 0 };

    if (r.respuesta === 'si') agrupado[parroquia][centroKey].si++;
    else if (r.respuesta === 'nose') agrupado[parroquia][centroKey].nose++;
    else if (r.respuesta === 'no') agrupado[parroquia][centroKey].no++;
  }

  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  // 🖼️ Logo institucional (si existe localmente)
  try {
    doc.image('logo.png', 50, 40, { width: 60 });
  } catch {}

  // 📝 Encabezado institucional
  doc.fontSize(18).text('Lobatera + Fuerte', { align: 'center' }).moveDown(0.5);
  doc.fontSize(14).text('📄 Resumen General de Participación Comunitaria', { align: 'center' });
  doc.moveDown(0.5);

  const fecha = new Date().toLocaleDateString('es-VE');
  doc.fontSize(11).text(`Fecha de emisión: ${fecha}`, { align: 'right' }).moveDown();

  const totalGlobal = { si: 0, nose: 0, no: 0 };

  for (const parroquia in agrupado) {
    doc.moveDown().fontSize(13).text(`📍 Parroquia: ${parroquia}`, { underline: true });

    for (const centro in agrupado[parroquia]) {
      const datos = agrupado[parroquia][centro];
      const total = datos.si + datos.nose + datos.no;

      const p_si = ((datos.si / total) * 100).toFixed(1);
      const p_nose = ((datos.nose / total) * 100).toFixed(1);
      const p_no = ((datos.no / total) * 100).toFixed(1);

      doc.moveDown(0.5).fontSize(12).text(`🏫 ${centro}`);
      doc.text(`👥 Total entrevistados: ${total}`);
      doc.text(`✅ Sí: ${datos.si} (${p_si}%)`);
      doc.text(`🤔 No sé: ${datos.nose} (${p_nose}%)`);
      doc.text(`❌ No: ${datos.no} (${p_no}%)`);

      totalGlobal.si += datos.si;
      totalGlobal.nose += datos.nose;
      totalGlobal.no += datos.no;
    }

    doc.moveDown(1);
  }

  // 📊 Totales generales
  const totalFinal = totalGlobal.si + totalGlobal.nose + totalGlobal.no;
  const t_si = ((totalGlobal.si / totalFinal) * 100).toFixed(1);
  const t_nose = ((totalGlobal.nose / totalFinal) * 100).toFixed(1);
  const t_no = ((totalGlobal.no / totalFinal) * 100).toFixed(1);

  doc.fontSize(14).text('📈 Totales Generales', { underline: true });
  doc.fontSize(12).text(`Total encuestados: ${totalFinal}`);
  doc.text(`✅ Sí: ${totalGlobal.si} (${t_si}%)`);
  doc.text(`🤔 No sé: ${totalGlobal.nose} (${t_nose}%)`);
  doc.text(`❌ No: ${totalGlobal.no} (${t_no}%)`);

  // ✨ Pie de página institucional
  doc.moveDown(2);
  doc.fontSize(10).text('Este resumen refleja la participación digital ciudadana organizada desde la comunidad Lobatera + Fuerte.\nCoordinación técnica comunitaria. Datos procesados vía bot institucional.', {
    align: 'center'
  });

  doc.end();

  const buffer = await new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });

  return { buffer };
}