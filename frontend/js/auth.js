'use strict';

(() => {
  const SESSION_KEY = 'llamas-wings.session';
  const USERS = Object.freeze({
    '1001': { id: 'waiter-1', name: 'Mesero 1', role: 'WAITER' },
    '1002': { id: 'waiter-2', name: 'Mesero 2', role: 'WAITER' },
    '2001': { id: 'cashier-1', name: 'Cajero', role: 'CASHIER' },
    '9999': { id: 'admin-1', name: 'Administrador', role: 'ADMIN' },
  });
  const ROLE_LABELS = Object.freeze({
    WAITER: 'Mesero',
    CASHIER: 'Cajero',
    ADMIN: 'Administrador',
  });
  const ROLE_PERMISSIONS = Object.freeze({
    WAITER: ['home', 'orders', 'billing', 'stock:read'],
    CASHIER: ['home', 'orders', 'billing', 'stock:read', 'delivery', 'cash:close'],
    ADMIN: ['menu:write', 'erp:reports', 'permissions:audit', 'settings:write'],
  });
  const PATH_PERMISSIONS = Object.freeze({
    WAITER: { '/': 'home', '/pedidos': 'orders', '/nuevo': 'orders', '/facturacion': 'billing', '/menu': 'stock:read' },
    CASHIER: { '/': 'home', '/pedidos': 'orders', '/nuevo': 'orders', '/facturacion': 'billing', '/menu': 'stock:read' },
    ADMIN: { '/': 'erp:reports', '/menu': 'menu:write', '/reportes': 'erp:reports', '/auditoria': 'permissions:audit', '/ajustes': 'settings:write' },
  });
  const AUDIT_KEY = 'llamas-wings.permission-audit';

  function auditPermission(event) {
    const session = readSession();
    const entry = {
      timestamp: new Date().toISOString(),
      userId: session?.userId || null,
      name: session?.name || 'Sin sesión',
      role: session?.role || 'ANONYMOUS',
      ...event,
    };
    let entries = [];
    try {
      const stored = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
      if (Array.isArray(stored)) entries = stored;
    } catch (error) {
      console.error('No se pudo leer la auditoría de permisos.', error);
    }
    entries.push(entry);
    try {
      localStorage.setItem(AUDIT_KEY, JSON.stringify(entries.slice(-500)));
    } catch (error) {
      console.error('No se pudo guardar la auditoría de permisos.', error);
    }
  }

  function readSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
      const session = JSON.parse(raw);
      if (!session || !ROLE_PERMISSIONS[session.role] || !session.userId || !session.name) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function authenticatePin(pin) {
    if (!/^\d{4}$/.test(String(pin))) {
      clearSession();
      auditPermission({ type: 'authentication', resource: 'pos', allowed: false });
      return null;
    }
    const user = USERS[String(pin)];
    if (!user) {
      clearSession();
      auditPermission({ type: 'authentication', resource: 'pos', allowed: false });
      return null;
    }

    const session = {
      userId: user.id,
      name: user.name,
      role: user.role,
      roleLabel: ROLE_LABELS[user.role],
      authenticatedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    auditPermission({ type: 'authentication', resource: 'pos', allowed: true });
    return session;
  }

  function verifyAdminPin(pin) {
    return /^\d{4}$/.test(String(pin)) && String(pin) === '9999';
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function can(permission) {
    const session = readSession();
    if (!session) return false;
    const permissions = ROLE_PERMISSIONS[session.role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }

  function canAccessPath(path) {
    const session = readSession();
    if (!session) return false;
    const permission = PATH_PERMISSIONS[session.role]?.[path];
    const allowed = Boolean(permission && ROLE_PERMISSIONS[session.role].includes(permission));
    auditPermission({ type: 'route-access', resource: path, allowed });
    return allowed;
  }

  function getPermissionAudit() {
    try {
      const entries = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
      return Array.isArray(entries) ? entries.slice().reverse() : [];
    } catch (error) {
      console.error('No se pudo cargar la auditoría de permisos.', error);
      return [];
    }
  }

  function logPermissionDecision(resource, allowed) {
    auditPermission({ type: 'action-access', resource, allowed });
  }

  function roleLabel(role) {
    return ROLE_LABELS[role] || null;
  }

  window.PosAuth = Object.freeze({
    getSession: readSession,
    authenticatePin,
    verifyAdminPin,
    clearSession,
    can,
    canAccessPath,
    getPermissionAudit,
    logPermissionDecision,
    roleLabel,
  });
})();
