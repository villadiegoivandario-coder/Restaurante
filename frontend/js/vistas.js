'use strict';
/* ============================================================
   Vistas (páginas). Cada vista devuelve HTML; las funciones
   "pintar…" actualizan solo una zona para no perder el foco
   de los campos de búsqueda al escribir.
   ============================================================ */

const Vista = {
  filtroPedidos: 'activos', busquedaPedidos: '',
  tabFact: 'pendientes', busquedaFact: '',
  tabMenu: 'productos',
};
const Vistas = {};
const Despues = {};

/* ---------- Piezas compartidas ---------- */
const pill = (e) => `<span class="pill ${e}">${ESTADOS[e]}</span>`;
const lineaSabores = (it) => (it.sabores || []).map((s) => `${s.piezas} ${esc(s.nombre)}`).join(' · ');
const totalPedido = (p) => Store.totales(p.items, false).total;
const vacio = (ic, texto) => `<div class="lista-vacia">${icono(ic)}<p>${esc(texto)}</p></div>`;

function itemsHTML(items, max = 99) {
  const lis = items.slice(0, max).map((it) => `<li><strong>${it.cant}×</strong> ${esc(it.nombre)}${
    it.sabores && it.sabores.length ? `<div class="sabores-linea">${lineaSabores(it)}</div>` : ''}${
    it.acompanamiento ? `<div class="sabores-linea">Acompañamiento: ${it.acompanamientoCantidad || 1} × ${esc(it.acompanamiento)}</div>` : ''}${
    it.nota ? `<div class="sabores-linea">“${esc(it.nota)}”</div>` : ''}</li>`);
  if (items.length > max) lis.push(`<li class="more">+ ${items.length - max} más…</li>`);
  return `<ul class="pedido-items">${lis.join('')}</ul>`;
}

function botonesEstado(p, pequeno = true) {
  const sz = pequeno ? 'btn-sm' : '';
  if (SIGUIENTE[p.estado]) return `<button class="btn btn-primary ${sz}" data-accion="avanzar" data-id="${esc(p.id)}">${ACCION_SIGUIENTE[p.estado]}</button>`;
  if (p.estado === 'entregado') return `<button class="btn btn-ok ${sz}" data-accion="facturar" data-id="${esc(p.id)}">Facturar</button>`;
  return '';
}

function pedidoCard(p) {
  const extra = [p.cliente, p.telefono].filter(Boolean).map(esc).join(' · ');
  return `<article class="card pedido">
    <div class="pedido-top">
      <div><strong class="pedido-mesa">${esc(p.mesa)}</strong>
        <span class="pedido-meta">#${p.numero} · ${plural(p.items.reduce((s, i) => s + i.cant, 0), 'ítem', 'ítems')} · ${hora(p.creado)}${extra ? ` · ${extra}` : ''}</span></div>
      ${pill(p.estado)}
    </div>
    ${itemsHTML(p.items, 3)}
    ${p.nota ? `<div class="pedido-nota">${esc(p.nota)}</div>` : ''}
    <div class="pedido-foot">
      <strong>${dinero(totalPedido(p))}</strong>
      <div class="acciones">
        <button class="btn btn-sm" data-accion="detalle" data-id="${esc(p.id)}">Detalle</button>
        ${botonesEstado(p)}
      </div>
    </div></article>`;
}

/* ============================================================
   INICIO
   ============================================================ */
Vistas.erp = () => {
  const stats = Store.estadisticas();
  const bajoStock = stats.bajoStock.length;
  return `
  <div class="page-head"><div><h1>Panel ERP de Control</h1><p>Administración de inventario, menú, reportes y permisos</p></div></div>
  <div class="stats">
    <a class="stat" href="#/menu?tab=inventario"><span class="stat-label">Insumos con stock bajo</span><span class="stat-value ${bajoStock ? 'low' : 'ok'}">${bajoStock}</span></a>
    <a class="stat" href="#/menu?tab=productos"><span class="stat-label">Productos del menú</span><span class="stat-value">${Store.db.menu.length}</span></a>
    <a class="stat" href="#/reportes"><span class="stat-label">Facturas hoy</span><span class="stat-value">${stats.facturasHoy}</span></a>
    <a class="stat" href="#/reportes"><span class="stat-label">Ventas hoy</span><span class="stat-value ok">${dinero(stats.ventasHoy)}</span></a>
  </div>
  ${bajoStock ? `<a class="alerta section" href="#/menu?tab=inventario">${icono('alerta')}<span><strong>Revisar inventario:</strong> ${bajoStock} insumos están en su mínimo o por debajo.</span></a>` : ''}
  <section class="section"><h2 style="margin-bottom:12px">Gestión ERP</h2>
    <div class="actions-grid">
      <a class="action-card action-nuevo" href="#/menu?tab=inventario"><div><h3>Inventario</h3><p>Stock, recetas y lotes</p></div>${icono('menu')}</a>
      <a class="action-card action-facturar" href="#/menu?tab=productos"><div><h3>Menú y precios</h3><p>Productos y sabores</p></div>${icono('editar')}</a>
      <a class="action-card action-facturar" href="#/reportes"><div><h3>Reportes</h3><p>Ventas e indicadores</p></div>${icono('tendencia')}</a>
      <a class="action-card action-facturar" href="#/auditoria"><div><h3>Auditoría de permisos</h3><p>Accesos y decisiones registrados</p></div>${icono('archivo')}</a>
      <a class="action-card action-facturar" href="#/ajustes"><div><h3>Configuración ERP</h3><p>Datos del negocio y respaldos</p></div>${icono('ajustes')}</a>
    </div>
  </section>`;
};

