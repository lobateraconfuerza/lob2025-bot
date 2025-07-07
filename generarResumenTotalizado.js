// generarResumenTotalizado.js

import { obtenerDatosCrudos } from './utils.js';
import supabase from './supabase.js';

export async function generarResumenTotalizado() {
  console.log('🧠 Iniciando actualización de resumen_totalizado');

  // 1️⃣ Leer datos de electores
  const { data: datos, error: errDatos } = await supabase
    .from('datos')
    .select('parroquia, codigo_centro, nombre_centro');
  if (errDatos) {
    console.error('❌ Error leyendo "datos":', errDatos.message);
    return;
  }

  // electoresMap[pq][cc] = { nombre_centro, electores }
  const electoresMap = {};
  for (const { parroquia, codigo_centro, nombre_centro } of datos) {
    const pq = parroquia      ?? 'Sin parroquia';
    const cc = codigo_centro  ?? 'sin-cod';
    electoresMap[pq]         ??= {};
    electoresMap[pq][cc]     ??= { nombre_centro, electores: 0 };
    electoresMap[pq][cc].electores++;
  }

  // 2️⃣ Leer respuestas de encuesta
  const respuestas = await obtenerDatosCrudos();
  console.log(`📦 Procesando ${respuestas.length} respuestas de encuesta`);

  // votosMap[pq][cc] = { total, si, no, nose }
  const votosMap = {};
  for (const r of respuestas) {
    const pq = r.datos.parroquia ?? 'Sin parroquia';
    const cc = r.datos.cod_cv      ?? 'sin-cod';
    votosMap[pq]           ??= {};
    votosMap[pq][cc]       ??= { total: 0, si: 0, no: 0, nose: 0 };
    votosMap[pq][cc].total++;
    const resp = (r.respuesta || '').toLowerCase();
    if (['si', 'no', 'nose'].includes(resp)) {
      votosMap[pq][cc][resp]++;
    }
  }

  // 3️⃣ Construir filas
  const filas = [];
  let genElect = 0, genEnc = 0, genSi = 0, genNo = 0, genNoSe = 0;

  const parroquias = new Set([
    ...Object.keys(electoresMap),
    ...Object.keys(votosMap)
  ]);

  for (const pq of parroquias) {
    let subElect = 0, subEnc = 0, subSi = 0, subNo = 0, subNoSe = 0;
    const centros = new Set([
      ...Object.keys(electoresMap[pq] ?? {}),
      ...Object.keys(votosMap[pq] ?? {})
    ]);

    for (const cc of centros) {
      const nombre   =
        electoresMap[pq]?.[cc]?.nombre_centro || 'Centro sin nombre';
      const electores= electoresMap[pq]?.[cc]?.electores || 0;
      const stats    = votosMap[pq]?.[cc] || { total:0, si:0, no:0, nose:0 };
      const { total, si, no, nose } = stats;

      filas.push({
        parroquia: pq,
        codigo_centro: cc,
        nombre_centro: nombre,
        electores,
        encuestados: total,
        si,
        nose,
        no,
        porcentaje_participacion:
          electores ? Number(((total / electores) * 100).toFixed(2)) : 0.0,
        porcentaje_si:
          total ? Number(((si / total) * 100).toFixed(2)) : 0.0,
        porcentaje_nose:
          total ? Number(((nose / total) * 100).toFixed(2)) : 0.0,
        porcentaje_no:
          total ? Number(((no / total) * 100).toFixed(2)) : 0.0,
        es_subtotal: false,
        actualizado_en: new Date().toISOString()
      });

      subElect += electores;
      subEnc   += total;
      subSi    += si;
      subNo    += no;
      subNoSe  += nose;
      genElect += electores;
      genEnc   += total;
      genSi    += si;
      genNo    += no;
      genNoSe  += nose;
    }

    // Subtotal de parroquia
    filas.push({
      parroquia: pq,
      codigo_centro: '',
      nombre_centro: `TOTAL ${pq}`,
      electores: subElect,
      encuestados: subEnc,
      si: subSi,
      nose: subNoSe,
      no: subNo,
      porcentaje_participacion:
        subElect ? Number(((subEnc / subElect) * 100).toFixed(2)) : 0.0,
      porcentaje_si:
        subEnc ? Number(((subSi / subEnc) * 100).toFixed(2)) : 0.0,
      porcentaje_nose:
        subEnc ? Number(((subNoSe / subEnc) * 100).toFixed(2)) : 0.0,
      porcentaje_no:
        subEnc ? Number(((subNo / subEnc) * 100).toFixed(2)) : 0.0,
      es_subtotal: true,
      actualizado_en: new Date().toISOString()
    });
  }

  // Total general
  filas.push({
    parroquia: '',
    codigo_centro: '',
    nombre_centro: 'TOTAL GENERAL',
    electores: genElect,
    encuestados: genEnc,
    si: genSi,
    nose: genNoSe,
    no: genNo,
    porcentaje_participacion:
      genElect ? Number(((genEnc / genElect) * 100).toFixed(2)) : 0.0,
    porcentaje_si:
      genEnc ? Number(((genSi / genEnc) * 100).toFixed(2)) : 0.0,
    porcentaje_nose:
      genEnc ? Number(((genNoSe / genEnc) * 100).toFixed(2)) : 0.0,
    porcentaje_no:
      genEnc ? Number(((genNo / genEnc) * 100).toFixed(2)) : 0.0,
    es_subtotal: true,
    actualizado_en: new Date().toISOString()
  });

  console.log(`🔢 Total de filas a upsert: ${filas.length}`);

  // 4️⃣ Upsert en Supabase
  const { error: errUpsert } = await supabase
    .from('resumen_totalizado')
    .upsert(filas, {
      onConflict: ['parroquia', 'codigo_centro']
    });

  if (errUpsert) {
    console.error('❌ Error al upsert en resumen_totalizado:', errUpsert.message);
  } else {
    console.log(`✅ Resumen actualizado: ${filas.length} filas procesadas`);
  }
}