'use strict';

(() => {
  const key = 'llamas_device_id';
  const current = localStorage.getItem(key);
  const previous = localStorage.getItem('llamas_tablet_id');
  const legacyNumber = previous?.match(/^TABLET-POS-(\d{3})$/)?.[1];
  const prefix = /Mobi|Android/i.test(navigator.userAgent) ? 'MOBIL' : 'POS';
  const id = current && /^(MOBIL|POS)-\d{3}$/.test(current)
    ? current
    : `${prefix}-${legacyNumber || String(Math.floor(100 + Math.random() * 900))}`;

  if (id !== current) localStorage.setItem(key, id);
  window.PosTerminal = Object.freeze({ id });
})();
