// generarResumenTotalizado.js

import { obtenerDatosCrudos } from './utils.js';
import supabase from './supabase.js';

export async function generarResumenTotalizado() {
  console.log('🧠 Entrando a generarResumenTotalizado');

  // ── 1️⃣ Proceso A: contar electores reales por parroquia y centro
  const { data: allDatos, error: errDatos } = await supabase
    .from('datos')
    .select('parroquia, codigo_centro, nombre_centro');

  if (errDatos) {
    console.error('❌ Error obteniendo tabla datos:', errDatos.message);
    return;
  }

  // Agrupar electores: { [parroquia]: { [codigo_centro]: { nombre, electores } } }
  const electoresMap = {};
  for (const row of allDatos) {
    const pq = row.parroquia ?? 'Sin parroquia';
    const cc = row.codigo_centro ?? 'sin-cod';
    const nm = row.nombre_centro ?? 'Centro sin nombre';

    electoresMap[pq] ??= {};
    electoresMap[pq][cc] ??= { nombre_centro: nm, electores: 0 };
    electoresMap[pq][cc].electores++;
  }

  // ── 2️⃣ Proceso B: agrupar respuestas de encuesta por parroquia y centro
  const registros = await obtenerDatosCrudos();
  console.log(`📦 Respuestas de encuesta recibidas: ${registros.length}`);
  const statsMap = {}; // { [parroquia]: { [codigo_centro]: { total, si, no, nose } } }

  for (const r of registros) {
    const d = r.datos || {};
    const pq = d.parroquia ?? 'Sin parroquia';
    const cc = d.cod_cv ?? 'sin-cod';

    statsMap[pq] ??= {};
    statsMap[pq][cc] ??= { total: 0, si: 0, no: 0, nose: 0 };
    const cell = statsMap[pq][cc];
    cell.total++;
    const resp = (r.respuesta || '').toLowerCase();
    if (['si','no','nose'].includes(resp)) cell[resp]++;
  }

  // ── 3️⃣ Vaciar tabla resumen_totalizado
  const { error: errDel } = await supabase
    .from('resumen_totalizado')
    .delete()
    .neq('id', 0);

  if (errDel) {
    console.error('❌ Error limpiando resumen_totalizado:', errDel.message);
    return;
  }

  // ── 4️⃣ Construir filas combinadas y subtotales por parroquia
  const filas = [];
  for (const pq of Object.keys(electoresMap)) {
    let subElect = 0, subEncu = 0, subSi = 0, subNo = 0, subNose = 0;
    const centros = electoresMap[pq];

    for (const cc of Object.keys(centros)) {
      const { nombre_centro, electores } = centros[cc];
      const stats = statsMap[pq]?.[cc] ?? { total: 0, si: 0, no: 0, nose: 0 };
      const { total, si, no, nose } = stats;

      filas.push({
        parroquia: pq,
        codigo_centro: cc,
        nombre_centro,
        electores,
        encuestados: total,
        si,
        nose,
        no,
        porcentaje_participacion: electores
          ? ((total / electores) * 100).toFixed(2)
          : '0.00',
        porcentaje_si: total
          ? ((si / total) * 100).toFixed(2)
          : '0.00',
        porcentaje_nose: total
          ? ((nose / total) * 100).toFixed(2)
          : '0.00',
        porcentaje_no: total
          ? ((no / total) * 100).toFixed(2)
          : '0.00',
        es_subtotal: false
      });

      subElect += electores;
      subEncu += total;
      subSi    += si;
      subNo    += no;
      subNose  += nose;
    }

    // fila subtotal parroquia
    filas.push({
      parroquia: pq,
      codigo_centro: '',
      nombre_centro: 'TOTAL PARROQUIA',
      electores: subElect,
      encuestados: subEncu,
      si: subSi,
      nose: subNose,
      no: subNo,
      porcentaje_participacion: subElect
        ? ((subEncu / subElect) * 100).toFixed(2)
        : '0.00',
      porcentaje_si: subEncu
        ? ((subSi / subEncu) * 100).toFixed(2)
        : '0.00',
      porcentaje_nose: subEncu
        ? ((subNose / subEncu) * 100).toFixed(2)
        : '0.00',
      porcentaje_no: subEncu
        ? ((subNo / subEncu) * 100).toFixed(2)
        : '0.00',
      es_subtotal: true
    });
  }

  // ── 5️⃣ Insertar todas las filas
  console.log(`🧾 Filas preparadas para insertar: ${filas.length}`);
  const { error: errIns } = await supabase
    .from('resumen_totalizado')
    .insert(filas);

  if (errIns) {
    console.error('❌ Error insertando totales:', errIns.message);
  } else {
    console.log(`✅ Totalización insertada: ${filas.length} filas`);
  }
}