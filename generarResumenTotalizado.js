// generarResumenTotalizado.js

import supabase from './supabase.js';

export async function generarResumenTotalizado() {
  console.log('🔄 Actualizando 16 filas en resumen_totalizado');

  // 1️⃣ Leer registros de centros (es_subtotal = false)
  const { data: centros, error: errCentros } = await supabase
    .from('resumen_totalizado')
    .select('id, codigo_centro, parroquia')
    .eq('es_subtotal', false);

  if (errCentros) {
    console.error('❌ Error leyendo centros:', errCentros.message);
    return;
  }

  // 2️⃣ Por cada centro: contar electores y votos
  for (const { id, codigo_centro } of centros) {
    // ✋ Electores en "datos"
    const { count: electCount } = await supabase
      .from('datos')
      .select('cedula', { head: true, count: 'exact' })
      .eq('codigo_centro', codigo_centro);

    // 🗳 Votos desde "participacion_bot"
    const { data: votos } = await supabase
      .from('participacion_bot')
      .select('respuesta, datos(codigo_centro)')
      .eq('datos.codigo_centro', codigo_centro);

    const total = votos?.length || 0;
    const si    = votos?.filter(v => v.respuesta === 'si').length || 0;
    const no    = votos?.filter(v => v.respuesta === 'no').length || 0;
    const nose  = votos?.filter(v => v.respuesta === 'nose').length || 0;

    const pPart = electCount ? +((total / electCount) * 100).toFixed(2) : 0;
    const pSi   = total ? +((si / total) * 100).toFixed(2) : 0;
    const pNo   = total ? +((no / total) * 100).toFixed(2) : 0;
    const pNs   = total ? +((nose / total) * 100).toFixed(2) : 0;

    await supabase
      .from('resumen_totalizado')
      .update({
        electores: electCount,
        encuestados: total,
        si,
        no,
        nose,
        porcentaje_participacion: pPart,
        porcentaje_si: pSi,
        porcentaje_no: pNo,
        porcentaje_nose: pNs
      })
      .eq('id', id);
  }

  // 3️⃣ Recalcular subtotales por parroquia
  const { data: actualizados } = await supabase
    .from('resumen_totalizado')
    .select('*')
    .eq('es_subtotal', false);

  const agrupado = actualizados.reduce((acc, fila) => {
    const pq = fila.parroquia;
    acc[pq] ??= { elect: 0, enc: 0, si: 0, no: 0, ns: 0 };
    acc[pq].elect += fila.electores;
    acc[pq].enc   += fila.encuestados;
    acc[pq].si    += fila.si;
    acc[pq].no    += fila.no;
    acc[pq].ns    += fila.nose;
    return acc;
  }, {});

  for (const [pq, { elect, enc, si, no, ns }] of Object.entries(agrupado)) {
    await supabase
      .from('resumen_totalizado')
      .update({
        electores: elect,
        encuestados: enc,
        si,
        no,
        nose: ns,
        porcentaje_participacion: elect ? +((enc / elect) * 100).toFixed(2) : 0,
        porcentaje_si: enc ? +((si / enc) * 100).toFixed(2) : 0,
        porcentaje_no: enc ? +((no / enc) * 100).toFixed(2) : 0,
        porcentaje_nose: enc ? +((ns / enc) * 100).toFixed(2) : 0
      })
      .match({ parroquia: pq, codigo_centro: '0' });
  }

  // 4️⃣ Total general
  const tot = Object.values(agrupado).reduce(
    (acc, v) => ({
      elect: acc.elect + v.elect,
      enc:   acc.enc   + v.enc,
      si:    acc.si    + v.si,
      no:    acc.no    + v.no,
      ns:    acc.ns    + v.ns
    }),
    { elect:0, enc:0, si:0, no:0, ns:0 }
  );

  await supabase
    .from('resumen_totalizado')
    .update({
      electores: tot.elect,
      encuestados: tot.enc,
      si: tot.si,
      no: tot.no,
      nose: tot.ns,
      porcentaje_participacion: tot.elect ? +((tot.enc / tot.elect) * 100).toFixed(2) : 0,
      porcentaje_si: tot.enc ? +((tot.si / tot.enc) * 100).toFixed(2) : 0,
      porcentaje_no: tot.enc ? +((tot.no / tot.enc) * 100).toFixed(2) : 0,
      porcentaje_nose: tot.enc ? +((tot.ns / tot.enc) * 100).toFixed(2) : 0
    })
    .match({ parroquia: '', codigo_centro: '0' });

  console.log('✅ resumen_totalizado actualizado correctamente');
}