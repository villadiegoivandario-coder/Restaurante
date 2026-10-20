'use strict';
/* ============================================================
   Modales: detalle de pedido, sabores de alitas, cobro,
   comprobante y formularios de catálogo.
   ============================================================ */

const cabeceraModal = (titulo, sub = '') => `
  <div class="modal-head"><div><h2 id="modal-titulo">${titulo}</h2>${sub ? `<div class="pedido-meta">${sub}</div>` : ''}</div>
  <button class="btn btn-ghost btn-icon" data-accion="cerrar-modal" aria-label="Cerrar">${icono('x')}</button></div>`;

const filasItems = (items) => `<table class="items-tabla"><tbody>${items.map((i) => `<tr>
  <td>${i.cant}×</td>
  <td>${esc(i.nombre)}${i.sabores && i.sabores.length ? `<div class="sabores-linea">${(i.sabores).map((s) => `${s.piezas} ${esc(s.nombre)} ${picante(s.picante)}`).join('<br>')}</div>` : ''}${i.nota ? `<div class="sabores-linea">“${esc(i.nota)}”</div>` : ''}</td>
  <td>${dinero(i.precio * i.cant)}</td></tr>`).join('')}</tbody></table>`;

/* ---------- Detalle de pedido ---------- */
function abrirDetalle(id) {
  const p = Store.pedido(id);
  if (!p) return;
  const t = Store.totales(p.items, false);
  const activo = ACTIVOS.includes(p.estado);
  abrirModal(`
    ${cabeceraModal(esc(p.mesa), `Pedido #${p.numero} · ${fechaHora(p.creado)}`)}
    <div style="margin-bottom:14px">${pill(p.estado)}</div>
    ${[p.cliente && `Cliente: ${esc(p.cliente)}`, p.telefono && `Tel: ${esc(p.telefono)}`, p.direccion && `Dirección: ${esc(p.direccion)}`].filter(Boolean).map((x) => `<div class="muted">${x}</div>`).join('')}
    <div style="height:10px"></div>
    ${filasItems(p.items)}
    ${p.nota ? `<div class="pedido-nota" style="margin-bottom:14px">Nota: ${esc(p.nota)}</div>` : ''}
    <div class="timeline">${p.historial.map((h) => `${ESTADOS[h.estado]} ${hora(h.fecha)}`).join(' → ')}</div>
    <div class="totales">
      ${t.incluido ? '' : `<div><span>Subtotal</span><span>${dinero(t.subtotal)}</span></div><div><span>Impuesto consumo (${t.tasa}%)</span><span>${dinero(t.impuesto)}</span></div>`}
      <div class="total"><span style="color:inherit">Total</span><span>${dinero(t.total)}</span></div>
    </div>
    <div class="modal-actions">
      ${activo ? `<button class="btn btn-danger" data-accion="cancelar" data-id="${esc(p.id)}">Cancelar pedido</button>
        <button class="btn" data-accion="editar" data-id="${esc(p.id)}">${icono('editar', 'icon-sm')} Editar</button>` : ''}
      ${p.estado === 'facturado' && p.facturaId ? `<button class="btn" data-accion="ver-factura" data-id="${esc(p.facturaId)}">Ver comprobante</button>` : ''}
      ${botonesEstado(p, false)}
    </div>`);
}

/* ---------- Sabores de alitas ---------- */
let cfgAlitas = null;

function abrirConfigAlitas(pid, lid) {
  const p = Store.producto(pid);
  const linea = lid ? borrador.lineas.find((l) => l.lid === lid) : null;
  cfgAlitas = { pid, lid: lid || null, asign: {}, nota: linea ? linea.nota || '' : '' };
  if (linea) linea.sabores.forEach((s) => { cfgAlitas.asign[s.fid] = s.piezas; });
  const sabores = Store.db.sabores.filter((s) => s.activo);
  abrirModal(`
    ${cabeceraModal(esc(p.nombre), `${p.piezas} piezas · hasta ${plural(p.maxSabores, 'sabor', 'sabores')} · ${dinero(p.precio)}`)}
    ${sabores.length ? sabores.map((s) => `<div class="sabor-fila">
      <div><strong>${esc(s.nombre)}</strong> ${picante(s.picante)}<div class="hint">${NIVELES_PICANTE[s.picante]}</div></div>
      <div class="qty"><button data-accion="sabor-menos" data-fid="${esc(s.id)}" aria-label="Quitar pieza de ${esc(s.nombre)}">${icono('menos', 'icon-sm')}</button>
        <span id="sq-${esc(s.id)}">0</span>
        <button data-accion="sabor-mas" data-fid="${esc(s.id)}" aria-label="Agregar pieza de ${esc(s.nombre)}">${icono('mas', 'icon-sm')}</button></div></div>`).join('')
      : vacio('alerta', 'No hay sabores disponibles. Actívalos en Menú → Sabores.')}
    <div id="cfg-resumen" class="cfg-resumen"></div>
    <div class="field"><label for="cfg-nota">Nota (opcional)</label><input id="cfg-nota" class="input" maxlength="80" placeholder="Ej: bien doradas" value="${esc(cfgAlitas.nota)}"></div>
    <div class="modal-actions">
      <button class="btn" data-accion="cerrar-modal">Cancelar</button>
      <button class="btn btn-primary" id="cfg-ok" data-accion="confirmar-alitas">${lid ? 'Guardar' : 'Confirmar e ir a pedido'}</button>
    </div>`);
  refrescarConfigAlitas();
}

function refrescarConfigAlitas() {
  if (!cfgAlitas) return;
  const p = Store.producto(cfgAlitas.pid);
  const a = cfgAlitas.asign;
  const total = Object.values(a).reduce((s, n) => s + n, 0);
  const distintos = Object.values(a).filter((n) => n > 0).length;
  Store.db.sabores.filter((s) => s.activo).forEach((s) => {
    const n = a[s.id] || 0;
    const el = $(`#sq-${CSS.escape(s.id)}`);
    if (el) el.textContent = n;
    const mas = $(`[data-accion="sabor-mas"][data-fid="${CSS.escape(s.id)}"]`);
    if (mas) mas.disabled = total >= p.piezas || (n === 0 && distintos >= p.maxSabores);
    const menos = $(`[data-accion="sabor-menos"][data-fid="${CSS.escape(s.id)}"]`);
    if (menos) menos.disabled = n === 0;
  });
  const faltan = p.piezas - total;
  const r = $('#cfg-resumen');
  r.className = `cfg-resumen ${faltan === 0 ? 'completo' : ''}`;
  r.textContent = faltan === 0 ? `Listo: ${p.piezas} de ${p.piezas} piezas asignadas` : `Te faltan ${faltan} alitas por asignar sabor`;
  $('#cfg-ok').disabled = faltan !== 0;
}

