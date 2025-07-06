// mensajes.js – Lobatera + Fuerte: presentación del encuestado
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

import {
  enviarMensaje,
  calcularEdad,
  limpiarTextoMarkdown
} from './utils.js';

// 🔍 Buscar datos del elector por cédula
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

// 🎯 Mostrar elector con estilo institucional
export async function mostrarElectorConMensaje(chatId, estado, cedula, tipo = 'V', respuesta = null) {
  const elector = await buscarElectorPorCedula(cedula);
  if (!elector) {
    await enviarMensaje(chatId, `😕 No encontramos al elector con cédula ${tipo}${cedula}.`);
    return;
  }

  const edad = calcularEdad(elector.fechanac);
  const textoBase = `*Lobatera + Fuerte* 💪🇻🇪\n*CÉDULA:* ${tipo}${cedula}\n*NOMBRES Y APELLIDOS:* ${limpiarTextoMarkdown(elector.elector)}\n*EDAD:* ${edad} años\n*CENTRO ELECTORAL:* ${limpiarTextoMarkdown(elector.nombre_centro)}\n\n`;

  let mensajeExtra = '';
  if (estado === 'duplicado') {
    mensajeExtra = `🎉 Ya registramos tu participación anteriormente.\n\n*Gracias por ser parte activa de Lobatera + Fuerte.*`;
  } else if (estado === 'registrado') {
    const opciones = { si: 'Sí', nose: 'No sé', no: 'No' };
    mensajeExtra = `✅ Registramos tu respuesta: *${opciones[respuesta]}*\n\n🎉 ¡Ya formas parte de este gran equipo de Lobatera + Fuerte!*`;
  }

  const mensajeFinal = `${textoBase}${mensajeExtra}`;
  await enviarMensaje(chatId, mensajeFinal, 'Markdown');
}