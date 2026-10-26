'use strict';
/* ============================================================
   Store: datos + reglas de negocio (persistencia en localStorage).
   Las colecciones replican el esquema relacional del diseño
   (Producto, Sabor, Ingrediente, Receta, Pedido, Ítem, Factura),
   de modo que migrar a una API + PostgreSQL sea directo.
   ============================================================ */

const ESTADOS = {
  pendiente: 'Pendiente', preparacion: 'En preparación', listo: 'Listo',
  entregado: 'Entregado', facturado: 'Facturado', cancelado: 'Cancelado',
};
const ACTIVOS = ['pendiente', 'preparacion', 'listo', 'entregado'];
const SIGUIENTE = { pendiente: 'preparacion', preparacion: 'listo', listo: 'entregado' };
const ACCION_SIGUIENTE = { pendiente: 'Iniciar preparación', preparacion: 'Marcar listo', listo: 'Marcar entregado' };
const NIVELES_PICANTE = ['Sin picante', 'Suave', 'Medio', 'Picante', 'Muy picante', 'Fuego'];
const METODOS = ['efectivo', 'tarjeta', 'transferencia'];
const VERSION_MENU_OFICIAL = 3;
const IDS_MENU_INICIAL_ANTERIOR = new Set([
  'p_a6', 'p_a10', 'p_a16', 'p_papas', 'p_blue', 'p_ranch',
  'p_gaseosa', 'p_limonada', 'p_cerveza', 'p_agua',
]);
const IDS_SABORES_INICIALES_ANTERIORES = new Set([
  's_bbq', 's_miel', 's_bufalo', 's_maracuya', 's_limon', 's_habanero',
]);