Vistas.reportes = () => {
  const stats = Store.estadisticas();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 6);
  inicio.setHours(0, 0, 0, 0);
  const facturasSemana = Store.db.facturas.filter((factura) => new Date(factura.fecha) >= inicio);
  const ventasSemana = facturasSemana.reduce((total, factura) => total + factura.total, 0);
  const estados = Object.entries(ESTADOS).map(([estado, nombre]) => ({
    nombre,
    cantidad: Store.db.pedidos.filter((pedido) => pedido.estado === estado).length,
  }));
  return `
  <div class="page-head"><div><h1>Reportes</h1><p>Resumen de ventas, pedidos e inventario</p></div></div>
  <div class="stats">
    <div class="stat"><span class="stat-label">Ventas hoy</span><span class="stat-value ok">${dinero(stats.ventasHoy)}</span></div>
    <div class="stat"><span class="stat-label">Ventas últimos 7 días</span><span class="stat-value">${dinero(ventasSemana)}</span></div>
    <div class="stat"><span class="stat-label">Facturas últimos 7 días</span><span class="stat-value">${facturasSemana.length}</span></div>
    <div class="stat"><span class="stat-label">Alertas de stock</span><span class="stat-value ${stats.bajoStock.length ? 'low' : 'ok'}">${stats.bajoStock.length}</span></div>
  </div>
  <div class="two-col section">
    <section class="card card-pad"><h2>Pedidos por estado</h2>
      ${estados.map((estado) => `<div class="fila"><span>${esc(estado.nombre)}</span><strong>${estado.cantidad}</strong></div>`).join('')}
    </section>
    <section class="card card-pad"><h2>Productos más vendidos hoy</h2>
      ${stats.top.length ? `<ol class="ranking">${stats.top.map(([nombre, cantidad]) => `<li><span>${esc(nombre)}</span><strong>${cantidad}</strong></li>`).join('')}</ol>` : '<p class="muted">No hay ventas facturadas hoy.</p>'}
    </section>
  </div>`;
};

Vistas.auditoria = () => {
  const entries = PosAuth.getPermissionAudit();
  return `
  <div class="page-head"><div><h1>Auditoría de permisos</h1><p>Registro local de autenticaciones y decisiones de acceso</p></div></div>
  <p class="hint section">Este registro se almacena en este navegador y no sustituye una auditoría centralizada en el servidor.</p>
  <div class="card card-pad">
    ${entries.length ? `<div class="audit-list">${entries.map((entry) => `<div class="fila audit-row">
      <time class="pedido-meta">${esc(fechaHoraExacta(entry.timestamp))}</time>
      <div><strong>${esc(entry.name)}</strong><div class="pedido-meta">${esc(entry.role)} · ${esc(entry.type)} · ${esc(entry.resource)}</div></div>
      <span class="pill ${entry.allowed ? 'listo' : 'cancelado'}">${entry.allowed ? 'Permitido' : 'Denegado'}</span>
    </div>`).join('')}</div>` : '<p class="muted">Aún no hay eventos de acceso registrados.</p>'}
  </div>`;
};

Vistas.inicio = () => {
  const s = Store.estadisticas();
  const cajero = PosAuth.can('cash:close');
  const ocupadas = Store.estadoMesas();
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  const etiquetaMesa = { pendiente: 'Pedido nuevo', preparacion: 'En preparación', listo: 'Listo: servir', entregado: 'Por cobrar' };
  const mesas = Array.from({ length: Store.config.mesas }, (_, i) => {
    const m = `Mesa ${i + 1}`;
    const e = ocupadas[m];
    return `<button class="mesa ${e || ''}" data-accion="${e ? 'detalle-mesa' : 'mesa-libre'}" data-mesa="${esc(m)}">
      <strong>${m}</strong><span>${e ? etiquetaMesa[e] : 'Libre'}</span></button>`;
  }).join('');
  const recientes = [...Store.db.pedidos].sort((a, b) => b.creado.localeCompare(a.creado)).slice(0, 4);

  return `
  <div class="page-head"><div><h1>${saludo}</h1><p>${new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div></div>
  <section class="section"><h2 style="margin-bottom:12px">Acciones rápidas</h2>
    <div class="actions-grid">
      <a class="action-card action-nuevo" href="#/nuevo"><div><h3>Nuevo pedido</h3><p>${PosAuth.can('delivery') ? 'Mesa, para llevar o domicilio' : 'Pedidos para mesa'}</p></div>${icono('carrito')}</a>
      <a class="action-card action-facturar" href="#/facturacion"><div><h3>Facturar${s.porFacturar ? ` (${s.porFacturar})` : ''}</h3><p>${s.porFacturar ? 'Pedidos entregados por cobrar' : cajero ? 'Cobra y cierra la caja' : 'Cobra pedidos entregados'}</p></div>${icono('factura')}</a>
    </div>
  </section>

  <div class="two-col section">
    <div>
      <div class="section-head"><h2>Mesas</h2><span class="hint">Toca una mesa libre para abrir un pedido</span></div>
      <div class="mesas">${mesas}</div>
      <div class="section-head" style="margin-top:28px"><h2>Pedidos recientes</h2><a href="#/pedidos" class="hint">Ver todos</a></div>
      ${recientes.length ? `<div class="pedidos-lista" style="grid-template-columns:1fr">${recientes.map(pedidoCard).join('')}</div>` : `<div class="card">${vacio('archivo', 'Aún no hay pedidos. Crea el primero.')}</div>`}
    </div>
  </div>`;
};

