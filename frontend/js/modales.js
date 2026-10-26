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
  <td>${esc(i.nombre)}${i.sabores && i.sabores.length ? `<div class="sabores-linea">${(i.sabores).map((s) => `${s.piezas} ${esc(s.nombre)} ${picante(s.picante)}`).join('<br>')}</div>` : ''}${i.acompanamiento ? `<div class="sabores-linea">Acompañamiento: ${i.acompanamientoCantidad || 1} × ${esc(i.acompanamiento)}</div>` : ''}${i.nota ? `<div class="sabores-linea">Modificador: “${esc(i.nota)}”</div>` : ''}</td>
  <td>${dinero(i.precio * i.cant)}</td></tr>`).join('')}</tbody></table>`;

/* ---------- Detalle de pedido ---------- */
function abrirDetalle(id) {
  const p = Store.pedido(id);
  if (!p) return;
  const t = Store.totales(p.items, false);
  const activo = ACTIVOS.includes(p.estado);
  const creador = p.creadoPor;
  const tipo = p.tipo === 'domicilio' || p.mesa === 'Domicilio' ? 'Domicilio' : p.tipo === 'llevar' || p.mesa === 'Para llevar' ? 'Para llevar' : `Mesa ${p.mesa.replace(/^Mesa\s*/i, '')}`;
  abrirModal(`
    ${cabeceraModal(esc(tipo), `Pedido #${p.numero} · ${fechaHoraExacta(p.creado)}`)}
    <div class="pedido-meta">ID: ${esc(p.id)}</div>
    <div class="pedido-meta">Atendido por: ${esc(creador?.nombre || 'Sin registro')} ${creador?.rol ? `· ${esc(PosAuth.roleLabel(creador.rol) || creador.rol)}` : ''}</div>
    <div style="margin-bottom:14px">${pill(p.estado)}</div>
    ${[p.cliente && `Cliente: ${esc(p.cliente)}`, p.telefono && `Tel: ${esc(p.telefono)}`, p.direccion && `Dirección: ${esc(p.direccion)}`].filter(Boolean).map((x) => `<div class="muted">${x}</div>`).join('')}
    <div style="height:10px"></div>
    ${filasItems(p.items)}
    ${p.nota ? `<div class="pedido-nota" style="margin-bottom:14px">Nota: ${esc(p.nota)}</div>` : ''}
    ${p.anulacion ? `<div class="pedido-nota" style="margin-bottom:14px">Anulado con PIN por ${esc(p.anulacion.autorizadoPor)} · ${fechaHoraExacta(p.anulacion.fecha)}</div>` : ''}
    <div class="timeline">${p.historial.map((h) => `${ESTADOS[h.estado]} ${hora(h.fecha)}`).join(' → ')}</div>
    <div class="totales">
      ${t.incluido ? '' : `<div><span>Subtotal</span><span>${dinero(t.subtotal)}</span></div><div><span>Impuesto consumo (${t.tasa}%)</span><span>${dinero(t.impuesto)}</span></div>`}
      <div class="total"><span style="color:inherit">Total</span><span>${dinero(t.total)}</span></div>
    </div>
    <div class="modal-actions">
      ${activo ? `<button class="btn btn-danger" data-accion="cancelar" data-id="${esc(p.id)}">Anular comanda (PIN admin)</button>
        <button class="btn" data-accion="editar" data-id="${esc(p.id)}">${icono('editar', 'icon-sm')} Editar</button>` : ''}
      ${p.estado === 'facturado' && p.facturaId ? `<button class="btn" data-accion="ver-factura" data-id="${esc(p.facturaId)}">Ver comprobante</button>` : ''}
      ${botonesEstado(p, false)}
    </div>`);
}

function abrirAutorizacionAnulacion(id) {
    const p = Store.pedido(id);
    if (!p || !ACTIVOS.includes(p.estado)) {
      toast('Esta comanda ya no puede anularse.', 'error');
      return;
    }
    abrirModal(`
      ${cabeceraModal(`Autorizar anulación #${p.numero}`, 'Se requiere el PIN de administrador')}
      <form data-form="anular-pedido" data-id="${esc(p.id)}">
        <div class="field"><label for="anular-pin">PIN de administrador</label>
          <input id="anular-pin" name="pin" class="input touch-numeric" type="password" inputmode="none" readonly autocomplete="off" required minlength="4" maxlength="4" data-secret="true" aria-label="PIN de administrador"></div>
        <p class="hint">La acción queda registrada y devuelve el consumo al inventario.</p>
        <div class="modal-actions">
          <button type="button" class="btn" data-accion="cerrar-modal">Volver</button>
          <button type="submit" class="btn btn-danger">Validar y anular</button>
        </div>
      </form>`);
}

/* ---------- Sabores de alitas ---------- */
let cfgAlitas = null;

function abrirConfigAlitas(pid, lid) {
  const p = Store.producto(pid);
  const linea = lid ? borrador.lineas.find((l) => l.lid === lid) : null;
  cfgAlitas = {
    pid,
    lid: lid || null,
    sabores: linea?.sabores?.map((s) => s.fid) || [],
    acompanamiento: linea?.acompanamiento || '',
    nota: linea ? linea.nota || '' : '',
  };
  const maxSabores = Store.maxSaboresCombo(p);
  const sabores = Store.db.sabores.filter((s) => s.activo);
  abrirModal(`
    ${cabeceraModal(esc(p.nombre), `${p.piezas} piezas · hasta ${maxSabores} sabores · reparto equitativo · ${dinero(p.precio)}`)}
    ${sabores.length ? `<div class="field"><span class="label">Elige tus sabores</span>
      <div class="flavor-grid" role="group" aria-label="Sabores del combo">
        ${sabores.map((s) => `<button type="button" class="flavor-option ${cfgAlitas.sabores.includes(s.id) ? 'seleccionado' : ''}" data-accion="toggle-sabor-alitas" data-fid="${esc(s.id)}" data-flavor-tone="${tonoSabor(s)}" aria-pressed="${cfgAlitas.sabores.includes(s.id)}">
          <span class="flavor-option__led" aria-hidden="true"></span><span class="flavor-option__name">${esc(s.nombre)}</span>
          <span class="flavor-option__level">${esc(NIVELES_PICANTE[s.picante])}</span><span class="flavor-option__pieces"></span>
          <span class="flavor-option__check" aria-hidden="true">✓</span>
        </button>`).join('')}
      </div>
      <p class="hint flavor-counter" id="cfg-contador-sabores"></p></div>`
      : vacio('alerta', 'No hay sabores disponibles. Actívalos en Menú → Sabores.')}
    ${p.acompanamientoRequerido ? `<div class="field"><label for="cfg-acompanamiento">Acompañamiento obligatorio · ${p.acompanamientoCantidad} ${p.acompanamientoCantidad === 1 ? 'porción' : 'porciones'}</label>
      <select id="cfg-acompanamiento" class="input" required>
        <option value="">Selecciona Papas o Yuquitas</option>
        ${['Papas', 'Yuquitas'].map((nombre) => `<option value="${nombre}" ${cfgAlitas.acompanamiento === nombre ? 'selected' : ''}>${nombre}</option>`).join('')}
      </select></div>` : ''}
    <div id="cfg-resumen" class="cfg-resumen"></div>
    <div class="field"><label for="cfg-nota">Nota (opcional)</label><input id="cfg-nota" class="input" maxlength="80" placeholder="Ej: bien doradas" value="${esc(cfgAlitas.nota)}"></div>
    <div class="modal-actions">
      <button class="btn" data-accion="cerrar-modal">Cancelar</button>
      <button class="btn btn-primary" id="cfg-ok" data-accion="confirmar-alitas">${lid ? 'Guardar' : 'Confirmar e ir a pedido'}</button>
    </div>`);
  if (p.acompanamientoRequerido) {
    $('#cfg-acompanamiento').addEventListener('change', (event) => {
      cfgAlitas.acompanamiento = event.target.value;
      actualizarConfigAlitas();
    });
  }
  $('#cfg-nota').addEventListener('input', (event) => { cfgAlitas.nota = event.target.value; });
  actualizarConfigAlitas();
}

function tonoSabor(sabor) {
  const id = sabor.id.toLowerCase();
  const nombre = normalizar(sabor.nombre);
  if (id.includes('bbq') && id.includes('picante') || nombre.includes('picante')) return 'fire';
  if (nombre.includes('ajo') || nombre.includes('parmesano')) return 'cream';
  if (nombre.includes('miel') || nombre.includes('mostaza')) return 'amber';
  if (nombre.includes('teriyaki')) return 'teal';
  return 'bbq';
}

function actualizarConfigAlitas() {
  if (!cfgAlitas) return;
  const p = Store.producto(cfgAlitas.pid);
  const maxSabores = Store.maxSaboresCombo(p);
  const reparto = Store.distribuirPiezas(p.piezas, cfgAlitas.sabores.length);
  const saboresDisponibles = cfgAlitas.sabores.every((fid) => Store.sabor(fid)?.activo);
  const seleccionadoValido = saboresDisponibles
    && cfgAlitas.sabores.length > 0
    && cfgAlitas.sabores.length <= maxSabores
    && new Set(cfgAlitas.sabores).size === cfgAlitas.sabores.length;
  const valido = Boolean(
    seleccionadoValido
    && (!p.acompanamientoRequerido || cfgAlitas.acompanamiento),
  );
  const opciones = document.querySelectorAll('.flavor-option');
  opciones.forEach((opcion) => {
    const index = cfgAlitas.sabores.indexOf(opcion.dataset.fid);
    const selected = index !== -1;
    opcion.classList.toggle('seleccionado', selected);
    opcion.setAttribute('aria-pressed', String(selected));
    const pieces = opcion.querySelector('.flavor-option__pieces');
    pieces.textContent = selected ? `${reparto[index]} PIEZAS` : '';
  });
  const contador = $('#cfg-contador-sabores');
  if (contador) contador.textContent = `${cfgAlitas.sabores.length}/${maxSabores} SABORES · ${p.piezas} PIEZAS`;
  const r = $('#cfg-resumen');
  r.className = `cfg-resumen ${valido ? 'completo' : ''}`;
  if (!cfgAlitas.sabores.length) r.textContent = 'Selecciona al menos un sabor para continuar.';
  else if (!saboresDisponibles) r.textContent = 'Uno de los sabores de este pedido ya no está disponible.';
  else if (!seleccionadoValido) r.textContent = 'Selecciona una combinación válida de sabores distintos.';
  else if (p.acompanamientoRequerido && !cfgAlitas.acompanamiento) r.textContent = 'Selecciona el acompañamiento obligatorio.';
  else {
    const nombres = cfgAlitas.sabores.map((fid, index) => {
      const sabor = Store.sabor(fid);
      return `${sabor.nombre}: ${reparto[index]}`;
    });
    r.textContent = `${nombres.join(' · ')} · ${reparto.reduce((total, piezas) => total + piezas, 0)}/${p.piezas} piezas`;
  }
  $('#cfg-ok').disabled = !valido;
}

function toggleSaborAlitas(fid) {
  if (!cfgAlitas || !Store.sabor(fid)?.activo) return;
  const index = cfgAlitas.sabores.indexOf(fid);
  if (index >= 0) cfgAlitas.sabores.splice(index, 1);
  else {
    const p = Store.producto(cfgAlitas.pid);
    if (cfgAlitas.sabores.length >= Store.maxSaboresCombo(p)) {
      toast(`Este combo permite hasta ${Store.maxSaboresCombo(p)} sabores.`, 'error');
      return;
    }
    cfgAlitas.sabores.push(fid);
  }
  actualizarConfigAlitas();
}

function confirmarAlitas() {
  const c = cfgAlitas;
  const p = Store.producto(c.pid);
  const reparto = Store.distribuirPiezas(p.piezas, c.sabores.length);
  if (c.sabores.length < 1 || c.sabores.length > Store.maxSaboresCombo(p)
    || c.sabores.some((fid) => !Store.sabor(fid)?.activo)
    || new Set(c.sabores).size !== c.sabores.length
    || reparto.length !== c.sabores.length
    || (p.acompanamientoRequerido && !c.acompanamiento)) {
    actualizarConfigAlitas();
    return;
  }
  const sabores = c.sabores.map((fid, index) => {
    const s = Store.sabor(fid);
    return { fid, nombre: s.nombre, piezas: reparto[index], picante: s.picante };
  });
  if (sabores.some((s) => !s?.fid || !Number.isInteger(s.piezas) || s.piezas < 1)
    || sabores.reduce((s, x) => s + x.piezas, 0) !== p.piezas) return;
  const nota = $('#cfg-nota').value.trim();
  if (c.lid) {
    const l = borrador.lineas.find((x) => x.lid === c.lid);
    if (l) Object.assign(l, { sabores, nota, acompanamiento: c.acompanamiento, acompanamientoCantidad: p.acompanamientoCantidad || 1 });
  } else {
    borrador.lineas.push({
      lid: uid(), pid: p.id, nombre: p.nombre, precio: p.precio, cant: 1, sabores, nota,
      acompanamiento: c.acompanamiento, acompanamientoCantidad: p.acompanamientoCantidad || 1,
    });
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
  const domicilio = p.tipo === 'domicilio' || p.mesa === 'Domicilio';
  const m = abrirModal(`
    ${cabeceraModal(`Facturar · ${esc(p.mesa)}`, `Pedido #${p.numero}`)}
    <form data-form="facturar" data-id="${esc(p.id)}">
      ${filasItems(p.items)}
      <div class="row">
        <div class="field"><label for="fa-cliente">Nombre del cliente</label><input id="fa-cliente" name="cliente" class="input" value="${esc(p.cliente)}" maxlength="60" autocomplete="name" required></div>
        <div class="field"><label for="fa-nit">Cédula / NIT del cliente</label><input id="fa-nit" name="nit" class="input" maxlength="20" autocomplete="off" required></div>
      </div>
      ${domicilio ? `<div class="row"><div class="field"><label>Teléfono de entrega</label><input class="input" value="${esc(p.telefono)}" readonly></div>
        <div class="field"><label>Dirección de entrega</label><input class="input" value="${esc(p.direccion)}" readonly></div></div>` : ''}
      <p class="hint">Para expedir el comprobante, el administrador debe completar nombre legal, NIT y dirección del establecimiento en Ajustes.</p>
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
  abrirModal(`
    <div class="ticket">
      <div class="ticket-logo"><img src="assets/logo.avif" alt="Llama's Wings"></div>
      <h2>${esc(f.nombreLegal)}</h2>
      <div class="c">${[`NIT ${esc(f.nitEmisor)}`, esc(f.direccionEmisor), esc(f.telefonoEmisor)].join(' · ')}</div>
      <hr>
      <div class="t-line"><strong>Factura F-${pad(f.numero)}</strong><span>${fechaHoraExacta(f.fecha)}</span></div>
      <div>${esc(f.mesa)} · Pedido #${f.pedidoNumero} · ID ${esc(f.pedidoId)}</div>
      <div>Tipo: ${f.tipo === 'domicilio' ? 'Domicilio' : f.tipo === 'llevar' ? 'Para llevar' : 'Mesa'}</div>
      <div>Terminal: ${esc(f.terminalId)}</div>
      <div>Atendido por: ${esc(f.creadoPor?.nombre || 'Sin registro')}${f.creadoPor?.rol ? ` · ${esc(PosAuth.roleLabel(f.creadoPor.rol) || f.creadoPor.rol)}` : ''}</div>
      <div>Facturado por: ${esc(f.facturadoPor.nombre)} · ${esc(PosAuth.roleLabel(f.facturadoPor.rol) || f.facturadoPor.rol)}</div>
      <div>Pedido creado: ${fechaHoraExacta(f.pedidoCreado || f.fecha)}</div>
      <div>Cliente: ${esc(f.cliente)} · Cédula / NIT: ${esc(f.nit)}</div>
      ${f.telefono ? `<div>Teléfono: ${esc(f.telefono)}</div>` : ''}
      ${f.direccion ? `<div>Dirección: ${esc(f.direccion)}</div>` : ''}
      <hr>
      <table>${f.items.map((i) => `<tr><td>${i.cant}</td><td>${esc(i.nombre)}${(i.sabores || []).map((s) => `<br><small>&nbsp;&nbsp;${s.piezas} de ${esc(s.nombre)}</small>`).join('')}${i.acompanamiento ? `<br><small>&nbsp;&nbsp;Acompañamiento: ${i.acompanamientoCantidad || 1} × ${esc(i.acompanamiento)}</small>` : ''}${i.nota ? `<br><strong>Modificador: ${esc(i.nota)}</strong>` : ''}</td><td>${dinero(i.precio * i.cant)}</td></tr>`).join('')}</table>
      ${f.nota ? `<p style="font-weight:700">Nota especial: ${esc(f.nota)}</p>` : ''}
      <hr>
      <div class="t-line"><span>Subtotal</span><span>${dinero(f.subtotal)}</span></div>
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
  const p = id ? Store.producto(id) : { nombre: '', categoria: '', precio: '', piezas: 0, maxSabores: 0, receta: [] };
  const cats = [...new Set(Store.db.menu.map((x) => x.categoria))];
  abrirModal(`
    ${cabeceraModal(id ? 'Editar producto' : 'Nuevo producto')}
    <form data-form="producto" data-id="${esc(id || '')}">
      <div class="field"><label for="p-nombre">Nombre</label><input id="p-nombre" name="nombre" class="input" value="${esc(p.nombre)}" required maxlength="50" autocomplete="off"></div>
      <div class="row">
        <div class="field"><label for="p-cat">Categoría</label><input id="p-cat" name="categoria" class="input" list="lista-cats" value="${esc(p.categoria)}" required maxlength="30" autocomplete="off"><datalist id="lista-cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div class="field"><label for="p-precio">Precio (COP)</label><input id="p-precio" name="precio" class="input" type="number" min="0" step="100" value="${esc(p.precio)}" required inputmode="numeric"></div>
      </div>
      <label class="check" style="margin-bottom:14px"><input type="checkbox" name="conSabores" ${p.maxSabores ? 'checked' : ''}> Se sirve con sabores (alitas)</label>
      <div class="row" id="campos-sabores" ${p.maxSabores ? '' : 'hidden'}>
        <div class="field"><label for="p-piezas">Piezas por porción</label><input id="p-piezas" name="piezas" class="input" type="number" min="1" max="100" value="${p.piezas || 10}"></div>
        <div class="field"><label for="p-max">Máx. sabores distintos</label><input id="p-max" name="maxSabores" class="input" type="number" min="1" max="2" value="${Math.min(p.maxSabores || 2, 2)}"></div>
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
  const i = id ? Store.ingrediente(id) : { nombre: '', unidad: 'g', stock: 0, minimo: 0, numeroLote: '' };
  abrirModal(`
    ${cabeceraModal(id ? 'Editar ingrediente' : 'Nuevo ingrediente')}
    <form data-form="ingrediente" data-id="${esc(id || '')}">
      <div class="field"><label for="i-nombre">Nombre</label><input id="i-nombre" name="nombre" class="input" value="${esc(i.nombre)}" required maxlength="50" autocomplete="off"></div>
      <div class="row">
        <div class="field"><label for="i-unidad">Unidad</label><input id="i-unidad" name="unidad" class="input" list="lista-unidades" value="${esc(i.unidad)}" required maxlength="12"><datalist id="lista-unidades"><option value="g"><option value="ml"><option value="unidad"><option value="porción"></datalist></div>
        <div class="field"><label for="i-stock">Stock actual</label><input id="i-stock" name="stock" class="input" type="number" min="0" step="any" value="${i.stock}" required></div>
      </div>
      <div class="field"><label for="i-min">Alertar cuando quede (mínimo)</label><input id="i-min" name="minimo" class="input" type="number" min="0" step="any" value="${i.minimo}" required></div>
      <div class="field"><label for="i-lote">Número de serie / código de lote</label><input id="i-lote" name="numeroLote" class="input" value="${esc(i.numeroLote || '')}" maxlength="80" autocomplete="off" placeholder="Ej: LOTE-2026-001"></div>
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
