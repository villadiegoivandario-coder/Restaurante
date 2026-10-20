'use strict';
/* ============================================================
   App: rutas, navegación, eventos y acciones
   ============================================================ */

const RUTAS = {
  '/': 'inicio', '/pedidos': 'pedidos', '/nuevo': 'nuevo', '/cocina': 'cocina',
  '/facturacion': 'facturacion', '/menu': 'menu', '/ajustes': 'ajustes',
};
const NAV = [
  ['/', 'Inicio', 'inicio'], ['/pedidos', 'Pedidos', 'pedidos'], ['/cocina', 'Cocina', 'cocina'],
  ['/facturacion', 'Caja', 'factura'], ['/menu', 'Menú', 'menu'], ['/ajustes', 'Ajustes', 'ajustes'],
];
let numpadInput = null;
let numpadValue = '';

function abrirNumpad(input = null, initial = '') {
  numpadInput = input;
  numpadValue = input ? input.value : initial;
  const pad = $('#numpad');
  pad.innerHTML = `<div class="numpad-head"><strong>${input?.getAttribute('aria-label') || 'Número de mesa'}</strong><output id="numpad-value">${esc(numpadValue || '0')}</output></div>
    <div class="numpad-keys">${['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((key) => `<button type="button" class="numpad-key" data-num-key="${key === '⌫' ? 'backspace' : key}">${key}</button>`).join('')}</div>
    <div class="numpad-actions"><button type="button" class="btn" data-num-key="cancel">Cancelar</button><button type="button" class="btn btn-primary" data-num-key="ok">Aceptar</button></div>`;
  pad.showModal();
}

function pintarValorNumpad() {
  $('#numpad-value').textContent = numpadValue || '0';
}