/* ============================================================
   PEDIDOS
   ============================================================ */
const FILTROS = [['activos', 'Activos'], ['todos', 'Todos'], ['pendiente', 'Pendientes'], ['preparacion', 'En preparación'], ['listo', 'Listos'], ['entregado', 'Entregados'], ['facturado', 'Facturados'], ['cancelado', 'Cancelados']];
const pasaFiltro = (p, f) => f === 'todos' || (f === 'activos' ? ACTIVOS.includes(p.estado) : p.estado === f);

Vistas.pedidos = () => `
  <div class="page-head"><div><h1>Pedidos</h1><p>Sigue cada pedido desde que se toma hasta que se cobra</p></div>
    <a class="btn btn-primary" href="#/nuevo">+ Nuevo pedido</a></div>
  <div class="toolbar">
    <div class="search">${icono('buscar')}<input id="buscar-pedidos" class="input" type="search" placeholder="Buscar por mesa, cliente o número…" value="${esc(Vista.busquedaPedidos)}" aria-label="Buscar pedidos"></div>
    <div class="chips" id="chips-pedidos" role="group" aria-label="Filtrar por estado"></div>
  </div>
  <div id="lista-pedidos" class="pedidos-lista"></div>`;

function pintarPedidos() {
  const todos = Store.db.pedidos;
  const chips = $('#chips-pedidos');
  if (!chips) return;
  chips.innerHTML = FILTROS.map(([k, l]) => `<button class="chip ${Vista.filtroPedidos === k ? 'activo' : ''}" data-accion="filtro-pedidos" data-filtro="${k}">${l}<small>${todos.filter((p) => pasaFiltro(p, k)).length}</small></button>`).join('');
  const q = normalizar(Vista.busquedaPedidos);
  const lista = todos.filter((p) => pasaFiltro(p, Vista.filtroPedidos))
    .filter((p) => !q || normalizar(`${p.mesa} ${p.cliente} ${p.telefono} ${p.numero}`).includes(q))
    .sort((a, b) => b.creado.localeCompare(a.creado));
  $('#lista-pedidos').innerHTML = lista.length ? lista.map(pedidoCard).join('')
    : `<div class="card" style="grid-column:1/-1">${vacio('archivo', q ? 'Ningún pedido coincide con la búsqueda.' : 'No hay pedidos en esta vista.')}</div>`;
}
Despues.pedidos = pintarPedidos;

/* ============================================================
   NUEVO PEDIDO (también edita pedidos existentes)
   ============================================================ */
let borrador = nuevoBorrador();
function nuevoBorrador() {
  return { editId: null, mesa: '', cliente: '', telefono: '', direccion: '', nota: '', lineas: [], cat: 'Todas', q: '' };
}
function entrarNuevo(params) {
  const editar = params.get('editar');
  const mesa = params.get('mesa');
  if (editar) {
    const p = Store.pedido(editar);
    if (p && ACTIVOS.includes(p.estado)) {
      borrador = { ...nuevoBorrador(), editId: p.id, mesa: p.mesa, cliente: p.cliente, telefono: p.telefono, direccion: p.direccion, nota: p.nota, lineas: JSON.parse(JSON.stringify(p.items)) };
    }
  } else if (mesa) {
    if (borrador.editId) borrador = nuevoBorrador();
    borrador.mesa = mesa;
  }
  if (editar || mesa) history.replaceState(null, '', '#/nuevo');
}

