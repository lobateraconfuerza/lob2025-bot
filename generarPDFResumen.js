//📂 generarPDFResumen.js
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import supabase from './supabase.js';
import { enviarDocumento } from './utils.js';

export async function crearPDFResumen(chatId) {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const margin = 10;

    // 🏛️ Encabezado institucional
    doc.setFontSize(14);
    doc.setTextColor(44);
    doc.text('📊 Resumen Totalizado de Participación Ciudadana', margin, 15);

    // 📥 1. Leer datos de resumen_totalizado
    const { data: resumen, error } = await supabase
      .from('resumen_totalizado')
      .select(
        'codigo_centro, nombre_centro, parroquia, si, no, nose, porcentaje_si, porcentaje_no, porcentaje_nose, porcentaje_participacion'
      )
      .eq('es_subtotal', false);

    if (error) throw error;

    // 🔍 2. Separar fila TOTAL GENERAL y centros normales
    const totalGeneral = resumen.find(r => r.nombre_centro === 'TOTAL GENERAL');
    const centros = resumen.filter(r => r.nombre_centro !== 'TOTAL GENERAL');

    // 🌡️ 3. Termómetro de participación (desde TOTAL GENERAL)
    if (totalGeneral) {
      const pPart = parseFloat(totalGeneral.porcentaje_participacion).toFixed(1);
      const ancho = pPart * 2.5;
      const y = 25;

      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text(`Participación Total: ${pPart}%`, margin, y - 6);
      doc.setFillColor('#1976D2');
      doc.rect(margin, y, ancho, 10, 'F');
    }

    // 📊 4. Tabla resumen por centro
    const tablaBody = centros.map(c => [
      c.codigo_centro,
      c.nombre_centro,
      c.parroquia,
      c.si,
      c.no,
      c.nose,
      `${c.porcentaje_si}%`,
      `${c.porcentaje_no}%`,
      `${c.porcentaje_nose}%`
    ]);

    try {
      doc.autoTable({
        head: [['Código', 'Centro', 'Parroquia', 'Sí', 'No', 'No sé', '% Sí', '% No', '% No sé']],
        body: tablaBody,
        startY: 50,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [33, 150, 243] }
      });
    } catch (tableError) {
      console.error('🚨 Error generando la tabla con autoTable:', tableError.message);
      return;
    }

    // 📤 5. Exportar y enviar (para entorno Node.js)
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // 🔍 Validación: ¿está vacío o inválido?
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('🚨 El PDF generado está vacío o inválido');
      return;
    }

    console.log('📦 PDF generado correctamente. Tamaño:', pdfBuffer.length, 'bytes');

    await enviarDocumento(chatId, pdfBuffer, 'Resumen_Totalizado.pdf');
  } catch (err) {
    console.error('❌ Error generando PDF resumen:', err.message);
    throw err;
  }
}