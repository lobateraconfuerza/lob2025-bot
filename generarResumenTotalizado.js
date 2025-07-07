// generarResumenTotalizado.js

import { obtenerDatosCrudos } from './utils.js';
import supabase from './supabase.js';

export async function generarResumenTotalizado() {
  console.log('🧠 Iniciando totalización completa (delete + insert)');

  // ── 0️⃣ Borrar todas las filas antiguas
  const { error: errDel } = await supabase
    .from('resumen_totalizado')
    .delete()
    .neq('id', 0);         // borra todas excepto id=0, si lo tienes reservado
  if (errDel) {
    console.error('❌ No pude limpiar la tabla:', errDel.message);
    return;
  }

  // ── 1️⃣ Cálculo de electores reales por parroquia y centro
  const { data: todosElectores, error: errE } = await supabase
    .from('datos')
    .select('parroquia, codigo_centro, nombre_centro');
  if (errE) {
    console.error('❌ Falló lectura de electores:', errE.message);
    return;
  }

  // electoresMap[pq][cc] = { nombre_centro, electores }
  const electoresMap = {};
  for (const { parroquia, codigo_centro, nombre_centro } of todosElectores) {
    const pq = parroquia     || 'Sin parroquia';
    const cc = codigo_centro || 'sin-cod';
    electoresMap[pq]       ??= {};
    electoresMap[pq][cc]   ??= { nombre_centro, electores: 0 };
    electoresMap[pq][cc].electores++;
  }

  // ── 2️⃣ Cálculo de respuestas por centro/parroquia
  const votos = await obtenerDatosCrudos();
  console.log(`📦 ${votos.length} respuestas en crudo`);
  const votosMap = {};
  for (const r of votos) {
    const pq = r.datos.parroquia || 'Sin parroquia';
    const cc = r.datos.cod_cv      || 'sin-cod';
    votosMap[pq]         ??= {};
    votosMap[pq][cc]     ??= { total: 0, si: 0, no: 0, nose: 0 };
    votosMap[pq][cc].total++;
    const resp = (r.respuesta||'').toLowerCase();
    if (['si','no','nose'].includes(resp)) {
      votosMap[pq][cc][resp]++;
    }
  }

  // ── 3️⃣ Generar array de 16 filas (centros + subtotales + total general)
  const filas = [];
  let genE = 0, genV = 0, genSi = 0, genNo = 0, genNs = 0;

  // unimos las parroquias disponibles
  const parroquias = Object.keys(electoresMap);

  for (const pq of parroquias) {
    let subE = 0, subV = 0, subSi = 0, subNo = 0, subNs = 0;

    // recorremos SOLO los centros que realmente existen en electoresMap[pq]
    const centros = Object.keys(electoresMap[pq]);

    for (const cc of centros) {
      const { nombre_centro, electores } = electoresMap[pq][cc];
      const { total=0, si=0, no=0, nose=0 } = votosMap[pq]?.[cc] || {};

      // acumuladores
      subE  += electores;
      subV  += total;
      subSi += si;
      subNo += no;
      subNs += nose;
      genE  += electores;
      genV  += total;
      genSi += si;
      genNo += no;
      genNs += nose;

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
          ? Number(((total / electores) * 100).toFixed(2))
          : 0.0,
        porcentaje_si: total
          ? Number(((si / total) * 100).toFixed(2))
          : 0.0,
        porcentaje_nose: total
          ? Number(((nose / total) * 100).toFixed(2))
          : 0.0,
        porcentaje_no: total
          ? Number(((no / total) * 100).toFixed(2))
          : 0.0,
        es_subtotal: false
      });
    }

    // fila subtotal parroquia
    filas.push({
      parroquia: pq,
      codigo_centro: '0',
      nombre_centro: `TOTAL PARROQUIA ${pq}`,
      electores: subE,
      encuestados: subV,
      si: subSi,
      nose: subNs,
      no: subNo,
      porcentaje_participacion: subE
        ? Number(((subV / subE) * 100).toFixed(2))
        : 0.0,
      porcentaje_si: subV
        ? Number(((subSi / subV) * 100).toFixed(2))
        : 0.0,
      porcentaje_nose: subV
        ? Number(((subNs / subV) * 100).toFixed(2))
        : 0.0,
      porcentaje_no: subV
        ? Number(((subNo / subV) * 100).toFixed(2))
        : 0.0,
      es_subtotal: true
    });
  }

  // fila TOTAL GENERAL
  filas.push({
    parroquia: '',
    codigo_centro: '0',
    nombre_centro: 'TOTAL GENERAL',
    electores: genE,
    encuestados: genV,
    si: genSi,
    nose: genNs,
    no: genNo,
    porcentaje_participacion: genE
      ? Number(((genV / genE) * 100).toFixed(2))
      : 0.0,
    porcentaje_si: genV
      ? Number(((genSi / genV) * 100).toFixed(2))
      : 0.0,
    porcentaje_nose: genV
      ? Number(((genNs / genV) * 100).toFixed(2))
      : 0.0,
    porcentaje_no: genV
      ? Number(((genNo / genV) * 100).toFixed(2))
      : 0.0,
    es_subtotal: true
  });

  console.log(`🔢 Insertando ${filas.length} filas (deben ser 16)`);
  if (filas.length !== 16) {
    console.warn(
      `⚠️ Se esperaban 16 filas pero se generaron ${filas.length}.`
    );
  }

  // ── 4️⃣ Insertar TODO de una sola vez
  const { error: errIns } = await supabase
    .from('resumen_totalizado')
    .insert(filas);

  if (errIns) {
    console.error('❌ Error insertando resumen:', errIns.message);
  } else {
    console.log(`✅ Resumen totalizado creado: ${filas.length} filas`);
  }
}