function seleccionarMesa(mesa) {
  borrador.mesa = mesa;
  $('#mesa-grid').querySelectorAll('[data-accion="seleccionar-mesa"]').forEach((button) => {
    const selected = button.dataset.mesa === mesa;
    button.classList.toggle('activo', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $('#campos-domicilio').hidden = mesa !== 'Domicilio';
}

function ruta() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  return { path: RUTAS[path] ? path : '/', params: new URLSearchParams(qs || '') };
}

function pintarNav(path) {
  const s = Store.estadisticas();
  const activos = Store.db.pedidos.filter((p) => ACTIVOS.includes(p.estado)).length;
  const badge = { '/pedidos': activos, '/cocina': s.enCocina, '/facturacion': s.porFacturar };
  $('#nav').innerHTML = NAV.map(([href, texto, ic]) => `<a href="#${href}" ${path === href ? 'aria-current="page"' : ''}>
    ${icono(ic)}<span>${texto}</span>${badge[href] ? `<span class="badge" aria-label="${badge[href]} pendientes">${badge[href]}</span>` : ''}</a>`).join('');
}

function render({ nuevaPagina = false } = {}) {
  const { path, params } = ruta();
  const vista = RUTAS[path];
  if (nuevaPagina) {
    if (vista === 'nuevo') entrarNuevo(params);
    if (vista === 'menu' && params.get('tab')) Vista.tabMenu = params.get('tab');
  }
  const y = window.scrollY;
  $('#vista').innerHTML = Vistas[vista]();
  if (Despues[vista]) Despues[vista]();
  pintarNav(path);
  $('#brand-name').textContent = "Llama's Wings";
  document.title = "Llama's Wings - POS & ERP";
  if (nuevaPagina) { window.scrollTo(0, 0); $('#vista').focus({ preventScroll: true }); } else window.scrollTo(0, y);
}
const refrescar = () => render();

/* ---------- Acciones por clic (data-accion) ---------- */
function agregarSimple(p) {
  const l = borrador.lineas.find((x) => x.pid === p.id && !(x.sabores && x.sabores.length) && !x.nota);
  if (l) l.cant += 1;
  else borrador.lineas.push({ lid: uid(), pid: p.id, nombre: p.nombre, precio: p.precio, cant: 1, sabores: [], nota: '', estacion: p.estacion });
  pintarCarrito();
}

async function guardarPedido() {
  const b = borrador;
  if (!b.mesa) { toast('Elige la mesa o el tipo de pedido.', 'error'); $('#mesa-grid').focus(); return; }
  if (!b.lineas.length) { toast('Agrega al menos un producto.', 'error'); return; }
  if (b.mesa === 'Domicilio' && !b.direccion.trim()) { toast('Falta la dirección de entrega.', 'error'); $('#f-dir').focus(); return; }
  const datos = { mesa: b.mesa, cliente: b.cliente.trim(), telefono: b.telefono.trim(), direccion: b.direccion.trim(), nota: b.nota.trim(), items: b.lineas };
  const r = b.editId ? Store.actualizarPedido(b.editId, datos) : Store.crearPedido(datos);
  if (!r.ok) {
    toast(r.error || `Inventario insuficiente: ${r.faltantes.map((f) => `${f.nombre} (faltan ${Math.ceil(f.falta).toLocaleString('es-CO')} ${f.unidad})`).join(', ')}`, 'error');
    return;
  }
  toast(b.editId ? `Pedido #${r.pedido.numero} actualizado` : `Pedido #${r.pedido.numero} enviado a cocina`, 'ok');
  borrador = nuevoBorrador();
  Vista.filtroPedidos = 'activos';
  Vista.busquedaPedidos = '';
  location.hash = '#/pedidos';
}

const Acciones = {
  'cerrar-modal': () => cerrarModal(),
  imprimir: () => window.print(),

  /* pedidos */
  'filtro-pedidos': (d) => { Vista.filtroPedidos = d.filtro; pintarPedidos(); },
  avanzar: (d) => {
    const p = Store.pedido(d.id);
    const sig = p && SIGUIENTE[p.estado];
    if (sig && Store.cambiarEstado(d.id, sig)) { cerrarModal(); refrescar(); toast(`#${p.numero} · ${ESTADOS[sig]}`); }
  },
  detalle: (d) => abrirDetalle(d.id),
  'detalle-mesa': (d) => {
    const ps = Store.db.pedidos.filter((p) => p.mesa === d.mesa && ACTIVOS.includes(p.estado));
    if (ps.length === 1) abrirDetalle(ps[0].id);
    else { Vista.busquedaPedidos = d.mesa; Vista.filtroPedidos = 'activos'; location.hash = '#/pedidos'; }
  },
  'mesa-libre': (d) => { location.hash = `#/nuevo?mesa=${encodeURIComponent(d.mesa)}`; },
  editar: (d) => { cerrarModal(); location.hash = `#/nuevo?editar=${encodeURIComponent(d.id)}`; },
  cancelar: async (d) => {
    const p = Store.pedido(d.id);
    const ok = await confirmar({ titulo: `¿Cancelar el pedido #${p.numero}?`, texto: 'El inventario descontado se devolverá. Esta acción no se puede deshacer.', ok: 'Cancelar pedido', peligro: true });
    if (ok && Store.cancelarPedido(d.id)) { cerrarModal(); refrescar(); toast('Pedido cancelado'); }
  },
  facturar: (d) => abrirFacturar(d.id),
  'ver-factura': (d) => abrirTicket(d.id),
  'tab-fact': (d) => { Vista.tabFact = d.tab; pintarFacturacion(); },
  estacion: (d) => { Vista.estacionKDS = d.estacion; pintarCocina(); },

  /* nuevo pedido */
  'cat-menu': (d) => { borrador.cat = d.cat; pintarMenuPOS(); },
  'seleccionar-mesa': (d) => seleccionarMesa(d.mesa),
  'mesa-manual': () => abrirNumpad(null),
  agregar: (d) => {
    const p = Store.producto(d.pid);
    if (!p || !p.activo) return;
    if (p.maxSabores > 0) abrirConfigAlitas(p.id); else agregarSimple(p);
  },
  'linea-mas': (d) => { const l = borrador.lineas.find((x) => x.lid === d.lid); if (l) { l.cant += 1; pintarCarrito(); } },
  'linea-menos': (d) => {
    const l = borrador.lineas.find((x) => x.lid === d.lid);
    if (!l) return;
    l.cant -= 1;
    if (l.cant <= 0) borrador.lineas = borrador.lineas.filter((x) => x !== l);
    pintarCarrito();
  },
  'quitar-linea': (d) => { borrador.lineas = borrador.lineas.filter((x) => x.lid !== d.lid); pintarCarrito(); },
  'editar-linea': (d) => { const l = borrador.lineas.find((x) => x.lid === d.lid); if (l) abrirConfigAlitas(l.pid, l.lid); },
  'sabor-mas': (d) => { cfgAlitas.asign[d.fid] = (cfgAlitas.asign[d.fid] || 0) + 1; refrescarConfigAlitas(); },
  'sabor-menos': (d) => { cfgAlitas.asign[d.fid] = Math.max(0, (cfgAlitas.asign[d.fid] || 0) - 1); refrescarConfigAlitas(); },
  'confirmar-alitas': () => confirmarAlitas(),
  'guardar-pedido': () => guardarPedido(),
  'cancelar-edicion': () => { borrador = nuevoBorrador(); location.hash = '#/pedidos'; },
  'ir-carrito': () => $('#carrito').scrollIntoView({ behavior: 'smooth' }),

  /* menú e inventario */
  'tab-menu': (d) => { Vista.tabMenu = d.tab; pintarMenuAdmin(); },
  'nuevo-producto': () => abrirProducto(),
  'editar-producto': (d) => abrirProducto(d.id),
  'eliminar-producto': async (d) => {
    const p = Store.producto(d.id);
    if (await confirmar({ titulo: `¿Eliminar "${p.nombre}"?`, texto: 'Los pedidos ya registrados conservan su información.', ok: 'Eliminar', peligro: true })) { Store.quitar('menu', d.id); pintarMenuAdmin(); toast('Producto eliminado'); }
  },
  'toggle-producto': (d, el) => { Store.upsert('menu', { id: d.id, activo: el.checked }); pintarMenuAdmin(); },
  'nuevo-sabor': () => abrirSabor(),
  'editar-sabor': (d) => abrirSabor(d.id),
  'eliminar-sabor': async (d) => {
    const s = Store.sabor(d.id);
    if (await confirmar({ titulo: `¿Eliminar el sabor "${s.nombre}"?`, texto: 'No afecta pedidos ya registrados.', ok: 'Eliminar', peligro: true })) { Store.quitar('sabores', d.id); pintarMenuAdmin(); toast('Sabor eliminado'); }
  },
  'toggle-sabor': (d, el) => { Store.upsert('sabores', { id: d.id, activo: el.checked }); pintarMenuAdmin(); },
  'nuevo-ingrediente': () => abrirIngrediente(),
  'editar-ingrediente': (d) => abrirIngrediente(d.id),
  'eliminar-ingrediente': async (d) => {
    const i = Store.ingrediente(d.id);
    if (!await confirmar({ titulo: `¿Eliminar "${i.nombre}"?`, texto: 'Se borrará del inventario.', ok: 'Eliminar', peligro: true })) return;
    const r = Store.eliminarIngrediente(d.id);
    if (r.ok) { pintarMenuAdmin(); toast('Ingrediente eliminado'); } else toast(r.error, 'error');
  },
  'ajustar-stock': (d) => abrirStock(d.id),
  'receta-fila': () => {
    if (!Store.db.ingredientes.length) { toast('Primero crea ingredientes en Inventario.', 'error'); return; }
    $('#receta-filas').insertAdjacentHTML('beforeend', filaReceta());
  },
  'quitar-fila': (_, el) => el.closest('.receta-fila').remove(),

  /* ajustes */
  exportar: () => { descargar(`respaldo-${new Date().toISOString().slice(0, 10)}.json`, Store.exportar()); toast('Respaldo descargado', 'ok'); },
  reiniciar: async () => {
    if (await confirmar({ titulo: '¿Borrar todos los datos?', texto: 'Se eliminarán pedidos, facturas, menú e inventario. Descarga un respaldo antes si lo necesitas.', ok: 'Borrar todo', peligro: true })) {
      Store.reiniciar(); borrador = nuevoBorrador(); refrescar(); toast('Datos reiniciados');
    }
  },
};

document.addEventListener('click', (e) => {
  const numKey = e.target.closest('[data-num-key]');
  if (numKey) {
    const key = numKey.dataset.numKey;
    if (key === 'cancel') { $('#numpad').close(); return; }
    if (key === 'ok') {
      if (!numpadValue) { toast('Ingresa un número.', 'error'); return; }
      if (numpadInput) {
        numpadInput.value = numpadValue;
        numpadInput.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        const mesaNumero = parseInt(numpadValue, 10);
        if (mesaNumero < 1 || mesaNumero > 60) { toast('El número de mesa debe estar entre 1 y 60.', 'error'); return; }
        borrador.mesa = `Mesa ${mesaNumero}`;
        const grid = $('#mesa-grid');
        const existing = [...grid.querySelectorAll('[data-accion="seleccionar-mesa"]')].find((button) => button.dataset.mesa === borrador.mesa);
        if (existing) seleccionarMesa(existing.dataset.mesa);
        else {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'mesa-option';
          button.dataset.accion = 'seleccionar-mesa';
          button.dataset.mesa = borrador.mesa;
          button.setAttribute('aria-pressed', 'false');
          button.textContent = borrador.mesa;
          grid.insertBefore(button, grid.lastElementChild);
          seleccionarMesa(borrador.mesa);
        }
      }
      $('#numpad').close();
      return;
    }
    if (key === 'C') numpadValue = '';
    else if (key === 'backspace') numpadValue = numpadValue.slice(0, -1);
    else if (/^\d$/.test(key) && numpadValue.length < 7) numpadValue += key;
    pintarValorNumpad();
    return;
  }
  const numericInput = e.target.closest('.touch-numeric');
  if (numericInput && !numericInput.disabled) { abrirNumpad(numericInput); return; }
  const el = e.target.closest('[data-accion]');
  if (!el || el.type === 'checkbox' || el.disabled) return;
  const fn = Acciones[el.dataset.accion];
  if (fn) fn(el.dataset, el);
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.type === 'checkbox' && el.dataset.accion && Acciones[el.dataset.accion]) Acciones[el.dataset.accion](el.dataset, el);
  if (el.name === 'conSabores') $('#campos-sabores').hidden = !el.checked;
  if (el.id === 'archivo-import' && el.files[0]) importarArchivo(el.files[0], el);
});

/* ---------- Entradas de texto ---------- */
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.campo) {
    borrador[el.dataset.campo] = el.value;
    if (el.dataset.campo === 'mesa') $('#campos-domicilio').hidden = el.value !== 'Domicilio';
  }
  if (el.id === 'buscar-pedidos') { Vista.busquedaPedidos = el.value; pintarPedidos(); }
  if (el.id === 'buscar-menu') { borrador.q = el.value; pintarMenuPOS(); }
  if (el.id === 'buscar-fact') { Vista.busquedaFact = el.value; pintarHistorial(); }
  const form = el.closest && el.closest('form[data-form]');
  if (form && form.dataset.form === 'facturar') actualizarFacturar(form);
  if (form && form.dataset.form === 'cierre') {
    const esperado = (parseFloat(form.base.value) || 0) + Number(form.dataset.efectivo);
    const dif = (parseFloat(form.contado.value) || 0) - esperado;
    $('#cierre-dif').textContent = form.contado.value === '' ? `Efectivo esperado: ${dinero(esperado)}`
      : `Esperado: ${dinero(esperado)} · ${dif === 0 ? 'Cuadra' : (dif > 0 ? 'Sobrante ' : 'Faltante ') + dinero(Math.abs(dif))}`;
  }
});

