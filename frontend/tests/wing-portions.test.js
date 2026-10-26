import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const storeSource = await readFile(new URL('../js/store.js', import.meta.url), 'utf8');

function createStore() {
  let id = 0;
  const storage = new Map();
  const context = vm.createContext({
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    sessionStorage: { removeItem() {} },
    uid: () => `test-${++id}`,
  });
  vm.runInContext(storeSource, context);
  return vm.runInContext('Store', context);
}

const combos = [
  { id: 'combo_x6', pieces: 6, max: 2 },
  { id: 'combo_x8', pieces: 8, max: 2 },
  { id: 'combo_x12', pieces: 12, max: 3 },
  { id: 'combo_x24', pieces: 24, max: 3 },
  { id: 'combo_x36', pieces: 36, max: 4 },
];

function orderItem(store, combo, flavorIds, portionCounts, acompanamiento = null) {
  const product = store.producto(combo.id);
  const item = {
    pid: combo.id,
    cant: 1,
    sabores: flavorIds.map((fid, index) => ({ fid, piezas: portionCounts[index] })),
  };
  if (acompanamiento) {
    item.acompanamiento = acompanamiento;
    item.acompanamientoCantidad = product.acompanamientoCantidad;
  }
  return item;
}

test('assigns an equal integer portion to each selected flavor', () => {
  const store = createStore();
  const cases = [
    ['combo_x6', 1, [6]],
    ['combo_x6', 2, [3, 3]],
    ['combo_x8', 2, [4, 4]],
    ['combo_x12', 2, [6, 6]],
    ['combo_x12', 3, [4, 4, 4]],
    ['combo_x24', 3, [8, 8, 8]],
    ['combo_x36', 4, [9, 9, 9, 9]],
  ];

  for (const [id, count, expected] of cases) {
    const combo = combos.find((entry) => entry.id === id);
    assert.deepEqual(Array.from(store.distribuirPiezas(combo.pieces, count)), expected);
  }
});

test('exposes the official maximum flavor count per combo', () => {
  const store = createStore();
  for (const combo of combos) {
    assert.equal(store.maxSaboresCombo(store.producto(combo.id)), combo.max);
  }
});

test('accepts evenly divided orders for every official combo', () => {
  for (const combo of combos) {
    const store = createStore();
    const flavorIds = store.db.sabores.slice(0, combo.max).map((flavor) => flavor.id);
    const portions = store.distribuirPiezas(combo.pieces, flavorIds.length);
    const result = store.crearPedido({
      mesa: 'Mesa 1',
      items: [orderItem(store, combo, flavorIds, portions)],
    });

    assert.equal(result.ok, true, result.error);
    assert.equal(result.pedido.items[0].sabores.reduce((sum, flavor) => sum + flavor.piezas, 0), combo.pieces);
    assert.equal(result.pedido.items[0].acompanamiento, 'Papas');
    assert.equal(result.pedido.items[0].acompanamientoCantidad, combo.id === 'combo_x24' || combo.id === 'combo_x36' ? 2 : 1);
  }
});

test('accepts a selected optional side and deducts its stock', () => {
  const store = createStore();
  const combo = combos[3];
  const flavorIds = store.db.sabores.slice(0, 2).map((flavor) => flavor.id);
  const portions = store.distribuirPiezas(combo.pieces, flavorIds.length);
  const potatoStock = store.ingrediente('i_papa').stock;
  const result = store.crearPedido({
    mesa: 'Mesa 1',
    items: [orderItem(store, combo, flavorIds, portions, 'Papas')],
  });

  assert.equal(result.ok, true, result.error);
  assert.equal(store.ingrediente('i_papa').stock, potatoStock - 400);
});

test('rejects over-limit flavors, duplicate flavors, and unequal portions', () => {
  const store = createStore();
  const flavors = store.db.sabores.map((flavor) => flavor.id);
  const invalidItems = [
    orderItem(store, combos[2], flavors.slice(0, 4), [3, 3, 3, 3]),
    orderItem(store, combos[4], flavors.slice(0, 2), [10, 26]),
    orderItem(store, combos[3], [flavors[0], flavors[0]], [12, 12]),
    orderItem(store, combos[2], flavors.slice(0, 3), [5, 4, 3]),
  ];

  for (const item of invalidItems) {
    const result = store.crearPedido({ mesa: 'Mesa 1', items: [item] });
    assert.equal(result.ok, false);
    assert.ok(result.error);
  }
});
