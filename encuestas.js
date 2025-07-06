// encuestas.js – Lógica de participación del Bot Lobatera
import fetch from 'node-fetch';
import {
  enviarMensaje,
  calcularEdad,
  limpiarTextoMarkdown
} from './utils.js';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

// 🔍 Buscar elector en tabla "datos"
async function buscarElectorPorCedula(cedula) {
  const cedulaNumerica = parseInt(cedula, 10);
  const url = `${process.env.SUPABASE_URL}/rest/v1/datos?cedula=eq.${cedulaNumerica}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('💥 Error al buscar elector:', error.message);
    return null;
  }
}

// 📋 Procesar cédula e invitar al ciudadano
export async function procesarCedula(chatId, tipo, cedula) {
  const cedulaNumerica = parseInt(cedula, 10);

  // 📌 Verificar si ya participó
  const urlVerificar = `${process.env.SUPABASE_URL}/rest/v1/participacion_bot?cedula=eq.${cedulaNumerica}&select=id`;

  try {
    const verificar = await fetch(urlVerificar, {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const existe = await verificar.json();

    // ✅ Si ya respondió, mostrar datos sin botones
    if (existe.length > 0) {
      const elector = await buscarElectorPorCedula(cedula);
      if (elector) {
        const edad = calcularEdad(elector.fechanac);
        const texto = `*Lobatera + Fuerte* 💪🇻🇪\n*CÉDULA:* ${tipo}${cedula}\n*NOMBRES Y APELLIDOS:* ${limpiarTextoMarkdown(elector.elector)}\n*EDAD:* ${edad} años\n*CENTRO ELECTORAL:* ${limpiarTextoMarkdown(elector.nombre_centro)}\n\n🎉 Muchas gracias por haber participado en:\n\n*Lobatera + Fuerte*`;
        await enviarMensaje(chatId, texto, 'Markdown');
      } else {
        await enviarMensaje(chatId, `🙌 Ya registramos tu participación anteriormente.`);
      }
      return;
    }
  } catch (error) {
    console.error('⚠️ Error al verificar participación:', error.message);
  }

  // 👤 Mostrar pregunta si no ha participado
  const elector = await buscarElectorPorCedula(cedula);

  if (elector) {
    const edad = calcularEdad(elector.fechanac);
    const texto = `*Lobatera + Fuerte* 💪🇻🇪\n*CÉDULA:* ${tipo}${cedula}\n*NOMBRES Y APELLIDOS:* ${limpiarTextoMarkdown(elector.elector)}\n*EDAD:* ${edad} años\n*CENTRO ELECTORAL:* ${limpiarTextoMarkdown(elector.nombre_centro)}\n\n¿Está usted de acuerdo en formar parte de este equipo para hacer que el Municipio Lobatera sea más Fuerte?`;

    const botones = {
      inline_keyboard: [
        [
          { text: '✅ Sí', callback_data: `si:${cedula}` },
          { text: '🤔 No sé', callback_data: `nose:${cedula}` },
          { text: '❌ No', callback_data: `no:${cedula}` }
        ]
      ]
    };

    await enviarMensaje(chatId, texto, 'Markdown', botones);
  } else {
    await enviarMensaje(chatId, `😕 No encontré al elector con cédula ${tipo}${cedula}. Verifique si está registrado.`);
  }
}

// 💾 Registrar decisión y evitar duplicado
export async function registrarDecision(cedula, respuesta, chatId) {
  const cedulaNumerica = parseInt(cedula, 10);
  const urlVerificar = `${process.env.SUPABASE_URL}/rest/v1/participacion_bot?cedula=eq.${cedulaNumerica}&select=id`;
  const urlInsertar = `${process.env.SUPABASE_URL}/rest/v1/participacion_bot`;

  try {
    const verificar = await fetch(urlVerificar, {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const existe = await verificar.json();
    if (existe.length > 0) return 'duplicado';

    const payload = {
      cedula: cedulaNumerica,
      respuesta,
      chat_id: chatId
    };

    const insertar = await fetch(urlInsertar, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const result = await insertar.json();
    if (insertar.status >= 400) {
      console.error('🚨 Supabase error:', result);
      return 'error';
    }

    return 'registrado';
  } catch (error) {
    console.error('💥 Error técnico en registrarDecision:', error.message);
    return 'error';
  }
}