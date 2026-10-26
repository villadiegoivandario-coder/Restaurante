import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const authSource = await readFile(new URL('../js/auth.js', import.meta.url), 'utf8');

function createAuth() {
  const storage = new Map();
  const context = vm.createContext({
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    console,
  });
  context.window = context;
  vm.runInContext(authSource, context);
  return { auth: context.PosAuth, storage };
}

test('authenticates profile IDs and limits inventory edits to admins', () => {
  const { auth } = createAuth();

  const waiter = auth.authenticatePin('1001');
  assert.equal(waiter.profileId, 'M-01');
  assert.equal(auth.can('stock:read'), true);
  assert.equal(auth.can('menu:write'), false);

  auth.authenticatePin('2001');
  assert.equal(auth.getSession().profileId, 'C-01');
  assert.equal(auth.can('menu:write'), false);

  auth.authenticatePin('9999');
  assert.equal(auth.getSession().profileId, 'A-01');
  assert.equal(auth.can('menu:write'), true);
});

test('migrates stored sessions without a profile ID', () => {
  const { auth, storage } = createAuth();
  storage.set('llamas-wings.session', JSON.stringify({ userId: 'waiter-2', role: 'WAITER', name: 'Mesero 2' }));
  const session = auth.getSession();

  assert.equal(session.profileId, 'M-02');
});