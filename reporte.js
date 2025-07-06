// reporte.js – Genera archivo Excel de participación bruta
import ExcelJS from 'exceljs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

// 🔌 Supabase acceso
const headers = {
  'apikey': process.env.SUPABASE_KEY,
  'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// 📦 Consulta participación + datos
async function obtenerDatosCrudos() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/participacion_bot?select=cedula,respuesta,chat_id,datos(cedula,elector,fechanac,parroquia,codcv,nombre_centro)&order=datos.nombre_centro.asc`;

  try {
    const response = await fetch(url, { method: 'GET', headers });
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('💥 Error al obtener datos crudos:', error.message);
    return [];
  }
}

// 📊 Función principal para comando /reporte
export async function generarReporteGeneral() {
  const registros = await obtenerDatosCrudos();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Participación');

  // 🧩 Encabezados
  sheet.columns = [
    { header: 'Cédula', key: 'cedula', width: 15 },
    { header: 'Nombre y Apellido', key: 'elector', width: 30 },
    { header: 'Edad', key: 'edad', width: 10 },
    { header: 'Parroquia', key: 'parroquia', width: 15 },
    { header: 'Código CV', key: 'codcv', width: 12 },
    { header: 'Centro Electoral', key: 'nombre_centro', width: 35 },
    { header: 'Respuesta', key: 'respuesta', width: 10 }
  ];

  // 🔢 Llenamos datos
  for (const registro of registros) {
    const datos = registro.datos;
    const nacimiento = new Date(datos?.fechanac);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;

    sheet.addRow({
      cedula: datos?.cedula ?? registro.cedula,
      elector: datos?.elector ?? 'No disponible',
      edad,
      parroquia: datos?.parroquia ?? 'N/A',
      codcv: datos?.codcv ?? 'N/A',
      nombre_centro: datos?.nombre_centro ?? 'N/A',
      respuesta: registro.respuesta ?? 'N/A'
    });
  }

  // 📤 Exportamos como Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer };
}