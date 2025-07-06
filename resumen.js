import { obtenerDatosCrudos, enviarArchivo } from './utils.js';
import ExcelJS from 'exceljs';

export async function generarResumenPDF(chatId) {
  if (!chatId) return console.error('🚫 chatId no proporcionado');

  const registros = await obtenerDatosCrudos();
  if (!registros.length) return console.warn('⚠️ No hay registros');

  // Agrupación por parroquia y centro
  const mapa = new Map();
  for (const r of registros) {
    const d = r.datos ?? {};
    const parroquia = d.parroquia ?? 'Sin parroquia';
    const centro = d.nombre_centro ?? 'Centro desconocido';
    const codCV = d.cod_cv ?? '';
    const electores = Number(d.electores) || 0;

    const clave = `${parroquia}|${codCV}|${centro}`;
    if (!mapa.has(clave)) {
      mapa.set(clave, { electores, total: 0, si: 0, nose: 0, no: 0 });
    }

    const actual = mapa.get(clave);
    const respuesta = r.respuesta?.toLowerCase();
    actual.total++;
    if (['si', 'nose', 'no'].includes(respuesta)) actual[respuesta]++;
  }

  // Crear el libro Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Resumen');

  // Encabezado
  sheet.addRow([
    'Parroquia',
    'Código CV',
    'Centro de Votación',
    'Electores',
    'Encuestados',
    '% Participación',
    '% Sí',
    '% No sé',
    '% No'
  ]);

  // Filas por centro
  for (const [clave, datos] of mapa.entries()) {
    const [parroquia, codCV, centro] = clave.split('|');
    const { electores, total, si, nose, no } = datos;

    const pctPart = electores > 0 ? ((total / electores) * 100).toFixed(1) : '0.0';
    const pctSi = total > 0 ? ((si / total) * 100).toFixed(1) : '0.0';
    const pctNose = total > 0 ? ((nose / total) * 100).toFixed(1) : '0.0';
    const pctNo = total > 0 ? ((no / total) * 100).toFixed(1) : '0.0';

    sheet.addRow([
      parroquia,
      codCV,
      centro,
      electores,
      total,
      pctPart,
      pctSi,
      pctNose,
      pctNo
    ]);
  }

  // Generar el buffer y enviar
  const buffer = await workbook.xlsx.writeBuffer();
  await enviarArchivo(chatId, buffer, 'resumen.xlsx');
}