Vistas.nuevo = () => {
  const ocupadas = Store.estadoMesas();
  const opciones = [...Array.from({ length: Store.config.mesas }, (_, i) => `Mesa ${i + 1}`)];
  if (PosAuth.can('delivery')) opciones.push('Para llevar', 'Domicilio');
  if (borrador.mesa && !opciones.includes(borrador.mesa)) opciones.unshift(borrador.mesa);
  const combos = Store.db.menu.filter((product) => product.piezas > 0);
  const adicionales = Store.db.menu.filter((product) => product.piezas === 0);
  return `
  <div class="menu-ardiente-page">
    <div class="menu-ardiente-layout">
      <section class="menu-ardiente-products">
        <div class="menu-ardiente-heading">
          <div><h1>Menú Ardiente</h1><p>Alitas crujientes con actitud y salsas legendarias.</p></div>
          ${borrador.editId ? '<button class="btn" data-accion="cancelar-edicion">Descartar cambios</button>' : ''}
        </div>
        <section class="menu-ardiente-section">
          <h2>🔥 Combos de alitas</h2>
          <div class="combo-grid">
            ${combos.map((product) => `<article class="combo-card">
              <div class="combo-card-top"><span class="combo-count">X${product.piezas}</span><span class="combo-price">${dinero(product.precio)}</span></div>
              <h3>${esc(product.nombre)}</h3>
              <p>${product.acompanamientoCantidad || 1} porción${product.acompanamientoCantidad === 1 ? '' : 'es'} de acompañamiento · Máx. ${Store.maxSaboresCombo(product)} sabores</p>
              <button class="btn btn-primary" data-accion="agregar" data-pid="${esc(product.id)}" ${product.activo ? '' : 'disabled'}>Seleccionar y agregar</button>
            </article>`).join('')}
          </div>
        </section>
        <section class="menu-ardiente-section">
          <h2>Adicionales y bebidas</h2>
          <div class="extras-grid">
            ${adicionales.map((product) => `<button class="extra-product" data-accion="agregar" data-pid="${esc(product.id)}" ${product.activo ? '' : 'disabled'}>
              <span>${esc(product.nombre)}</span><strong>${dinero(product.precio)}</strong>
            </button>`).join('')}
          </div>
        </section>
      </section>

      <aside class="card cart ardiente-cart" id="carrito">
        <h2>🔥 Comanda de pedido</h2>
        <div class="field"><label for="mesa-select">Mesa o tipo de pedido</label>
          <select id="mesa-select" class="input" data-campo="mesa" required>
            <option value="">Selecciona mesa</option>
            ${opciones.map((option) => `<option value="${esc(option)}" ${option === borrador.mesa ? 'selected' : ''}>${esc(option)}${ocupadas[option] && option !== borrador.mesa ? ' · Ocupada' : ''}</option>`).join('')}
          </select>
        </div>
        ${PosAuth.can('delivery') ? `<div class="field"><label for="f-cliente">Nombre del cliente</label><input id="f-cliente" class="input" data-campo="cliente" value="${esc(borrador.cliente)}" maxlength="60" autocomplete="off"></div>
          <div class="field"><label for="f-tel">Teléfono</label><input id="f-tel" class="input" data-campo="telefono" value="${esc(borrador.telefono)}" inputmode="tel" maxlength="20"></div>
          <div id="campos-domicilio" ${borrador.mesa === 'Domicilio' ? '' : 'hidden'}><div class="field"><label for="f-dir">Dirección de entrega</label><input id="f-dir" class="input" data-campo="direccion" value="${esc(borrador.direccion)}" maxlength="120"></div></div>` : `<div class="field"><label for="f-cliente">Cliente (opcional)</label><input id="f-cliente" class="input" data-campo="cliente" value="${esc(borrador.cliente)}" maxlength="60" autocomplete="off"></div>`}
        <div id="carrito-items" class="cart-items ardiente-cart-items"></div>
        <div class="field"><label for="f-nota">Nota / observación para cocina</label><textarea id="f-nota" class="input" data-campo="nota" maxlength="200" placeholder="Ej: salsa aparte, bien tostadas…">${esc(borrador.nota)}</textarea></div>
        <div id="carrito-total" class="totales"></div>
        <button class="btn btn-primary" style="width:100%;margin-top:14px;padding:12px" data-accion="guardar-pedido">${borrador.editId ? 'Guardar cambios' : 'Enviar a cocina y caja'}</button>
      </aside>
    </div>
  </div>
  <button class="cart-fab" id="cart-fab" data-accion="ir-carrito" hidden></button>`;
};