function confirmarAlitas() {
  const c = cfgAlitas;
  const p = Store.producto(c.pid);
  const sabores = Object.entries(c.asign).filter(([, n]) => n > 0).map(([fid, piezas]) => {
    const s = Store.sabor(fid);
    return { fid, nombre: s.nombre, piezas, picante: s.picante };
  });
  if (sabores.reduce((s, x) => s + x.piezas, 0) !== p.piezas) return;
  const nota = $('#cfg-nota').value.trim();
  if (c.lid) {
    const l = borrador.lineas.find((x) => x.lid === c.lid);
    if (l) Object.assign(l, { sabores, nota });
  } else {
    borrador.lineas.push({ lid: uid(), pid: p.id, nombre: p.nombre, precio: p.precio, cant: 1, sabores, nota, estacion: p.estacion });
  }
  cfgAlitas = null;
  cerrarModal();
  pintarCarrito();
}

/* ---------- Cobro ---------- */
function abrirFacturar(id) {
  const p = Store.pedido(id);
  if (!p || p.estado !== 'entregado') { toast('Este pedido no está listo para facturar.', 'error'); return; }
  const pct = Store.config.propina;
  const m = abrirModal(`
    ${cabeceraModal(`Facturar · ${esc(p.mesa)}`, `Pedido #${p.numero}`)}
    <form data-form="facturar" data-id="${esc(p.id)}">
      ${filasItems(p.items)}
      <div class="row">
        <div class="field"><label for="fa-cliente">Cliente</label><input id="fa-cliente" name="cliente" class="input" value="${esc(p.cliente)}" maxlength="60" autocomplete="off"></div>
        <div class="field"><label for="fa-nit">NIT / Cédula</label><input id="fa-nit" name="nit" class="input" maxlength="20" inputmode="numeric" autocomplete="off"></div>
      </div>
      <div class="field"><span class="label">Método de pago</span>
        <div class="metodos">${METODOS.map((x, i) => `<label><input type="radio" name="metodo" value="${x}" ${i === 0 ? 'checked' : ''}><span>${x[0].toUpperCase() + x.slice(1)}</span></label>`).join('')}</div></div>
      <div class="field" id="campo-efectivo"><label for="fa-recibido">Efectivo recibido (opcional)</label>
        <input id="fa-recibido" name="recibido" class="input touch-numeric" type="text" inputmode="none" readonly aria-label="Efectivo recibido"><div class="hint" id="fa-cambio"></div></div>
      <div class="row">
        ${pct > 0 ? `<div class="field"><span class="label">Propina</span><label class="check" style="min-height:42px"><input type="checkbox" name="propina" checked> Sugerida ${pct}%</label></div>` : '<input type="hidden" name="propina">'}
        <div class="field"><label for="fa-personas">Dividir entre (personas)</label><input id="fa-personas" name="personas" class="input touch-numeric" type="text" inputmode="none" readonly value="1" aria-label="Número de personas"></div>
      </div>
      <div class="totales" id="fact-tot"></div>
      <div class="modal-actions">
        <button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button>
        <button type="submit" class="btn btn-ok">Confirmar cobro</button>
      </div>
    </form>`);
  actualizarFacturar($('form', m));
}

function actualizarFacturar(form) {
  const p = Store.pedido(form.dataset.id);
  const t = Store.totales(p.items, !!(form.propina && form.propina.checked));
  const metodo = form.metodo.value;
  const personas = Math.max(1, parseInt(form.personas.value, 10) || 1);
  $('#fact-tot').innerHTML = `
    ${t.incluido ? '' : `<div><span>Subtotal</span><span>${dinero(t.subtotal)}</span></div><div><span>Impuesto consumo (${t.tasa}%)</span><span>${dinero(t.impuesto)}</span></div>`}
    ${t.propina ? `<div><span>Propina</span><span>${dinero(t.propina)}</span></div>` : ''}
    <div class="total"><span style="color:inherit">Total a cobrar</span><span>${dinero(t.total)}</span></div>
    ${personas > 1 ? `<div><span>Cada persona (${personas})</span><span>${dinero(Math.ceil(t.total / personas))}</span></div>` : ''}`;
  $('#campo-efectivo').hidden = metodo !== 'efectivo';
  const rec = parseFloat(form.recibido.value) || 0;
  $('#fa-cambio').textContent = rec ? (rec >= t.total ? `Cambio: ${dinero(rec - t.total)}` : `Faltan ${dinero(t.total - rec)}`) : '';
}

/* ---------- Comprobante ---------- */
function abrirTicket(id) {
  const f = Store.factura(id);
  if (!f) return;
  const c = Store.config;
  abrirModal(`
    <div class="ticket">
      <h2>${esc(c.nombre)}</h2>
      <div class="c">${[c.nit && `NIT ${esc(c.nit)}`, esc(c.direccion), esc(c.telefono)].filter(Boolean).join(' · ')}</div>
      <hr>
      <div class="t-line"><strong>Comprobante F-${pad(f.numero)}</strong><span>${fechaHora(f.fecha)}</span></div>
      <div>${esc(f.mesa)} · Pedido #${f.pedidoNumero}</div>
      ${f.cliente ? `<div>Cliente: ${esc(f.cliente)}${f.nit ? ` · ${esc(f.nit)}` : ''}</div>` : ''}
      <hr>
      <table>${f.items.map((i) => `<tr><td>${i.cant}</td><td>${esc(i.nombre)}${(i.sabores || []).map((s) => `<br><small>&nbsp;&nbsp;${s.piezas} ${esc(s.nombre)}</small>`).join('')}</td><td>${dinero(i.precio * i.cant)}</td></tr>`).join('')}</table>
      <hr>
      ${f.incluido ? '' : `<div class="t-line"><span>Subtotal</span><span>${dinero(f.subtotal)}</span></div>`}
      <div class="t-line"><span>${f.incluido ? 'Incluye imp. consumo' : 'Imp. consumo'} (${f.tasa}%)</span><span>${dinero(f.impuesto)}</span></div>
      ${f.propina ? `<div class="t-line"><span>Propina</span><span>${dinero(f.propina)}</span></div>` : ''}
      <div class="t-line t-total"><span>TOTAL</span><span>${dinero(f.total)}</span></div>
      <hr>
      <div class="t-line"><span>Pago</span><span style="text-transform:capitalize">${f.metodo}</span></div>
      ${f.recibido ? `<div class="t-line"><span>Recibido</span><span>${dinero(f.recibido)}</span></div><div class="t-line"><span>Cambio</span><span>${dinero(Math.max(0, f.recibido - f.total))}</span></div>` : ''}
      ${f.personas > 1 ? `<div class="t-line"><span>Dividido entre ${f.personas}</span><span>${dinero(Math.ceil(f.total / f.personas))} c/u</span></div>` : ''}
      <hr><div class="c">¡Gracias por tu visita!</div>
      <div class="c" style="font-size:11px;margin-top:6px">Comprobante interno. No reemplaza la factura electrónica DIAN.</div>
    </div>
    <h2 id="modal-titulo" class="sr-only">Comprobante F-${pad(f.numero)}</h2>
    <div class="modal-actions no-print">
      <button class="btn" data-accion="cerrar-modal">Cerrar</button>
      <button class="btn btn-primary" data-accion="imprimir">${icono('imprimir', 'icon-sm')} Imprimir</button>
    </div>`);
}

/* ---------- Formularios de catálogo ---------- */
const opcionesIngredientes = (sel) => Store.db.ingredientes.map((i) => `<option value="${esc(i.id)}" ${i.id === sel ? 'selected' : ''}>${esc(i.nombre)} (${esc(i.unidad)})</option>`).join('');
const filaReceta = (r = {}) => `<div class="receta-fila">
  <select class="input" name="r_ing" aria-label="Ingrediente">${opcionesIngredientes(r.ing)}</select>
  <input class="input" name="r_cant" type="number" min="0" step="any" value="${r.cant ?? ''}" placeholder="Cantidad" aria-label="Cantidad por porción">
  <button type="button" class="btn btn-ghost btn-icon btn-danger" data-accion="quitar-fila" aria-label="Quitar ingrediente">${icono('x', 'icon-sm')}</button></div>`;

function abrirProducto(id) {
  const p = id ? Store.producto(id) : { nombre: '', categoria: '', precio: '', piezas: 0, maxSabores: 0, estacion: 'armado', receta: [] };
  const cats = [...new Set(Store.db.menu.map((x) => x.categoria))];
  abrirModal(`
    ${cabeceraModal(id ? 'Editar producto' : 'Nuevo producto')}
    <form data-form="producto" data-id="${esc(id || '')}">
      <div class="field"><label for="p-nombre">Nombre</label><input id="p-nombre" name="nombre" class="input" value="${esc(p.nombre)}" required maxlength="50" autocomplete="off"></div>
      <div class="row">
        <div class="field"><label for="p-cat">Categoría</label><input id="p-cat" name="categoria" class="input" list="lista-cats" value="${esc(p.categoria)}" required maxlength="30" autocomplete="off"><datalist id="lista-cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div class="field"><label for="p-precio">Precio (COP)</label><input id="p-precio" name="precio" class="input" type="number" min="0" step="100" value="${esc(p.precio)}" required inputmode="numeric"></div>
      </div>
      <div class="field"><label for="p-est">Estación de cocina</label><select id="p-est" name="estacion" class="input">${Object.entries(ESTACIONES).map(([k, v]) => `<option value="${k}" ${k === p.estacion ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <label class="check" style="margin-bottom:14px"><input type="checkbox" name="conSabores" ${p.maxSabores ? 'checked' : ''}> Se sirve con sabores (alitas)</label>
      <div class="row" id="campos-sabores" ${p.maxSabores ? '' : 'hidden'}>
        <div class="field"><label for="p-piezas">Piezas por porción</label><input id="p-piezas" name="piezas" class="input" type="number" min="1" max="100" value="${p.piezas || 10}"></div>
        <div class="field"><label for="p-max">Máx. sabores distintos</label><input id="p-max" name="maxSabores" class="input" type="number" min="1" max="6" value="${p.maxSabores || 2}"></div>
      </div>
      <div class="field"><span class="label">Receta (se descuenta del inventario por cada unidad vendida)</span>
        <div id="receta-filas">${p.receta.map(filaReceta).join('')}</div>
        <div><button type="button" class="btn btn-sm" data-accion="receta-fila">+ Ingrediente</button></div></div>
      <div class="modal-actions"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div>
    </form>`);
}

function abrirSabor(id) {
  const s = id ? Store.sabor(id) : { nombre: '', picante: 0, ing: '', porPieza: 8 };
  abrirModal(`
    ${cabeceraModal(id ? 'Editar sabor' : 'Nuevo sabor')}
    <form data-form="sabor" data-id="${esc(id || '')}">
      <div class="field"><label for="s-nombre">Nombre</label><input id="s-nombre" name="nombre" class="input" value="${esc(s.nombre)}" required maxlength="40" autocomplete="off"></div>
      <div class="field"><label for="s-pic">Nivel de picante</label><select id="s-pic" name="picante" class="input">${NIVELES_PICANTE.map((n, i) => `<option value="${i}" ${i === s.picante ? 'selected' : ''}>${i}/5 · ${n}</option>`).join('')}</select></div>
      <div class="row">
        <div class="field"><label for="s-ing">Salsa en inventario</label><select id="s-ing" name="ing" class="input"><option value="">Ninguna</option>${opcionesIngredientes(s.ing)}</select></div>
        <div class="field"><label for="s-pp">Cantidad por pieza</label><input id="s-pp" name="porPieza" class="input" type="number" min="0" step="any" value="${s.porPieza}"></div>
      </div>
      <div class="modal-actions"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div>
    </form>`);
}

function abrirIngrediente(id) {
  const i = id ? Store.ingrediente(id) : { nombre: '', unidad: 'g', stock: 0, minimo: 0 };
  abrirModal(`
    ${cabeceraModal(id ? 'Editar ingrediente' : 'Nuevo ingrediente')}
    <form data-form="ingrediente" data-id="${esc(id || '')}">
      <div class="field"><label for="i-nombre">Nombre</label><input id="i-nombre" name="nombre" class="input" value="${esc(i.nombre)}" required maxlength="50" autocomplete="off"></div>
      <div class="row">
        <div class="field"><label for="i-unidad">Unidad</label><input id="i-unidad" name="unidad" class="input" list="lista-unidades" value="${esc(i.unidad)}" required maxlength="12"><datalist id="lista-unidades"><option value="g"><option value="ml"><option value="unidad"><option value="porción"></datalist></div>
        <div class="field"><label for="i-stock">Stock actual</label><input id="i-stock" name="stock" class="input" type="number" min="0" step="any" value="${i.stock}" required></div>
      </div>
      <div class="field"><label for="i-min">Alertar cuando quede (mínimo)</label><input id="i-min" name="minimo" class="input" type="number" min="0" step="any" value="${i.minimo}" required></div>
      <div class="modal-actions"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div>
    </form>`);
}

function abrirStock(id) {
  const i = Store.ingrediente(id);
  abrirModal(`
    ${cabeceraModal('Ajustar stock', esc(i.nombre))}
    <form data-form="stock" data-id="${esc(id)}">
      <p class="muted" style="margin-bottom:14px">Stock actual: <strong>${i.stock.toLocaleString('es-CO')} ${esc(i.unidad)}</strong></p>
      <div class="field"><label for="st-delta">Cantidad (positiva = entra compra, negativa = sale/merma)</label>
        <input id="st-delta" name="delta" class="input" type="number" step="any" required placeholder="Ej: 5000 o -200"></div>
      <div class="modal-actions"><button type="button" class="btn" data-accion="cerrar-modal">Cancelar</button><button type="submit" class="btn btn-primary">Aplicar</button></div>
    </form>`);
}
