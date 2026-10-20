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
const ACCION_SIGUIENTE = { pendiente: 'Empezar a preparar', preparacion: 'Marcar listo', listo: 'Marcar entregado' };
const ESTACIONES = { freidora: 'Freidoras', armado: 'Armado', barra: 'Bebidas' };
const NIVELES_PICANTE = ['Sin picante', 'Suave', 'Medio', 'Picante', 'Muy picante', 'Fuego'];
const METODOS = ['efectivo', 'tarjeta', 'transferencia'];

const Store = (() => {
  const KEY = 'alitas-pos.v2';
  let db;
  const ahora = () => new Date().toISOString();

  /* ---------- Datos iniciales ---------- */
  function datosIniciales() {
    const ing = (id, nombre, unidad, stock, minimo) => ({ id, nombre, unidad, stock, minimo });
    const sab = (id, nombre, picante, ingId) => ({ id, nombre, picante, activo: true, ing: ingId, porPieza: 8 });
    const prod = (o) => ({ activo: true, piezas: 0, maxSabores: 0, receta: [], estacion: 'armado', ...o });
    return {
      config: { nombre: "Llama's Wings", nit: '', direccion: '', telefono: '', mesas: 8, impuesto: 8, impuestoIncluido: false, propina: 10 },
      ingredientes: [
        ing('i_alita', 'Alita cruda', 'g', 30000, 5000),
        ing('i_papa', 'Papa francesa', 'g', 15000, 3000),
        ing('i_bbq', 'Salsa BBQ', 'ml', 4000, 800),
        ing('i_miel', 'Salsa miel mostaza', 'ml', 4000, 800),
        ing('i_bufalo', 'Salsa búfalo', 'ml', 4000, 800),
        ing('i_maracuya', 'Salsa maracuyá picante', 'ml', 3000, 800),
        ing('i_limon', 'Salsa limón pimienta', 'ml', 3000, 800),
        ing('i_habanero', 'Salsa habanero', 'ml', 2000, 500),
        ing('i_blue', 'Aderezo blue cheese', 'porción', 120, 20),
        ing('i_ranch', 'Aderezo ranch', 'porción', 120, 20),
        ing('i_gaseosa', 'Gaseosa', 'unidad', 96, 12),
        ing('i_cerveza', 'Cerveza', 'unidad', 96, 12),
        ing('i_agua', 'Agua', 'unidad', 60, 12),
      ],
      sabores: [
        sab('s_bbq', 'BBQ', 1, 'i_bbq'),
        sab('s_miel', 'Miel mostaza', 0, 'i_miel'),
        sab('s_bufalo', 'Búfalo', 3, 'i_bufalo'),
        sab('s_maracuya', 'Maracuyá picante', 3, 'i_maracuya'),
        sab('s_limon', 'Limón pimienta', 1, 'i_limon'),
        sab('s_habanero', 'Habanero fuego', 5, 'i_habanero'),
      ],
      menu: [
        prod({ id: 'p_a6', nombre: 'Alitas x6', categoria: 'Alitas', precio: 22000, piezas: 6, maxSabores: 2, estacion: 'freidora', receta: [{ ing: 'i_alita', cant: 300 }] }),
        prod({ id: 'p_a10', nombre: 'Alitas x10', categoria: 'Alitas', precio: 34000, piezas: 10, maxSabores: 2, estacion: 'freidora', receta: [{ ing: 'i_alita', cant: 500 }] }),
        prod({ id: 'p_a16', nombre: 'Alitas x16', categoria: 'Alitas', precio: 50000, piezas: 16, maxSabores: 3, estacion: 'freidora', receta: [{ ing: 'i_alita', cant: 800 }] }),
        prod({ id: 'p_papas', nombre: 'Papas francesas', categoria: 'Acompañantes', precio: 10000, estacion: 'freidora', receta: [{ ing: 'i_papa', cant: 200 }] }),
        prod({ id: 'p_blue', nombre: 'Dip blue cheese', categoria: 'Acompañantes', precio: 2500, receta: [{ ing: 'i_blue', cant: 1 }] }),
        prod({ id: 'p_ranch', nombre: 'Dip ranch', categoria: 'Acompañantes', precio: 2500, receta: [{ ing: 'i_ranch', cant: 1 }] }),
        prod({ id: 'p_gaseosa', nombre: 'Gaseosa', categoria: 'Bebidas', precio: 5000, estacion: 'barra', receta: [{ ing: 'i_gaseosa', cant: 1 }] }),
        prod({ id: 'p_limonada', nombre: 'Limonada de coco', categoria: 'Bebidas', precio: 8000, estacion: 'barra' }),
        prod({ id: 'p_cerveza', nombre: 'Cerveza', categoria: 'Bebidas', precio: 7000, estacion: 'barra', receta: [{ ing: 'i_cerveza', cant: 1 }] }),
        prod({ id: 'p_agua', nombre: 'Agua', categoria: 'Bebidas', precio: 4000, estacion: 'barra', receta: [{ ing: 'i_agua', cant: 1 }] }),
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
        db = { ...d, ...p, config, contadores: { ...d.contadores, ...p.contadores } };
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
    const consumo = consumoDe(d.items);
    const f = faltantes(consumo);
    if (f.length) return { ok: false, faltantes: f };
    mover(consumo, -1);
    const t = ahora();
    const p = {
      id: uid(), numero: db.contadores.pedido++, mesa: d.mesa, cliente: d.cliente || '', telefono: d.telefono || '',
      direccion: d.direccion || '', nota: d.nota || '', items: d.items, consumo, estado: 'pendiente',
      creado: t, actualizado: t, historial: [{ estado: 'pendiente', fecha: t }],
    };
    db.pedidos.push(p);
    guardar();
    return { ok: true, pedido: p };
  }

  function actualizarPedido(id, d) {
    const p = pedido(id);
    if (!p || !ACTIVOS.includes(p.estado)) return { ok: false, error: 'Este pedido ya no se puede editar.' };
    const consumo = consumoDe(d.items);
    const f = faltantes(consumo, p.consumo);
    if (f.length) return { ok: false, faltantes: f };
    mover(p.consumo, 1);
    mover(consumo, -1);
    Object.assign(p, { mesa: d.mesa, cliente: d.cliente || '', telefono: d.telefono || '', direccion: d.direccion || '', nota: d.nota || '', items: d.items, consumo, actualizado: ahora() });
    // Si ya estaba en cocina, vuelve a "pendiente" para que cocina vea los cambios.
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

  function cancelarPedido(id) {
    const p = pedido(id);
    if (!p || !ACTIVOS.includes(p.estado)) return false;
    mover(p.consumo, 1); // devuelve el inventario
    p.estado = 'cancelado';
    p.actualizado = ahora();
    p.historial.push({ estado: 'cancelado', fecha: p.actualizado });
    guardar();
    return true;
  }

  /* ---------- Facturación y caja ---------- */
  function facturar(id, o) {
    const p = pedido(id);
    if (!p || p.estado !== 'entregado') return null;
    const t = totales(p.items, o.conPropina);
    const f = {
      id: uid(), numero: db.contadores.factura++, pedidoId: p.id, pedidoNumero: p.numero, mesa: p.mesa,
      cliente: o.cliente || p.cliente || '', nit: o.nit || '', items: p.items.map((i) => ({ ...i })),
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
      enCocina: db.pedidos.filter((p) => p.estado === 'pendiente' || p.estado === 'preparacion').length,
      listos: db.pedidos.filter((p) => p.estado === 'listo').length,
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
    db = { ...datosIniciales(), ...d, cierres: d.cierres || [] };
    guardar();
  }
  function reiniciar() { db = datosIniciales(); guardar(); }
  function guardarConfig(c) { db.config = { ...db.config, ...c }; guardar(); }

  cargar();
  return {
    get db() { return db; }, get config() { return db.config; },
    cargar, guardar, cerrarSesion, pedido, producto, sabor, ingrediente, factura, estadoMesas, totales,
    crearPedido, actualizarPedido, cambiarEstado, cancelarPedido, facturar, resumenCaja, registrarCierre,
    estadisticas, upsert, quitar, eliminarIngrediente, ajustarStock, exportar, importar, reiniciar, guardarConfig,
  };
})();