const Store = (() => {
  const KEY = 'alitas-pos.v2';
  let db;
  const ahora = () => new Date().toISOString();

  /* ---------- Datos iniciales ---------- */
  function datosIniciales() {
    const ing = (id, nombre, unidad, stock, minimo) => ({ id, nombre, unidad, stock, minimo, numeroLote: '' });
    const sab = (id, nombre, picante, ingId) => ({ id, nombre, picante, activo: true, ing: ingId, porPieza: 8 });
    const prod = (o) => ({ activo: true, piezas: 0, maxSabores: 0, receta: [], ...o });
    const bebida = (id, nombre, precio) => prod({
      id, nombre, categoria: 'Bebidas', precio,
      receta: [{ ing: `i_${id}`, cant: 1 }],
    });
    const comboAlitas = (id, piezas, precio, acompanamientoCantidad) => prod({
      id, nombre: `Alitas x${piezas}`, categoria: 'Combos de alitas', precio, piezas,
      maxSabores: piezas >= 36 ? 4 : piezas >= 12 ? 3 : 2,
      acompanamientoRequerido: true, acompanamientoCantidad,
      recetasAcompanamiento: {
        Papas: { ing: 'i_papa', cant: 200 },
        Yuquitas: { ing: 'i_yuca', cant: 200 },
      },
      receta: [{ ing: 'i_alita', cant: piezas * 50 }],
    });
    return {
      menuVersion: VERSION_MENU_OFICIAL,
      config: { nombre: "Llama's Wings", nombreLegal: '', nit: '', direccion: '', telefono: '302 271 2981', mesas: 8, impuesto: 8, impuestoIncluido: false, propina: 10 },
      ingredientes: [
        ing('i_alita', 'Alita cruda', 'g', 30000, 5000),
        ing('i_papa', 'Papa francesa', 'g', 15000, 3000),
        ing('i_yuca', 'Yuquitas', 'g', 10000, 2000),
        ing('i_bbq', 'Salsa BBQ', 'ml', 4000, 800),
        ing('i_bbq_picante', 'Salsa BBQ Picante', 'ml', 3000, 600),
        ing('i_ajo_parmesano', 'Salsa Ajo Parmesano', 'ml', 3000, 600),
        ing('i_miel_mostaza', 'Salsa Miel Mostaza', 'ml', 3000, 600),
        ing('i_teriyaki', 'Salsa Teriyaki', 'ml', 3000, 600),
        ...[
          ['coca_cola_400', 'Coca-Cola 400ml', 96, 12],
          ['coca_cola_15l', 'Coca-Cola 1.5L', 48, 6],
          ['kola_roman_400', 'Kola Román 400ml', 48, 6],
          ['manzana', 'Manzana', 48, 6],
          ['agua_manzana_600', 'Agua Manzana 600ml', 48, 6],
          ['agua', 'Agua', 48, 6],
          ['heineken', 'Heineken', 48, 6],
          ['budweiser', 'Budweiser', 48, 6],
          ['club_colombia', 'Club Colombia', 48, 6],
          ['coronita', 'Coronita', 48, 6],
        ].map(([id, nombre, stock, minimo]) => ing(`i_${id}`, nombre, 'unidad', stock, minimo)),
      ],
      sabores: [
        sab('s_bbq_oficial', 'BBQ', 1, 'i_bbq'),
        sab('s_bbq_picante', 'BBQ Picante', 3, 'i_bbq_picante'),
        sab('s_ajo_parmesano', 'Ajo Parmesano', 0, 'i_ajo_parmesano'),
        sab('s_miel_mostaza', 'Miel Mostaza', 0, 'i_miel_mostaza'),
        sab('s_teriyaki', 'Teriyaki', 0, 'i_teriyaki'),
      ],
      menu: [
        comboAlitas('combo_x6', 6, 18000, 1),
        comboAlitas('combo_x8', 8, 23000, 1),
        comboAlitas('combo_x12', 12, 34000, 1),
        comboAlitas('combo_x24', 24, 64000, 2),
        comboAlitas('combo_x36', 36, 84000, 2),
        prod({ id: 'extra_papas', nombre: 'Porción de Papas', categoria: 'Adicionales', precio: 5000, receta: [{ ing: 'i_papa', cant: 200 }] }),
        prod({ id: 'extra_yuquitas', nombre: 'Porción de Yuquitas', categoria: 'Adicionales', precio: 5000, receta: [{ ing: 'i_yuca', cant: 200 }] }),
        bebida('coca_cola_400', 'Coca-Cola 400ml', 4000),
        bebida('coca_cola_15l', 'Coca-Cola 1.5L', 8000),
        bebida('kola_roman_400', 'Kola Román 400ml', 4000),
        bebida('manzana', 'Manzana', 4000),
        bebida('agua_manzana_600', 'Agua Manzana 600ml', 4000),
        bebida('agua', 'Agua', 4000),
        bebida('heineken', 'Heineken', 5500),
        bebida('budweiser', 'Budweiser', 5500),
        bebida('club_colombia', 'Club Colombia', 6000),
        bebida('coronita', 'Coronita', 6500),
      ],
      pedidos: [], facturas: [], cierres: [],
      contadores: { pedido: 1, factura: 1 },
    };
  }

  /* ---------- Persistencia ---------- */
  function cargar() {
    const d = datosIniciales();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        const config = { ...d.config, ...p.config };
        if (config.nombre === 'Mis Alitas' || config.nombre === 'Llamas Wings') {
          config.nombre = d.config.nombre;
        }
        const ingredientes = [...(p.ingredientes || [])];
        for (const inicial of d.ingredientes) {
          if (!ingredientes.some((item) => item.id === inicial.id)) ingredientes.push(inicial);
        }
        let menu = p.menu || d.menu;
        let sabores = p.sabores || d.sabores;
        if ((p.menuVersion || 0) < VERSION_MENU_OFICIAL) {
          menu = menu.filter((item) => !IDS_MENU_INICIAL_ANTERIOR.has(item.id));
          menu = [...menu, ...d.menu.filter((item) => !menu.some((existente) => existente.id === item.id))];
          sabores = sabores.filter((item) => !IDS_SABORES_INICIALES_ANTERIORES.has(item.id));
          sabores = [...sabores, ...d.sabores.filter((item) => !sabores.some((existente) => existente.id === item.id))];
        }
        db = {
          ...d, ...p, config: { ...config, nombreLegal: config.nombreLegal || '', telefono: config.telefono || d.config.telefono },
          ingredientes, menu, sabores, menuVersion: VERSION_MENU_OFICIAL,
          contadores: { ...d.contadores, ...p.contadores },
        };
        guardar();
        return;
      }
    } catch (e) { /* datos corruptos o sin acceso: se arranca limpio */ }
    db = d;
  }
  function guardar() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch (e) { return false; }
  }
  function cerrarSesion() {
    localStorage.removeItem('llamas-wings.session');
    sessionStorage.removeItem('llamas-wings.session');
  }

  /* ---------- Consultas ---------- */
  const buscar = (col) => (id) => db[col].find((x) => x.id === id);
  const pedido = buscar('pedidos');
  const producto = buscar('menu');
  const sabor = buscar('sabores');
  const ingrediente = buscar('ingredientes');
  const factura = buscar('facturas');

  function maxSaboresCombo(p) {
    const limitesOficiales = { combo_x6: 2, combo_x8: 2, combo_x12: 3, combo_x24: 3, combo_x36: 4 };
    return limitesOficiales[p?.id] || Math.min(p?.piezas || 0, p?.maxSabores || 2);
  }

  function distribuirPiezas(piezas, cantidadSabores) {
    if (!Number.isInteger(piezas) || !Number.isInteger(cantidadSabores)
      || piezas < 1 || cantidadSabores < 1 || cantidadSabores > piezas) return [];
    const base = Math.floor(piezas / cantidadSabores);
    const sobrantes = piezas % cantidadSabores;
    return Array.from({ length: cantidadSabores }, (_, indice) => base + (indice < sobrantes ? 1 : 0));
  }

  function validarItems(items) {
    if (!Array.isArray(items) || !items.length) return 'Agrega al menos un producto al pedido.';
    for (const item of items) {
      if (!item || typeof item !== 'object') return 'El pedido contiene un producto inválido.';
      const p = producto(item.pid);
      if (!p || !p.activo) return 'Hay un producto que ya no existe o está inactivo en el menú.';
      if (!p.piezas) continue;
      const sabores = Array.isArray(item.sabores) ? item.sabores : [];
      const maxSabores = maxSaboresCombo(p);
      if (sabores.length < 1 || sabores.length > maxSabores) return `${p.nombre}: selecciona entre uno y ${maxSabores} sabores.`;
      if (sabores.some((saborItem) => !sabor(saborItem.fid)?.activo)) return `${p.nombre}: hay un sabor no disponible.`;
      if (new Set(sabores.map((saborItem) => saborItem.fid)).size !== sabores.length) return `${p.nombre}: cada sabor debe ser distinto.`;
      const reparto = distribuirPiezas(p.piezas, sabores.length);
      if (sabores.some((saborItem, indice) => saborItem.piezas !== reparto[indice])) {
        return `${p.nombre}: reparte las ${p.piezas} piezas equitativamente entre los sabores seleccionados.`;
      }
      if (sabores.reduce((total, saborItem) => total + saborItem.piezas, 0) !== p.piezas) return `${p.nombre}: la selección debe cubrir exactamente ${p.piezas} alitas.`;
      if (p.acompanamientoRequerido && !['Papas', 'Yuquitas'].includes(item.acompanamiento)) return `${p.nombre}: selecciona Papas o Yuquitas como acompañamiento.`;
      if (p.acompanamientoRequerido && item.acompanamientoCantidad !== p.acompanamientoCantidad) return `${p.nombre}: la cantidad de acompañamientos no coincide con el combo.`;
    }
    return '';
  }

  function normalizarItems(items) {
    return items.map((item) => {
      const p = producto(item.pid);
      const sabores = (Array.isArray(item.sabores) ? item.sabores : []).map((seleccion) => {
        const actual = sabor(seleccion.fid);
        return { fid: actual.id, nombre: actual.nombre, piezas: seleccion.piezas, picante: actual.picante };
      });
      return {
        ...item,
        sabores,
        ...(p.acompanamientoRequerido
          ? { acompanamiento: item.acompanamiento, acompanamientoCantidad: p.acompanamientoCantidad }
          : {}),
      };
    });
  }

  function estadoMesas() {
    const prioridad = ['listo', 'preparacion', 'pendiente', 'entregado'];
    const res = {};
    db.pedidos.filter((p) => ACTIVOS.includes(p.estado)).forEach((p) => {
      const actual = res[p.mesa];
      if (!actual || prioridad.indexOf(p.estado) < prioridad.indexOf(actual)) res[p.mesa] = p.estado;
    });
    return res;
  }

  /* ---------- Totales (impuesto y propina configurables) ---------- */
  function totales(items, conPropina) {
    const { impuesto: tasa, impuestoIncluido, propina: pct } = db.config;
    const bruto = items.reduce((s, i) => s + i.precio * i.cant, 0);
    let base = bruto, imp;
    if (impuestoIncluido) { base = Math.round(bruto / (1 + tasa / 100)); imp = bruto - base; }
    else imp = Math.round(bruto * tasa / 100);
    const propina = conPropina ? Math.round(bruto * pct / 100) : 0;
    const total = (impuestoIncluido ? bruto : bruto + imp) + propina;
    return { subtotal: bruto, base, impuesto: imp, propina, total, tasa, incluido: impuestoIncluido };
  }

  /* ---------- Inventario por receta (escandallo) ---------- */
  function consumoDe(items) {
    const m = {};
    const add = (id, q) => { if (id && q) m[id] = (m[id] || 0) + q; };
    for (const it of items) {
      const p = producto(it.pid);
      if (p) p.receta.forEach((r) => add(r.ing, r.cant * it.cant));
      if (p?.acompanamientoRequerido && it.acompanamiento) {
        const recetaAcompanamiento = p.recetasAcompanamiento?.[it.acompanamiento];
        if (recetaAcompanamiento) {
          add(recetaAcompanamiento.ing, recetaAcompanamiento.cant * (p.acompanamientoCantidad || 1) * it.cant);
        }
      }
      (it.sabores || []).forEach((s) => {
        const f = sabor(s.fid);
        if (f && f.ing) add(f.ing, f.porPieza * s.piezas * it.cant);
      });
    }

    return m;
  }
  function faltantes(nuevo, viejo = {}) {
    const out = [];
    for (const [id, q] of Object.entries(nuevo)) {
      const i = ingrediente(id);
      if (!i) continue;
      const disp = i.stock + (viejo[id] || 0);
      if (disp < q - 1e-9) out.push({ nombre: i.nombre, unidad: i.unidad, disponible: disp, falta: q - disp });
    }
    return out;
  }
  function mover(mapa, signo) {
    for (const [id, q] of Object.entries(mapa)) {
      const i = ingrediente(id);
      if (i) i.stock = Math.round((i.stock + signo * q) * 100) / 100;
    }
  }

  /* ---------- Pedidos ---------- */
  function crearPedido(d) {
    const errorValidacion = validarItems(d.items);
    if (errorValidacion) return { ok: false, error: errorValidacion };
    const items = normalizarItems(d.items);
    const consumo = consumoDe(items);
    const f = faltantes(consumo);
    if (f.length) return { ok: false, faltantes: f };
    mover(consumo, -1);
    const t = ahora();
    const p = {
      id: uid(), numero: db.contadores.pedido++, mesa: d.mesa, cliente: d.cliente || '', telefono: d.telefono || '',
      direccion: d.direccion || '', nota: d.nota || '', items, consumo, estado: 'pendiente',
      creadoPor: d.creadoPor || null, tipo: d.tipo || 'mesa',
      creado: t, actualizado: t, historial: [{ estado: 'pendiente', fecha: t }],
    };
    db.pedidos.push(p);
    guardar();
    return { ok: true, pedido: p };
  }

  function actualizarPedido(id, d) {
    const p = pedido(id);
    if (!p || !ACTIVOS.includes(p.estado)) return { ok: false, error: 'Este pedido ya no se puede editar.' };
    const errorValidacion = validarItems(d.items);
    if (errorValidacion) return { ok: false, error: errorValidacion };
    const items = normalizarItems(d.items);
    const consumo = consumoDe(items);
    const f = faltantes(consumo, p.consumo);
    if (f.length) return { ok: false, faltantes: f };
    mover(p.consumo, 1);
    mover(consumo, -1);
    Object.assign(p, {
      mesa: d.mesa, cliente: d.cliente || '', telefono: d.telefono || '', direccion: d.direccion || '',
      nota: d.nota || '', items, consumo, actualizado: ahora(),
      modificadoPor: d.modificadoPor || p.modificadoPor || null,
    });
    // A modified order returns to its initial status before it advances again.
    if (p.estado === 'preparacion' || p.estado === 'listo') {
      p.estado = 'pendiente';
      p.historial.push({ estado: 'pendiente', fecha: p.actualizado });
    }
    guardar();
    return { ok: true, pedido: p };
  }

  function cambiarEstado(id, estado) {
    const p = pedido(id);
    if (!p || SIGUIENTE[p.estado] !== estado) return false;
    p.estado = estado;
    p.actualizado = ahora();
    p.historial.push({ estado, fecha: p.actualizado });
    guardar();
    return true;
  }

  function cancelarPedido(id, autorizacion) {
    const p = pedido(id);
    if (!p || !ACTIVOS.includes(p.estado) || !PosAuth.verifyAdminPin(autorizacion?.pin) || autorizacion?.role !== 'ADMIN' || !autorizacion?.name) return false;
    mover(p.consumo, 1); // devuelve el inventario
    p.estado = 'cancelado';
    p.actualizado = ahora();
    p.anulacion = { fecha: p.actualizado, autorizadoPor: autorizacion.name, ejecutadoPor: autorizacion.usuario || autorizacion.name };
    p.historial.push({ estado: 'cancelado', fecha: p.actualizado });
    guardar();
    return true;
  }

  /* ---------- Facturación y caja ---------- */
  function facturar(id, o) {
    const p = pedido(id);
    if (!p || p.estado !== 'entregado') return null;
    if (!o.nombreLegal || !o.nitEmisor || !o.direccionEmisor || !o.telefonoEmisor
      || !o.nit || !o.cliente || !o.facturadoPor?.nombre || !o.terminalId) return null;
    if ((p.tipo === 'domicilio' || p.mesa === 'Domicilio') && (!p.telefono || !p.direccion)) return null;
    const t = totales(p.items, o.conPropina);
    const numero = Math.max(db.contadores.factura, ...db.facturas.map((facturaExistente) => facturaExistente.numero + 1), 1);
    db.contadores.factura = numero + 1;
    const f = {
      id: uid(), numero, pedidoId: p.id, pedidoNumero: p.numero, mesa: p.mesa,
      tipo: p.tipo || 'mesa', pedidoCreado: p.creado, nota: p.nota || '',
      telefono: p.telefono || '', direccion: p.direccion || '', creadoPor: p.creadoPor || null,
      cliente: o.cliente, nit: o.nit, items: p.items.map((i) => ({ ...i })),
      nombreLegal: o.nombreLegal, nitEmisor: o.nitEmisor, direccionEmisor: o.direccionEmisor,
      telefonoEmisor: o.telefonoEmisor, terminalId: o.terminalId, facturadoPor: o.facturadoPor,
      ...t, conPropina: !!o.conPropina, metodo: o.metodo, recibido: o.metodo === 'efectivo' ? o.recibido : null,
      personas: o.personas || 1, fecha: ahora(), cierreId: null,
    };
    db.facturas.push(f);
    p.estado = 'facturado';
    p.facturaId = f.id;
    p.actualizado = f.fecha;
    p.historial.push({ estado: 'facturado', fecha: f.fecha });
    guardar();
    return f;
  }

  function resumenCaja() {
    const fs = db.facturas.filter((f) => !f.cierreId);
    const por = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    fs.forEach((f) => { por[f.metodo] += f.total; });
    return {
      facturas: fs.length, por,
      total: fs.reduce((s, f) => s + f.total, 0),
      propinas: fs.reduce((s, f) => s + f.propina, 0),
    };
  }

  function registrarCierre({ base, contado, nota }) {
    const r = resumenCaja();
    if (!r.facturas) return null;
    const esperado = base + r.por.efectivo;
    const c = { id: uid(), numero: db.cierres.length + 1, fecha: ahora(), base, ...r, esperado, contado, diferencia: contado - esperado, nota: nota || '' };
    db.facturas.filter((f) => !f.cierreId).forEach((f) => { f.cierreId = c.id; });
    db.cierres.push(c);
    guardar();
    return c;
  }

  /* ---------- Estadísticas ---------- */
  function estadisticas() {
    const hoy = db.facturas.filter((f) => esHoy(f.fecha));
    const conteo = {};
    hoy.forEach((f) => f.items.forEach((i) => { conteo[i.nombre] = (conteo[i.nombre] || 0) + i.cant; }));
    return {
      porFacturar: db.pedidos.filter((p) => p.estado === 'entregado').length,
      facturasHoy: hoy.length,
      ventasHoy: hoy.reduce((s, f) => s + f.total, 0),
      top: Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5),
      bajoStock: db.ingredientes.filter((i) => i.stock <= i.minimo),
    };
  }

  /* ---------- Catálogo (CRUD) ---------- */
  function upsert(col, datos) {
    if (datos.id) {
      const x = db[col].find((e) => e.id === datos.id);
      if (x) { Object.assign(x, datos); guardar(); return x; }
    }
    const nuevo = { ...datos, id: uid() };
    db[col].push(nuevo);
    guardar();
    return nuevo;
  }
  function quitar(col, id) { db[col] = db[col].filter((e) => e.id !== id); guardar(); }

  function eliminarIngrediente(id) {
    const usos = db.menu.filter((p) => p.receta.some((r) => r.ing === id)).length + db.sabores.filter((s) => s.ing === id).length;
    if (usos) return { ok: false, error: `Está en uso en ${plural(usos, 'receta', 'recetas')}. Quítalo de ahí primero.` };
    quitar('ingredientes', id);
    return { ok: true };
  }
  function ajustarStock(id, delta) {
    const i = ingrediente(id);
    if (!i) return;
    i.stock = Math.max(0, Math.round((i.stock + delta) * 100) / 100);
    guardar();
  }

  /* ---------- Respaldo ---------- */
  const exportar = () => JSON.stringify(db, null, 2);
  function importar(texto) {
    const d = JSON.parse(texto);
    const ok = d && d.config && ['menu', 'sabores', 'ingredientes', 'pedidos', 'facturas'].every((k) => Array.isArray(d[k])) && d.contadores;
    if (!ok) throw new Error('El archivo no parece un respaldo válido.');
    const inicial = datosIniciales();
    const ingredientes = [...d.ingredientes];
    for (const item of inicial.ingredientes) {
      if (!ingredientes.some((existente) => existente.id === item.id)) ingredientes.push(item);
    }
    let menu = d.menu;
    let sabores = d.sabores;
    if ((d.menuVersion || 0) < VERSION_MENU_OFICIAL) {
      menu = menu.filter((item) => !IDS_MENU_INICIAL_ANTERIOR.has(item.id));
      menu = [...menu, ...inicial.menu.filter((item) => !menu.some((existente) => existente.id === item.id))];
      sabores = sabores.filter((item) => !IDS_SABORES_INICIALES_ANTERIORES.has(item.id));
      sabores = [...sabores, ...inicial.sabores.filter((item) => !sabores.some((existente) => existente.id === item.id))];
    }
    db = {
      ...inicial, ...d,
      config: { ...inicial.config, ...d.config, nombreLegal: d.config.nombreLegal || '', telefono: d.config.telefono || inicial.config.telefono },
      ingredientes, menu, sabores, menuVersion: VERSION_MENU_OFICIAL,
      contadores: { ...inicial.contadores, ...d.contadores },
      cierres: d.cierres || [],
    };
    guardar();
  }
  function reiniciar() { db = datosIniciales(); guardar(); }
  function guardarConfig(c) { db.config = { ...db.config, ...c }; guardar(); }

  cargar();
  return {
    get db() { return db; }, get config() { return db.config; },
    cargar, guardar, cerrarSesion, pedido, producto, sabor, ingrediente, factura, estadoMesas, totales,
    maxSaboresCombo, distribuirPiezas, crearPedido, actualizarPedido, cambiarEstado, cancelarPedido, facturar, resumenCaja, registrarCierre,
    estadisticas, upsert, quitar, eliminarIngrediente, ajustarStock, exportar, importar, reiniciar, guardarConfig,
  };
})();
