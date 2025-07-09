import ExcelJS from 'exceljs';
import supabase from './supabase.js';
import { enviarArchivo } from './utils.js';

export async function crearExcelResumen(chatId) {
  try {
    // 🔍 1. Obtener los datos calculados desde Supabase
    const { data: resumen, error } = await supabase
      .from('resumen_totalizado')
      .select(
        'codigo_centro, nombre_centro, parroquia, electores, si, no, nose, porcentaje_si, porcentaje_no, porcentaje_nose, porcentaje_participacion'
      )
      .eq('es_subtotal', false);

    if (error) throw error;

    // 🧮 2. Crear libro y hoja de cálculo
    const workbook = new ExcelJS.Workbook();
    const hoja = workbook.addWorksheet('Resumen_Totalizado');

    // 📝 3. Encabezados
    hoja.addRow([
      'Código', 'Centro', 'Parroquia', 'Electores',
      'Sí', 'No', 'No sé',
      '% Sí', '% No', '% No sé', '% Participación'
    ]);

    // 📊 4. Insertar filas
    resumen.forEach(registro => {
      hoja.addRow([
        registro.codigo_centro,
        registro.nombre_centro,
        registro.parroquia,
        registro.electores,
        registro.si,
        registro.no,
        registro.nose,
        `${registro.porcentaje_si}%`,
        `${registro.porcentaje_no}%`,
        `${registro.porcentaje_nose}%`,
        `${registro.porcentaje_participacion}%`
      ]);
    });

    // 📦 5. Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 📤 6. Enviar por Telegram como archivo Excel
    await enviarArchivo(chatId, buffer, 'Resumen_Totalizado.xlsx');

    console.log('✅ Excel generado y enviado correctamente');
  } catch (err) {
    console.error('❌ Error al generar Excel resumen:', err.message);
    throw err;
  }
}
