// reporte.js – Reporte completo en Excel
import ExcelJS from 'exceljs';
import { obtenerDatosCrudos, calcularEdad, enviarArchivo } from './utils.js';

export async function generarReporteGeneral(chatId) {
  if (!chatId) {
    console.error('🚫 chatId no proporcionado para reporte Excel');
    return;
  }

  const registros = await obtenerDatosCrudos();
  if (!registros.length) {
    console.warn('⚠️ No se encontraron registros para generar el Excel');
    return;
  }

  registros.sort((a, b) => {
    const centroA = a.datos?.nombre_centro ?? '';
    const centroB = b.datos?.nombre_centro ?? '';
    return centroA.localeCompare(centroB);
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Participación');

  sheet.columns = [
    { header: 'Cédula', key: 'cedula', width: 15 },
    { header: 'Nombre', key: 'elector', width: 30 },
    { header: 'Edad', key: 'edad', width: 10 },
    { header: 'Parroquia', key: 'parroquia', width: 15 },
    { header: 'Centro Electoral', key: 'centro', width: 35 },
    { header: 'Respuesta', key: 'respuesta', width: 10 }
  ];

  for (const r of registros) {
    const d = r.datos ?? {};
    const edad = calcularEdad(d.fechanac);
    sheet.addRow({
      cedula: d.cedula ?? r.cedula,
      elector: d.elector ?? 'No disponible',
      edad,
      parroquia: d.parroquia ?? 'N/A',
      centro: d.nombre_centro ?? 'N/A',
      respuesta: r.respuesta
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  console.log(`📤 Excel generado. Enviando a chatId: ${chatId}`);
  await enviarArchivo(chatId, buffer, 'reporte.xlsx');
}