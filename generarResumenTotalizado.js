// generarResumenTotalizado.js
import supabase from './supabase.js';     // ✅ importa el default correctamente

export async function actualizarResumenFijo() {
  console.log('🔄 Actualizando 16 filas en resumen_totalizado');

  // 1️⃣ Leer seeds: sólo registros NO subtotales
  const { data: centros, error: errC } = await supabase
    .from('resumen_totalizado')
    .select('id, parroquia, codigo_centro')
    .eq('es_subtotal', false);
  if (errC) return console.error(errC.message);

  // 2️⃣ Para cada centro, contar y actualizar
  for (const { id, parroquia, codigo_centro } of centros) {
    // 2.1 Conteo de electores en padrón
    const { count: electCount } = await supabase
      .from('datos')
      .select('cedula', { head: true, count: 'exact' })
      .eq('codigo_centro', codigo_centro);

    // 2.2 Lectura de votos en participacion_bot
    const { data: votos } = await supabase
      .from('participacion_bot')
      .select('respuesta, datos(codigo_centro)')
      .eq('datos.codigo_centro', codigo_centro);

    const totalVotos = votos.length;
    const si    = votos.filter(v => v.respuesta === 'si').length;
    const no    = votos.filter(v => v.respuesta === 'no').length;
    const nose  = votos.filter(v => v.respuesta === 'nose').length;

    // 2.3 Cálculo de porcentajes
    const pPart = electCount ? +(totalVotos/electCount*100).toFixed(2) : 0;
    const pSi   = totalVotos    ? +(si/totalVotos    *100).toFixed(2) : 0;
    const pNo   = totalVotos    ? +(no/totalVotos    *100).toFixed(2) : 0;
    const pNs   = totalVotos    ? +(nose/totalVotos  *100).toFixed(2) : 0;

    // 2.4 UPDATE del registro
    await supabase
      .from('resumen_totalizado')
      .update({
        electores: electCount,
        encuestados: totalVotos,
        si, no, nose,
        porcentaje_participacion: pPart,
        porcentaje_si: pSi,
        porcentaje_no: pNo,
        porcentaje_nose: pNs
      })
      .eq('id', id);
  }

  // 3️⃣ Recalcular subtotales y total general (mismo patrón UPDATE)
  //    - Agrupa los centros por parroquia y suma sus campos  
  //    - Haz UPDATE sobre las filas donde codigo_centro = '0'  
  //    - Finalmente recalcula y actualiza el TOTAL GENERAL

  console.log('✅ Resumen_totalizado actualizado sin borrar registros');
}