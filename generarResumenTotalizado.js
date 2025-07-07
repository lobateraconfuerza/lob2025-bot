// generarResumenTotalizado.js

import { obtenerDatosCrudos } from './utils.js';
import supabase from './supabase.js';

export async function generarResumenTotalizado() {
  console.log('🧠 Entrando a generarResumenTotalizado');

  // 1️⃣ Obtener todos los centros para conteo manual
  const { data: allElectores, error: errEC } = await supabase
    .from('datos')
    .select('codigo_centro');

  if (errEC) {
    console.error('❌ Error obteniendo electores:', errEC.message);
    return;
  }

  // Armar mapa: { [codigo_centro]: totalElectores }
  const mapaElectores = {};
  for (const row of allElectores) {
    const key = row.codigo_centro ?? 'sin-cod';
    mapaElectores[key] = (mapaElectores[key] || 0) + 1;
  }

  // 2️⃣ Vaciar tabla resumen_totalizado
  const { error: errDel } = await supabase
    .from('resumen_totalizado')
    .delete()
    .neq('id', 0);

  if (errDel) {
    console.error('❌ Error limpiando resumen_totalizado:', errDel.message);
    return;
  }

  // 3️⃣ Obtener respuestas de encuestas
  const registros = await obtenerDatosCrudos();
  console.log(`📦 Registros crudos obtenidos: ${registros.length}`);
  if (!registros.length) {
    console.warn('⚠️ No hay registros para totalizar');
    return;
  }

  // 4️⃣ Agrupar por parroquia y centro
  const agrupado = {};
  for (const r of registros) {
    const d = r.datos || {};
    const parroquia     = d.parroquia      ?? 'Sin parroquia';
    const codigo_centro = d.cod_cv         ?? 'sin-cod';
    const nombre_centro = d.nombre_centro  ?? 'Centro sin nombre';
    const clave         = `${codigo_centro}|${nombre_centro}`;

    if (!agrupado[parroquia]) agrupado[parroquia] = {};
    if (!agrupado[parroquia][clave]) {
      agrupado[parroquia][clave] = { total: 0, si: 0, nose: 0, no: 0 };
    }

    const actual = agrupado[parroquia][clave];
    actual.total++;
    const resp = (r.respuesta || '').toLowerCase();
    if (['si', 'nose', 'no'].includes(resp)) actual[resp]++;
  }

  // 5️⃣ Preparar filas para insertar
  const filas = [];
  for (const parroquia in agrupado) {
    let subElect = 0,
        subEncu  = 0,
        subSi    = 0,
        subNo    = 0,
        subNose  = 0;

    for (const clave in agrupado[parroquia]) {
      const [codigo_centro, nombre_centro] = clave.split('|');
      const { total, si, no, nose }       = agrupado[parroquia][clave];
      const electores                     = mapaElectores[codigo_centro] || 0;

      filas.push({
        parroquia,
        codigo_centro,
        nombre_centro,
        electores,
        encuestados: total,
        si,
        nose,
        no,
        porcentaje_participacion: electores
          ? ((total / electores) * 100).toFixed(2)
          : 0.0,
        porcentaje_si: total
          ? ((si / total) * 100).toFixed(2)
          : 0.0,
        porcentaje_nose: total
          ? ((nose / total) * 100).toFixed(2)
          : 0.0,
        porcentaje_no: total
          ? ((no / total) * 100).toFixed(2)
          : 0.0,
        es_subtotal: false
      });

      subElect += electores;
      subEncu  += total;
      subSi    += si;
      subNo    += no;
      subNose  += nose;
    }

    // Fila de subtotal por parroquia
    filas.push({
      parroquia,
      codigo_centro: '',
      nombre_centro: 'TOTAL PARROQUIA',
      electores: subElect,
      encuestados: subEncu,
      si: subSi,
      nose: subNose,
      no: subNo,
      porcentaje_participacion: subElect
        ? ((subEncu / subElect) * 100).toFixed(2)
        : 0.0,
      porcentaje_si: subEncu
        ? ((subSi / subEncu) * 100).toFixed(2)
        : 0.0,
      porcentaje_nose: subEncu
        ? ((subNose / subEncu) * 100).toFixed(2)
        : 0.0,
      porcentaje_no: subEncu
        ? ((subNo / subEncu) * 100).toFixed(2)
        : 0.0,
      es_subtotal: true
    });
  }

  // 6️⃣ Insertar filas en Supabase
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