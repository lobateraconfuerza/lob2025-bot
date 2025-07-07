// generarResumenTotalizado.js

import { obtenerDatosCrudos } from './utils.js';
import supabase from './supabase.js';

export async function generarResumenTotalizado() {
  console.log('🧠 Actualizando resumen_totalizado sin upsert');

  // 1️⃣ Contar electores y votos (igual que antes)…
  const { data: datos, error: errDatos } = await supabase
    .from('datos').select('parroquia, codigo_centro, nombre_centro');
  if (errDatos) return console.error(errDatos);

  const electoresMap = {};
  for (const { parroquia, codigo_centro, nombre_centro } of datos) {
    const pq = parroquia      || '';
    const cc = codigo_centro  || '';
    electoresMap[pq]         ??= {};
    electoresMap[pq][cc]     ??= { nombre_centro, electores: 0 };
    electoresMap[pq][cc].electores++;
  }

  const respuestas = await obtenerDatosCrudos();
  const votosMap = {};
  for (const r of respuestas) {
    const pq = r.datos.parroquia || '';
    const cc = r.datos.cod_cv    || '';
    votosMap[pq]       ??= {};
    votosMap[pq][cc]   ??= { total: 0, si: 0, no: 0, nose: 0 };
    votosMap[pq][cc].total++;
    const resp = (r.respuesta||'').toLowerCase();
    if (['si','no','nose'].includes(resp)) votosMap[pq][cc][resp]++;
  }

  // 2️⃣ Armar filas
  const filas = [];
  let genE=0, genV=0, genSi=0, genNo=0, genNs=0;
  for (const pq of new Set([...Object.keys(electoresMap), ...Object.keys(votosMap)])) {
    let subE=0, subV=0, subSi=0, subNo=0, subNs=0;

    for (const cc of new Set([
      ...Object.keys(electoresMap[pq]||{}),
      ...Object.keys(votosMap[pq]||{})
    ])) {
      const nombre   = electoresMap[pq]?.[cc]?.nombre_centro || '';
      const elect    = electoresMap[pq]?.[cc]?.electores       || 0;
      const vs       = votosMap[pq]?.[cc]                      || {total:0,si:0,no:0,nose:0};
      const { total, si, no, nose } = vs;

      filas.push({ parroquia: pq, codigo_centro: cc, nombre_centro: nombre,
        electores: elect, encuestados: total, si, nose, no,
        porcentaje_participacion: elect ? +(total/elect*100).toFixed(2) : 0,
        porcentaje_si: total ? +(si/total*100).toFixed(2) : 0,
        porcentaje_nose: total ? +(nose/total*100).toFixed(2) : 0,
        porcentaje_no: total ? +(no/total*100).toFixed(2) : 0,
        es_subtotal: false, actualizado_en: new Date().toISOString()
      });

      subE += elect; subV += total;
      subSi += si;    subNo += no;   subNs += nose;
      genE += elect;  genV += total;
      genSi += si;    genNo += no;   genNs += nose;
    }

    // subtotal parroquia
    filas.push({ parroquia: pq, codigo_centro: '', nombre_centro:`TOTAL ${pq}`,
      electores: subE, encuestados: subV, si: subSi, nose: subNs, no: subNo,
      porcentaje_participacion: subE ? +(subV/subE*100).toFixed(2) : 0,
      porcentaje_si: subV ? +(subSi/subV*100).toFixed(2) : 0,
      porcentaje_nose: subV ? +(subNs/subV*100).toFixed(2) : 0,
      porcentaje_no: subV ? +(subNo/subV*100).toFixed(2) : 0,
      es_subtotal: true, actualizado_en: new Date().toISOString()
    });
  }

  // total general
  filas.push({ parroquia:'', codigo_centro:'', nombre_centro:'TOTAL GENERAL',
    electores: genE, encuestados: genV, si: genSi, nose: genNs, no: genNo,
    porcentaje_participacion: genE ? +(genV/genE*100).toFixed(2) : 0,
    porcentaje_si: genV ? +(genSi/genV*100).toFixed(2) : 0,
    porcentaje_nose: genV ? +(genNs/genV*100).toFixed(2) : 0,
    porcentaje_no: genV ? +(genNo/genV*100).toFixed(2) : 0,
    es_subtotal: true, actualizado_en: new Date().toISOString()
  });

  console.log(`🔢 Procesando ${filas.length} filas de resumen`);

  // 3️⃣ Insert or update fila a fila
  for (const row of filas) {
    const { data: existing } = await supabase
      .from('resumen_totalizado')
      .select('id')
      .match({
        parroquia: row.parroquia,
        codigo_centro: row.codigo_centro
      });

    if (existing?.length) {
      // ya existe → UPDATE
      await supabase
        .from('resumen_totalizado')
        .update(row)
        .match({ id: existing[0].id });
    } else {
      // no existe → INSERT
      await supabase
        .from('resumen_totalizado')
        .insert(row);
    }
  }

  console.log('✅ Resumen totalizado actualizado correctamente');
}