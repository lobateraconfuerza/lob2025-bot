// generarResumenTotalizado.js

import { obtenerDatosCrudos } from './utils.js'
import supabase from './supabase.js'

export async function generarResumenTotalizado() {
  console.log('🧠 Entrando a generarResumenTotalizado')

  // ── BORRAR tabla anterior
  const { error: errDel } = await supabase
    .from('resumen_totalizado')
    .delete()
    .neq('id', 0)
  if (errDel) {
    console.error('❌ Error limpiando resumen_totalizado:', errDel.message)
    return
  }

  // ── 1️⃣ Contar electores reales por centro y parroquia
  const { data: datos, error: errDatos } = await supabase
    .from('datos')
    .select('parroquia, codigo_centro, nombre_centro')
  if (errDatos) {
    console.error('❌ Error leyendo tabla datos:', errDatos.message)
    return
  }

  // Estructura: { [parroquia]: { [codigo_centro]: { nombre_centro, electores } } }
  const electoresMap = {}
  for (const row of datos) {
    const pq = row.parroquia    ?? 'Sin parroquia'
    const cc = row.codigo_centro ?? 'sin-cod'
    const nm = row.nombre_centro
    electoresMap[pq]       ??= {}
    electoresMap[pq][cc]   ??= { nombre_centro: nm, electores: 0 }
    electoresMap[pq][cc].electores++
  }

  // ── 2️⃣ Contabilizar respuestas de encuesta por centro y parroquia
  const respuestas = await obtenerDatosCrudos()
  console.log(`📦 Votos obtenidos: ${respuestas.length}`)

  // Estructura: { [parroquia]: { [codigo_centro]: { total, si, no, nose } } }
  const votosMap = {}
  for (const r of respuestas) {
    const pq = r.datos.parroquia    ?? 'Sin parroquia'
    const cc = r.datos.cod_cv       ?? 'sin-cod'
    votosMap[pq]       ??= {}
    votosMap[pq][cc]   ??= { total: 0, si: 0, no: 0, nose: 0 }
    votosMap[pq][cc].total++
    const resp = (r.respuesta || '').toLowerCase()
    if (['si','no','nose'].includes(resp)) votosMap[pq][cc][resp]++
  }

  // ── 3️⃣ Construir filas: por centro y luego subtotal parroquia
  const filas = []
  for (const pq of Object.keys(electoresMap)) {
    let subElect = 0, subTotal = 0, subSi = 0, subNo = 0, subNose = 0

    for (const cc of Object.keys(electoresMap[pq])) {
      const { nombre_centro, electores } = electoresMap[pq][cc]
      const stats = votosMap[pq]?.[cc] ?? { total:0, si:0, no:0, nose:0 }
      const { total, si, no, nose } = stats

      // Empujar registro de centro
      filas.push({
        parroquia: pq,
        codigo_centro: cc,
        nombre_centro,
        electores,
        encuestados: total,
        si,
        nose,
        no,
        porcentaje_participacion:
          electores
            ? ((total / electores)*100).toFixed(2)
            : '0.00',
        porcentaje_si:
          total ? ((si / total)*100).toFixed(2) : '0.00',
        porcentaje_nose:
          total ? ((nose / total)*100).toFixed(2) : '0.00',
        porcentaje_no:
          total ? ((no / total)*100).toFixed(2) : '0.00',
        es_subtotal: false
      })

      subElect += electores
      subTotal += total
      subSi    += si
      subNo    += no
      subNose  += nose
    }

    // Empujar subtotal parroquia
    filas.push({
      parroquia: pq,
      codigo_centro: '',
      nombre_centro: `TOTAL ${pq}`,
      electores: subElect,
      encuestados: subTotal,
      si: subSi,
      nose: subNose,
      no: subNo,
      porcentaje_participacion:
        subElect
          ? ((subTotal / subElect)*100).toFixed(2)
          : '0.00',
      porcentaje_si:
        subTotal ? ((subSi / subTotal)*100).toFixed(2) : '0.00',
      porcentaje_nose:
        subTotal ? ((subNose / subTotal)*100).toFixed(2) : '0.00',
      porcentaje_no:
        subTotal ? ((subNo / subTotal)*100).toFixed(2) : '0.00',
      es_subtotal: true
    })
  }

  // ── 4️⃣ Insertar en Supabase
  console.log(`🧾 Filas a insertar: ${filas.length}`)
  const { error: errInsert } = await supabase
    .from('resumen_totalizado')
    .insert(filas)
  if (errInsert) {
    console.error('❌ Error insertando resumen:', errInsert.message)
  } else {
    console.log(`✅ Insertadas ${filas.length} filas con electores y participación`)
  }
}