/* ---------- Formularios ---------- */
const num = (v, def = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : def; };

const Formularios = {
  producto(f) {
    const receta = $$('.receta-fila', f).map((r) => ({ ing: $('[name=r_ing]', r).value, cant: num($('[name=r_cant]', r).value) })).filter((r) => r.ing && r.cant > 0);
    const conSabores = f.conSabores.checked;
    const datos = {
      nombre: f.nombre.value.trim(), categoria: f.categoria.value.trim(), precio: Math.max(0, num(f.precio.value)),
      estacion: f.estacion.value, receta,
      piezas: conSabores ? Math.max(1, parseInt(f.piezas.value, 10) || 1) : 0,
      maxSabores: conSabores ? Math.min(6, Math.max(1, parseInt(f.maxSabores.value, 10) || 1)) : 0,
    };
    if (!datos.nombre || !datos.categoria) return toast('Completa nombre y categoría.', 'error');
    if (f.dataset.id) datos.id = f.dataset.id; else datos.activo = true;
    Store.upsert('menu', datos);
    cerrarModal(); pintarMenuAdmin(); toast('Producto guardado', 'ok');
  },
  sabor(f) {
    const datos = { nombre: f.nombre.value.trim(), picante: parseInt(f.picante.value, 10) || 0, ing: f.ing.value || null, porPieza: Math.max(0, num(f.porPieza.value)) };
    if (!datos.nombre) return toast('Escribe el nombre del sabor.', 'error');
    if (f.dataset.id) datos.id = f.dataset.id; else datos.activo = true;
    Store.upsert('sabores', datos);
    cerrarModal(); pintarMenuAdmin(); toast('Sabor guardado', 'ok');
  },
  ingrediente(f) {
    const datos = { nombre: f.nombre.value.trim(), unidad: f.unidad.value.trim(), stock: Math.max(0, num(f.stock.value)), minimo: Math.max(0, num(f.minimo.value)) };
    if (!datos.nombre || !datos.unidad) return toast('Completa nombre y unidad.', 'error');
    if (f.dataset.id) datos.id = f.dataset.id;
    Store.upsert('ingredientes', datos);
    cerrarModal(); pintarMenuAdmin(); toast('Ingrediente guardado', 'ok');
  },
  stock(f) {
    const d = num(f.delta.value);
    if (!d) return toast('Escribe una cantidad distinta de cero.', 'error');
    Store.ajustarStock(f.dataset.id, d);
    cerrarModal(); pintarMenuAdmin(); toast('Stock actualizado', 'ok');
  },
  facturar(f) {
    const p = Store.pedido(f.dataset.id);
    const conPropina = !!(f.propina && f.propina.checked);
    const t = Store.totales(p.items, conPropina);
    const metodo = f.metodo.value;
    const recibido = num(f.recibido.value, 0);
    if (metodo === 'efectivo' && recibido > 0 && recibido < t.total) return toast('El efectivo recibido no alcanza para cubrir el total.', 'error');
    const fa = Store.facturar(p.id, {
      metodo, conPropina, cliente: f.cliente.value.trim(), nit: f.nit.value.trim(),
      recibido: recibido || null, personas: Math.max(1, parseInt(f.personas.value, 10) || 1),
    });
    if (!fa) return toast('No se pudo facturar este pedido.', 'error');
    refrescar();
    toast(`Factura F-${pad(fa.numero)} registrada`, 'ok');
    abrirTicket(fa.id);
  },
  config(f) {
    Store.guardarConfig({
      nombre: f.nombre.value.trim() || "Llama's Wings", nit: f.nit.value.trim(), telefono: f.telefono.value.trim(), direccion: f.direccion.value.trim(),
      mesas: Math.min(60, Math.max(1, parseInt(f.mesas.value, 10) || 1)),
      propina: Math.min(30, Math.max(0, num(f.propina.value))), impuesto: Math.min(30, Math.max(0, num(f.impuesto.value))),
      impuestoIncluido: f.impuestoIncluido.checked,
    });
    refrescar(); toast('Ajustes guardados', 'ok');
  },
  cierre(f) {
    const c = Store.registrarCierre({ base: Math.max(0, num(f.base.value)), contado: Math.max(0, num(f.contado.value)), nota: f.nota.value.trim() });
    if (!c) return toast('No hay ventas por cerrar.', 'error');
    refrescar();
    toast(c.diferencia === 0 ? `Cierre #${c.numero}: la caja cuadró` : `Cierre #${c.numero} registrado (${c.diferencia > 0 ? 'sobrante' : 'faltante'} ${dinero(Math.abs(c.diferencia))})`, 'ok');
  },
};

