// generarResumenTotalizado.js

import { obtenerDatosCrudos } from './utils.js'
import supabase from './supabase.js'

export async function generarResumenTotalizado() {
  console.log('🧠 Entrando a generarResumenTotalizado')

  // ── 1️⃣ Limpiar tabla resumen_totalizado
  const { error: errDel } = await supabase
    .from('resumen_totalizado')
    .delete()
    .neq('id', 0)
  if (errDel) {
    console.error('❌ Error limpiando resumen_totalizado:', errDel.message)
    return
  }

  // ── 2️⃣ Leer tabla datos para contar electores
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

  // ── 3️⃣ Leer respuestas de encuesta
  const respuestas = await obtenerDatosCrudos()
  console.log(`📦 Respuestas de encuesta recibidas: ${respuestas.length}`)

  // Estructura: { [parroquia]: { [codigo_centro]: { total, si, no, nose } } }
  const votosMap = {}
  for (const r of respuestas) {
    const pq = r.datos.parroquia ?? 'Sin parroquia'
    const cc = r.datos.cod_cv    ?? 'sin-cod'
    votosMap[pq]       ??= {}
    votosMap[pq][cc]   ??= { total: 0, si: 0, no: 0, nose: 0 }
    votosMap[pq][cc].total++
    const resp = (r.respuesta || '').toLowerCase()
    if (['si','no','nose'].includes(resp)) votosMap[pq][cc][resp]++
  }

  // ── 4️⃣ Generar filas por centro y subtotales de parroquia
  const filas = []
  let generalElect = 0, generalEncu = 0, generalSi = 0, generalNo = 0, generalNose = 0

  for (const pq of Object.keys(electoresMap)) {
    let subElect = 0, subEncu = 0, subSi = 0, subNo = 0, subNose = 0

    for (const cc of Object.keys(electoresMap[pq])) {
      const { nombre_centro, electores } = electoresMap[pq][cc]
      const stats = votosMap[pq]?.[cc] ?? { total:0, si:0, no:0, nose:0 }
      const { total, si, no, nose } = stats

      // Registro por centro
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
      })

      // Acumular subtotales y totales generales
      subElect  += electores
      subEncu   += total
      subSi     += si
      subNo     += no
      subNose   += nose

      generalElect += electores
      generalEncu  += total
      generalSi    += si
      generalNo    += no
      generalNose  += nose
    }

    // Subtotal por parroquia
    filas.push({
      parroquia: pq,
      codigo_centro: '',
      nombre_centro: `TOTAL ${pq}`,
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
    })
  }

  // ── 5️⃣ Subtotal general de electores y votos
  filas.push({
    parroquia: '',
    codigo_centro: '',
    nombre_centro: 'TOTAL GENERAL',
    electores: generalElect,
    encuestados: generalEncu,
    si: generalSi,
    nose: generalNose,
    no: generalNo,
    porcentaje_participacion: generalElect
      ? ((generalEncu / generalElect) * 100).toFixed(2)
      : '0.00',
    porcentaje_si: generalEncu
      ? ((generalSi / generalEncu) * 100).toFixed(2)
      : '0.00',
    porcentaje_nose: generalEncu
      ? ((generalNose / generalEncu) * 100).toFixed(2)
      : '0.00',
    porcentaje_no: generalEncu
      ? ((generalNo / generalEncu) * 100).toFixed(2)
      : '0.00',
    es_subtotal: true
  })

  // ── 6️⃣ Insertar todas las filas
  console.log(`🧾 Filas a insertar: ${filas.length}`)
  const { error: errInsert } = await supabase
    .from('resumen_totalizado')
    .insert(filas)

  if (errInsert) {
    console.error('❌ Error insertando resumen:', errInsert.message)
  } else {
    console.log(`✅ Insertadas ${filas.length} filas (centros, subtotales y total general)`)
  }
}