function pintarMenuPOS() {
  const grid = $('#menu-grid');
  if (!grid) return;
  const cats = ['Todas', ...new Set(Store.db.menu.map((p) => p.categoria))];
  $('#chips-menu').innerHTML = cats.map((c) => `<button class="chip ${borrador.cat === c ? 'activo' : ''}" data-accion="cat-menu" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  const q = normalizar(borrador.q);
  const lista = Store.db.menu.filter((p) => (borrador.cat === 'Todas' || p.categoria === borrador.cat) && (!q || normalizar(p.nombre).includes(q)));
  grid.innerHTML = lista.length ? lista.map((p) => {
    const cant = borrador.lineas.filter((l) => l.pid === p.id).reduce((s, l) => s + l.cant, 0);
    return `<button class="producto ${cant ? 'en-carrito' : ''}" data-accion="agregar" data-pid="${esc(p.id)}" ${p.activo ? '' : 'disabled'}>
      ${cant ? `<span class="cantidad">${cant}</span>` : ''}
      <span class="nombre">${esc(p.nombre)}</span>
      ${p.maxSabores ? `<span class="hint">${p.piezas} piezas · hasta ${Store.maxSaboresCombo(p)} sabores${p.acompanamientoRequerido ? ` · ${p.acompanamientoCantidad} ${p.acompanamientoCantidad === 1 ? 'acompañamiento' : 'acompañamientos'}` : ''}</span>` : ''}
      <span class="precio">${dinero(p.precio)}${p.activo ? '' : ' · Agotado'}</span></button>`;
  }).join('') : `<div style="grid-column:1/-1">${vacio('buscar', 'No hay productos que coincidan.')}</div>`;
}

function pintarCarrito() {
  const cont = $('#carrito-items');
  if (!cont) return;
  const ls = borrador.lineas;
  cont.innerHTML = ls.length ? ls.map((l) => `<div class="cart-item">
      <div><div class="n">${esc(l.nombre)}</div>
        ${l.sabores && l.sabores.length ? `<div class="p">${lineaSabores(l)}</div>` : ''}
        ${l.acompanamiento ? `<div class="p">Acompañamiento: ${l.acompanamientoCantidad || 1} × ${esc(l.acompanamiento)}</div>` : ''}
        ${l.nota ? `<div class="p">“${esc(l.nota)}”</div>` : ''}
        <div class="p">${dinero(l.precio * l.cant)}</div></div>
      <div class="qty">${l.sabores && l.sabores.length
        ? `<button data-accion="editar-linea" data-lid="${esc(l.lid)}" aria-label="Editar sabores">${icono('editar', 'icon-sm')}</button><button data-accion="quitar-linea" data-lid="${esc(l.lid)}" aria-label="Quitar">${icono('x', 'icon-sm')}</button>`
        : `<button data-accion="linea-menos" data-lid="${esc(l.lid)}" aria-label="Quitar uno">${icono('menos', 'icon-sm')}</button><span>${l.cant}</span><button data-accion="linea-mas" data-lid="${esc(l.lid)}" aria-label="Agregar uno">${icono('mas', 'icon-sm')}</button>`}</div>
    </div>`).join('') : `<p class="muted" style="padding:6px 0">Aún no has agregado productos.</p>`;
  const t = Store.totales(ls, false);
  const n = ls.reduce((s, l) => s + l.cant, 0);
  $('#carrito-total').innerHTML = `
    ${t.incluido ? '' : `<div><span>Subtotal</span><span>${dinero(t.subtotal)}</span></div><div><span>Impuesto consumo (${t.tasa}%)</span><span>${dinero(t.impuesto)}</span></div>`}
    <div class="total"><span style="color:inherit">Total</span><span>${dinero(t.total)}</span></div>
    ${t.incluido ? `<div><span>Incluye impuesto (${t.tasa}%)</span><span>${dinero(t.impuesto)}</span></div>` : ''}
    <div class="hint" style="display:block">La propina sugerida se agrega al cobrar.</div>`;
  const fab = $('#cart-fab');
  fab.hidden = !n;
  fab.innerHTML = `<span>${icono('carrito', 'icon-sm')} Ver pedido · ${plural(n, 'ítem', 'ítems')}</span><span>${dinero(t.total)}</span>`;
  pintarMenuPOS();
}
Despues.nuevo = () => { pintarMenuPOS(); pintarCarrito(); };

/* ============================================================
   FACTURACIÓN Y CAJA
   ============================================================ */
Vistas.facturacion = () => {
  const s = Store.estadisticas();
  const caja = PosAuth.can('cash:close');
  return `
  <div class="page-head"><div><h1>${caja ? 'Cuentas por cobrar / mesas activas' : 'Facturación'}</h1><p>${caja ? 'Pedidos enviados por los perfiles de mesero y pendientes de cobro' : 'Cobra los pedidos entregados y divide el total entre comensales'}</p></div></div>
  ${caja ? `<div class="stats" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat"><span class="stat-label">Pendientes por facturar</span><span class="stat-value">${s.porFacturar}</span></div>
    <div class="stat"><span class="stat-label">Facturas hoy</span><span class="stat-value">${s.facturasHoy}</span></div>
    <div class="stat"><span class="stat-label">Ventas hoy</span><span class="stat-value ok">${dinero(s.ventasHoy)}</span></div>
  </div>` : ''}
  <div class="section"><div class="tabs" id="tabs-fact" role="tablist"></div><div id="fact-contenido"></div></div>`;
};

function pintarFacturacion() {
  const cont = $('#fact-contenido');
  if (!cont) return;
  const pend = Store.db.pedidos.filter((p) => p.estado === 'entregado').sort((a, b) => a.actualizado.localeCompare(b.actualizado));
  const facts = Store.db.facturas;
  const sinCierre = facts.filter((f) => !f.cierreId).length;
  const tabs = [['pendientes', `Pendientes de facturar (${pend.length})`]];
  if (PosAuth.can('cash:close')) {
    tabs.push(['historial', `Historial (${facts.length})`]);
    tabs.push(['caja', `Cierre de caja${sinCierre ? ` (${sinCierre})` : ''}`]);
  }
  if (!tabs.some(([key]) => key === Vista.tabFact)) Vista.tabFact = 'pendientes';
  $('#tabs-fact').innerHTML = tabs.map(([k, l]) => `<button class="tab ${Vista.tabFact === k ? 'activo' : ''}" role="tab" aria-selected="${Vista.tabFact === k}" data-accion="tab-fact" data-tab="${k}">${l}</button>`).join('');

  if (Vista.tabFact === 'pendientes') {
    cont.innerHTML = pend.length ? `<div class="card">${pend.map((p) => `<div class="fila">
        <span class="num">#${p.numero}</span>
        <div><strong>${esc(p.mesa)}</strong><div class="pedido-meta">${plural(p.items.reduce((s, i) => s + i.cant, 0), 'ítem', 'ítems')} · ID mesero ${esc(p.creadoPor?.profileId || p.creadoPor?.userId || 'N/D')} · entregado ${hora(p.actualizado)}${p.cliente ? ` · ${esc(p.cliente)}` : ''}</div></div>
        <button class="btn btn-sm" data-accion="detalle" data-id="${esc(p.id)}">Detalle</button>
        <span class="monto">${dinero(totalPedido(p))}</span>
        <button class="btn btn-ok btn-sm" data-accion="facturar" data-id="${esc(p.id)}">Facturar</button></div>`).join('')}</div>`
      : `<div class="card">${vacio('factura', 'No hay pedidos pendientes de facturar')}</div>`;
  } else if (Vista.tabFact === 'historial') {
    cont.innerHTML = `<div class="search" style="margin-bottom:14px">${icono('buscar')}<input id="buscar-fact" class="input" type="search" placeholder="Buscar por mesa, cliente o número de factura…" value="${esc(Vista.busquedaFact)}" aria-label="Buscar facturas"></div><div id="lista-facturas"></div>`;
    pintarHistorial();
  } else {
    cont.innerHTML = vistaCaja();
  }
}

function pintarHistorial() {
  const el = $('#lista-facturas');
  if (!el) return;
  const q = normalizar(Vista.busquedaFact);
  const fs = [...Store.db.facturas].reverse().filter((f) => !q || normalizar(`F-${pad(f.numero)} ${f.mesa} ${f.cliente} ${f.nit}`).includes(q));
  el.innerHTML = fs.length ? `<div class="card">${fs.map((f) => `<div class="fila">
      <span class="num">F-${pad(f.numero)}</span>
      <div><strong>${esc(f.mesa)}</strong><div class="pedido-meta">${fechaHora(f.fecha)}${f.cliente ? ` · ${esc(f.cliente)}` : ''}</div></div>
      <span class="metodo">${f.metodo}</span>
      <span class="monto">${dinero(f.total)}</span>
      <button class="btn btn-sm" data-accion="ver-factura" data-id="${esc(f.id)}">Ver</button></div>`).join('')}</div>`
    : `<div class="card">${vacio('archivo', q ? 'Ninguna factura coincide.' : 'No hay facturas registradas')}</div>`;
}

function vistaCaja() {
  const r = Store.resumenCaja();
  const cierres = [...Store.db.cierres].reverse();
  return `<div class="two-col">
    <div class="card card-pad">
      <h2 style="margin-bottom:12px">Turno actual</h2>
      ${r.facturas ? `<div class="totales" style="border:none;padding:0;margin-bottom:16px">
        <div><span>Facturas sin cerrar</span><span>${r.facturas}</span></div>
        <div><span>Efectivo</span><span>${dinero(r.por.efectivo)}</span></div>
        <div><span>Tarjeta</span><span>${dinero(r.por.tarjeta)}</span></div>
        <div><span>Transferencia</span><span>${dinero(r.por.transferencia)}</span></div>
        <div><span>Propinas incluidas</span><span>${dinero(r.propinas)}</span></div>
        <div class="total"><span style="color:inherit">Total vendido</span><span>${dinero(r.total)}</span></div></div>
      <form data-form="cierre" data-efectivo="${r.por.efectivo}">
        <div class="row">
          <div class="field"><label for="c-base">Base de caja inicial</label><input id="c-base" name="base" class="input touch-numeric" type="text" inputmode="none" readonly value="0" aria-label="Base de caja inicial"></div>
          <div class="field"><label for="c-contado">Efectivo contado (arqueo)</label><input id="c-contado" name="contado" class="input touch-numeric" type="text" inputmode="none" readonly required aria-label="Efectivo contado"></div>
        </div>
        <div class="field"><label for="c-nota">Nota (opcional)</label><input id="c-nota" name="nota" class="input" maxlength="120"></div>
        <div id="cierre-dif" class="hint" style="margin-bottom:14px">Efectivo esperado: ${dinero(r.por.efectivo)}</div>
        <button class="btn btn-primary" type="submit">Registrar cierre de caja</button>
      </form>` : `<p class="muted">No hay ventas por cerrar. Cuando factures aparecerán aquí.</p>`}
    </div>
    <div class="card card-pad"><h2 style="margin-bottom:12px">Cierres anteriores</h2>
      ${cierres.length ? cierres.slice(0, 8).map((c) => `<div class="fila" style="grid-template-columns:1fr auto;padding:10px 0">
        <div><strong>Cierre #${c.numero}</strong><div class="pedido-meta">${fechaHora(c.fecha)} · ${plural(c.facturas, 'factura', 'facturas')}</div></div>
        <div style="text-align:right"><strong>${dinero(c.total)}</strong><div class="pedido-meta" style="color:${c.diferencia === 0 ? 'var(--ok)' : 'var(--danger)'}">${c.diferencia === 0 ? 'Cuadró' : (c.diferencia > 0 ? 'Sobrante ' : 'Faltante ') + dinero(Math.abs(c.diferencia))}</div></div></div>`).join('') : '<p class="muted">Todavía no hay cierres.</p>'}
    </div></div>`;
}

Despues.facturacion = pintarFacturacion;

/* ============================================================
   MENÚ (productos, sabores, inventario)
   ============================================================ */
Vistas.menu = () => `
  <div class="page-head"><div><h1>${PosAuth.can('menu:write') ? 'Menú e inventario' : 'Consulta de inventario'}</h1><p>${PosAuth.can('menu:write') ? 'Productos, sabores de alitas y stock por receta' : 'Existencias disponibles en modo de solo lectura'}</p></div>
    <div id="menu-cta"></div></div>
  <div class="tabs" id="tabs-menu" role="tablist"></div>
  <div id="menu-contenido"></div>`;

function pintarMenuAdmin() {
  const cont = $('#menu-contenido');
  if (!cont) return;
  const db = Store.db;
  const bajo = db.ingredientes.filter((i) => i.stock <= i.minimo).length;
  const admin = PosAuth.can('menu:write');
  if (!admin) Vista.tabMenu = 'inventario';
  const tabs = admin
    ? [['productos', `Productos (${db.menu.length})`], ['sabores', `Sabores (${db.sabores.length})`], ['inventario', `Inventario${bajo ? ` · ${bajo} bajo` : ''}`]]
    : [['inventario', `Inventario${bajo ? ` · ${bajo} bajo` : ''}`]];
  $('#tabs-menu').innerHTML = tabs.map(([k, l]) => `<button class="tab ${Vista.tabMenu === k ? 'activo' : ''}" role="tab" aria-selected="${Vista.tabMenu === k}" data-accion="tab-menu" data-tab="${k}">${l}</button>`).join('');
  const cta = { productos: ['nuevo-producto', 'Nuevo producto'], sabores: ['nuevo-sabor', 'Nuevo sabor'], inventario: ['nuevo-ingrediente', 'Nuevo ingrediente'] }[Vista.tabMenu];
  $('#menu-cta').innerHTML = admin ? `<button class="btn btn-primary" data-accion="${cta[0]}">+ ${cta[1]}</button>` : '<span class="hint">Consulta de solo lectura</span>';
  const botones = (editar, borrar, id, extra = '') => `<div class="acciones">${extra}
    <button class="btn btn-ghost btn-icon" data-accion="${editar}" data-id="${esc(id)}" aria-label="Editar">${icono('editar', 'icon-sm')}</button>
    <button class="btn btn-ghost btn-icon btn-danger" data-accion="${borrar}" data-id="${esc(id)}" aria-label="Eliminar">${icono('basura', 'icon-sm')}</button></div>`;
  const interruptor = (accion, id, on, etiqueta) => `<label class="switch" title="${etiqueta}"><input type="checkbox" data-accion="${accion}" data-id="${esc(id)}" ${on ? 'checked' : ''} aria-label="${etiqueta}"><i></i></label>`;

  if (Vista.tabMenu === 'productos') {
    const cats = [...new Set(db.menu.map((p) => p.categoria))];
    cont.innerHTML = cats.length ? cats.map((c) => `<div class="menu-cat"><h2>${esc(c)}</h2><div class="card">
      ${db.menu.filter((p) => p.categoria === c).map((p) => `<div class="menu-fila ${p.activo ? '' : 'off'}">
        <div><div class="nombre"><strong>${esc(p.nombre)}</strong></div>
          <div class="pedido-meta">${p.maxSabores ? `${p.piezas} piezas · hasta ${p.maxSabores} sabores · ` : ''}${p.receta.length ? `${plural(p.receta.length, 'ingrediente', 'ingredientes')}` : 'Sin receta'}</div></div>
        <span class="precio">${dinero(p.precio)}</span>
        ${interruptor('toggle-producto', p.id, p.activo, 'Disponible')}
        ${botones('editar-producto', 'eliminar-producto', p.id)}</div>`).join('')}</div></div>`).join('')
      : `<div class="card" style="margin-top:20px">${vacio('menu', 'Aún no hay productos.')}</div>`;
  } else if (Vista.tabMenu === 'sabores') {
    cont.innerHTML = `<div class="card" style="margin-top:20px">${db.sabores.length ? db.sabores.map((s) => {
      const i = Store.ingrediente(s.ing);
      return `<div class="menu-fila ${s.activo ? '' : 'off'}">
        <div><div class="nombre"><strong>${esc(s.nombre)}</strong></div><div class="pedido-meta">${NIVELES_PICANTE[s.picante]}${i ? ` · ${s.porPieza} ${esc(i.unidad)} de ${esc(i.nombre)} por pieza` : ' · sin salsa vinculada'}</div></div>
        ${picante(s.picante)}
        ${interruptor('toggle-sabor', s.id, s.activo, 'Disponible')}
        ${botones('editar-sabor', 'eliminar-sabor', s.id)}</div>`;
    }).join('') : vacio('menu', 'Aún no hay sabores.')}</div>`;
  } else {
    const groups = [
      ['Proteínas', (item) => /alita|pollo/i.test(item.nombre)],
      ['Acompañamientos', (item) => /papa|yuca/i.test(item.nombre)],
      ['Consumibles y bebidas', (item) => /coca|kola|manzana|heineken|budweiser|club colombia|coronita|agua/i.test(item.nombre)],
      ['Insumos y salsas', (item) => /salsa|bbq|teriyaki|mostaza|parmesano/i.test(item.nombre)],
    ];
    const byGroup = groups.map(([name, matches]) => [name, db.ingredientes.filter(matches)]).filter(([, items]) => items.length);
    const assigned = new Set(byGroup.flatMap(([, items]) => items.map((item) => item.id)));
    const otherItems = db.ingredientes.filter((item) => !assigned.has(item.id));
    if (otherItems.length) byGroup.push(['Otros insumos', otherItems]);
    cont.innerHTML = db.ingredientes.length ? byGroup.map(([name, items]) => `<section class="inventory-group">
      <h2>${esc(name)}</h2><div class="card">${items.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((i) => {
        const capacity = Math.max(Number(i.capacidad) || 0, Number(i.stock), Number(i.minimo) * 2, 1);
        const percentage = Math.min(100, Math.round(Number(i.stock) / capacity * 100));
        const level = Number(i.stock) <= Number(i.minimo) ? 'critical' : Number(i.stock) <= Number(i.minimo) * 1.5 ? 'warning' : 'healthy';
        const low = level === 'critical';
        return `<div class="menu-fila inv">
          <div class="inventory-name"><strong>${esc(i.nombre)}</strong><div class="pedido-meta">Mínimo ${i.minimo} ${esc(i.unidad)}${i.numeroLote ? ` · Lote: ${esc(i.numeroLote)}` : ''}</div>
            <div class="stock-meter ${level}" role="meter" aria-label="Stock de ${esc(i.nombre)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}"><span style="width:${percentage}%"></span></div></div>
          <span class="stock ${low ? 'low' : ''}">${low ? icono('alerta', 'icon-sm') : ''}${i.stock.toLocaleString('es-CO')} ${esc(i.unidad)}</span>
          ${admin ? botones('editar-ingrediente', 'eliminar-ingrediente', i.id, `<button class="btn btn-sm" data-accion="ajustar-stock" data-id="${esc(i.id)}">Ingresar insumos</button>`) : ''}</div>`;
      }).join('')}</div></section>`).join('') : `<div class="card">${vacio('menu', 'Aún no hay ingredientes.')}</div>`;
  }
}
Despues.menu = pintarMenuAdmin;

/* ============================================================
   AJUSTES
   ============================================================ */
Vistas.ajustes = () => {
  const c = Store.config;
  return `
  <div class="page-head"><div><h1>Ajustes</h1><p>Datos del negocio, impuestos y respaldo</p></div></div>
  <div class="ajustes">
    <form class="card card-pad" data-form="config">
      <h2>Datos legales y del negocio</h2>
      <div class="field"><label for="a-nombre">Nombre</label><input id="a-nombre" name="nombre" class="input" value="${esc(c.nombre)}" required maxlength="50"></div>
      <div class="field"><label for="a-legal">Nombre legal del establecimiento</label><input id="a-legal" name="nombreLegal" class="input" value="${esc(c.nombreLegal || '')}" required maxlength="100"></div>
      <div class="row">
        <div class="field"><label for="a-nit">NIT del establecimiento</label><input id="a-nit" name="nit" class="input" value="${esc(c.nit)}" maxlength="25" required></div>
        <div class="field"><label for="a-tel">Teléfono</label><input id="a-tel" name="telefono" class="input" value="${esc(c.telefono)}" maxlength="25" required></div>
      </div>
      <div class="field"><label for="a-dir">Dirección</label><input id="a-dir" name="direccion" class="input" value="${esc(c.direccion)}" maxlength="100" required></div>
      <div class="row">
        <div class="field"><label for="a-mesas">Número de mesas</label><input id="a-mesas" name="mesas" class="input" type="number" min="1" max="60" value="${c.mesas}" required></div>
        <div class="field"><label for="a-prop">Propina sugerida (%)</label><input id="a-prop" name="propina" class="input" type="number" min="0" max="30" value="${c.propina}" required></div>
      </div>
      <div class="row">
        <div class="field"><label for="a-imp">Impuesto al consumo (%)</label><input id="a-imp" name="impuesto" class="input" type="number" min="0" max="30" step="0.5" value="${c.impuesto}" required></div>
        <div class="field"><span class="label">Precios del menú</span><label class="check" style="min-height:42px"><input type="checkbox" name="impuestoIncluido" ${c.impuestoIncluido ? 'checked' : ''}> Ya incluyen el impuesto</label></div>
      </div>
      <button class="btn btn-primary" type="submit">Guardar cambios</button>
    </form>
    <div class="card card-pad">
      <h2>Datos</h2>
      <p class="muted" style="margin-bottom:14px">Todo se guarda en este navegador. Descarga un respaldo con frecuencia, o para llevar los datos a otro equipo.</p>
      <div class="acciones" style="margin-bottom:18px">
        <button class="btn" data-accion="exportar">${icono('descargar', 'icon-sm')} Descargar respaldo</button>
        <label class="btn">${icono('subir', 'icon-sm')} Importar respaldo<input type="file" id="archivo-import" accept="application/json,.json" hidden></label>
      </div>
      <h2 style="margin-bottom:8px">Zona de riesgo</h2>
      <p class="muted" style="margin-bottom:12px">Borra pedidos, facturas y menú, y vuelve a los datos de ejemplo.</p>
      <button class="btn btn-danger" data-accion="reiniciar">Borrar todos los datos</button>
    </div>
  </div>`;
};