document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  Formularios[f.dataset.form](f);
});

async function importarArchivo(archivo, input) {
  try {
    const texto = await archivo.text();
    if (!await confirmar({ titulo: '¿Importar este respaldo?', texto: 'Reemplazará todos los datos actuales.', ok: 'Importar', peligro: true })) return;
    Store.importar(texto);
    borrador = nuevoBorrador();
    refrescar();
    toast('Respaldo importado', 'ok');
  } catch (err) {
    toast(err.message || 'No se pudo leer el archivo.', 'error');
  } finally { input.value = ''; }
}

/* ---------- Arranque ---------- */
$('#logout').addEventListener('click', () => {
  Store.cerrarSesion();
  location.replace('index.html');
});
$('#modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) cerrarModal(); });
window.addEventListener('hashchange', () => { cerrarModal(); render({ nuevaPagina: true }); });

// Sincroniza varias pestañas/pantallas (p. ej. caja y cocina) sin servidor.
window.addEventListener('storage', (e) => {
  if (e.key !== 'alitas-pos.v2') return;
  Store.cargar();
  if (ruta().path !== '/nuevo') refrescar(); else pintarNav('/nuevo');
});

// Los cronómetros de cocina avanzan solos.
setInterval(() => { if (ruta().path === '/cocina' && !$('#modal').open) pintarCocina(); }, 30000);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render({ nuevaPagina: true });
