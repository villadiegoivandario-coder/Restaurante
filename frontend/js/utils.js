'use strict';
/* Utilidades pequeñas y sin dependencias */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escapa texto para insertarlo de forma segura en HTML (evita inyección). */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const _fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const dinero = (n) => _fmtCOP.format(Math.round(Number(n) || 0));

const hora = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
const fechaHora = (iso) => new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fechaHoraExacta = (iso) => new Date(iso).toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const esHoy = (iso) => new Date(iso).toDateString() === new Date().toDateString();

const pad = (n, l = 4) => String(n).padStart(l, '0');
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
