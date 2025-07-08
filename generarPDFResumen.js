//📂 generarPDFResumen.js

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import supabase from './supabase.js';
import { enviarDocumento } from './utils.js'; // Asegúrate de que esta función esté incluida

export async function crearPDFResumen(chatId) {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const margin = 10;

    // 🧠 1. Leer datos de resumen_totalizado
    const { data: centros, error } = await supabase
      .from('resumen_totalizado')
      .select('codigo_centro, parroquia, si, no, nose, porcentaje_si, porcentaje_no, porcentaje_nose')
      .eq('es_subtotal', false);

    if (error) throw error;

    // 📊 2. Calcular totales generales
    const totalSi = centros.reduce((sum, c) => sum + c.si, 0);
    const totalNo = centros.reduce((sum, c) => sum + c.no, 0);
    const totalNs = centros.reduce((sum, c) => sum + c.nose, 0);
    const total = totalSi + totalNo + totalNs;

    // 🔥 3. Termómetro de opinión
    const termometroData = [
      { label: 'No', color: '#C62828', porcentaje: ((totalNo / total) * 100).toFixed(1) },
      { label: 'No sé', color: '#FBC02D', porcentaje: ((totalNs / total) * 100).toFixed(1) },
      { label: 'Sí', color: '#43A047', porcentaje: ((totalSi / total) * 100).toFixed(1) },
    ];

    termometroData.forEach((val, i) => {
      const ancho = parseFloat(val.porcentaje) * 2.5;
      const y = 30 + i * 10;
      doc.setFillColor(val.color);
      doc.rect(margin, y, ancho, 7, 'F');
      doc.setTextColor(0);
      doc.text(`${val.label}: ${val.porcentaje}%`, margin + ancho + 2, y + 5);
    });

    // 📉 4. Tabla resumen por centro
    const tablaBody = centros.map((c) => [
      c.codigo_centro,
      c.parroquia,
      c.si,
      c.no,
      c.nose,
      `${c.porcentaje_si}%`,
      `${c.porcentaje_no}%`,
      `${c.porcentaje_nose}%`,
    ]);

    autoTable(doc, {
      head: [['Centro', 'Parroquia', 'Sí', 'No', 'No sé', '% Sí', '% No', '% No sé']],
      body: tablaBody,
      startY: 70,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [67, 160, 71] },
    });

    // 📤 5. Exportar y enviar
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], 'Resumen_Totalizado.pdf', { type: 'application/pdf' });

    await enviarDocumento(chatId, file);

  } catch (err) {
    console.error('❌ Error generando PDF resumen:', err.message);
    throw err;
  }
}