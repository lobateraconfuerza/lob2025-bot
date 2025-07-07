// Generar totalizacion del sistema

import { obtenerDatosCrudos } from './utils.js';
import supabase from './supabase.js'; // Ajusta este import si usas otro cliente

export async function generarResumenTotalizado() {

  console.log('🧠 Entrando a generarResumenTotalizado')
  

  // Limpiar la tabla
  const borrar = await supabase.from('resumen_totalizado').delete().neq('id', 0);
  if (borrar.error) {
    console.error('❌ Error al limpiar resumen_totalizado:', borrar.error.message);
    return;
  }

  // Obtener datos crudos
  const registros = await obtenerDatosCrudos();
  console.log(`📦 Registros crudos obtenidos: ${registros.length}`);
  if (!registros.length) {
    console.warn('⚠️ No hay registros para totalizar');
    return;
  }

  // Agrupar por parroquia y centro
  const agrupado = {}; // { parroquia: { claveCentro: { ... } } }

  for (const r of registros) {
    const d = r.datos ?? {};
    const parroquia = d.parroquia ?? 'Sin parroquia';
    const codCV = d.codigo_centro ?? 'sin-cod';
    const centro = d.nombre_centro ?? 'Centro sin nombre';
    const electores = Number(d.electores) || 0;

    const clave = `${codCV}|${centro}`;
    if (!agrupado[parroquia]) agrupado[parroquia] = {};
    if (!agrupado[parroquia][clave]) {
      agrupado[parroquia][clave] = { electores, total: 0, si: 0, nose: 0, no: 0 };
    }

    const actual = agrupado[parroquia][clave];
    const res = r.respuesta?.toLowerCase();
    actual.total++;
    if (['si', 'nose', 'no'].includes(res)) actual[res]++;
  }

  // Preparar filas para insertar
  const filas = [];

  for (const parroquia in agrupado) {
    let subtotalElectores = 0;
    let subtotalEncuestados = 0;
    let subtotalSi = 0;
    let subtotalNose = 0;
    let subtotalNo = 0;

    for (const clave in agrupado[parroquia]) {
      const [codCV, nombre] = clave.split('|');
      const { electores, total, si, nose, no } = agrupado[parroquia][clave];

      const fila = {
        parroquia,
        codigo_centro: codCV,
        nombre_centro: nombre,
        electores,
        encuestados: total,
        si,
        nose,
        no,
        porcentaje_participacion: electores > 0 ? ((total / electores) * 100).toFixed(2) : 0.0,
        porcentaje_si: total > 0 ? ((si / total) * 100).toFixed(2) : 0.0,
        porcentaje_nose: total > 0 ? ((nose / total) * 100).toFixed(2) : 0.0,
        porcentaje_no: total > 0 ? ((no / total) * 100).toFixed(2) : 0.0,
        es_subtotal: false
      };

      subtotalElectores += electores;
      subtotalEncuestados += total;
      subtotalSi += si;
      subtotalNose += nose;
      subtotalNo += no;

      filas.push(fila);
    }

    // Agregar subtotal de parroquia
    filas.push({
      parroquia,
      codigo_centro: '',
      nombre_centro: 'TOTAL PARROQUIA',
      electores: subtotalElectores,
      encuestados: subtotalEncuestados,
      si: subtotalSi,
      nose: subtotalNose,
      no: subtotalNo,
      porcentaje_participacion: subtotalElectores > 0 ? ((subtotalEncuestados / subtotalElectores) * 100).toFixed(2) : 0.0,
      porcentaje_si: subtotalEncuestados > 0 ? ((subtotalSi / subtotalEncuestados) * 100).toFixed(2) : 0.0,
      porcentaje_nose: subtotalEncuestados > 0 ? ((subtotalNose / subtotalEncuestados) * 100).toFixed(2) : 0.0,
      porcentaje_no: subtotalEncuestados > 0 ? ((subtotalNo / subtotalEncuestados) * 100).toFixed(2) : 0.0,
      es_subtotal: true
    });
  }

  // Insertar filas en Supabase
  
  console.log(`🧾 Filas preparadas para insertar: ${filas.length}`);

  const insertar = await supabase.from('resumen_totalizado').insert(filas);
  if (insertar.error) {
    console.error('❌ Error al insertar totales:', insertar.error.message);
  } else {
    console.log(`✅ Totalización insertada: ${filas.length} filas`);
  }
}