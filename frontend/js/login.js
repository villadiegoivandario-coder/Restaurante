'use strict';

const pinModal = document.querySelector('#pin-modal');
const pinEntry = document.querySelector('#pin-entry');
const pinDots = document.querySelector('#pin-dots');
const pinKeys = document.querySelector('#pin-keys');
const pinConfirm = document.querySelector('#pin-confirm');
const openPos = document.querySelector('#open-pos');
const accessError = document.querySelector('#access-error');
let pinValue = '';
let authenticatedSession = PosAuth.getSession();

function renderPin() {
  pinDots.textContent = `${'●'.repeat(pinValue.length)}${'○'.repeat(4 - pinValue.length)}`;
}

function clearPin() {
  pinValue = '';
  renderPin();
}

function showError(message) {
  accessError.textContent = message;
  accessError.hidden = false;
}

function authenticate() {
  const session = PosAuth.authenticatePin(pinValue);
  if (!session) {
    clearPin();
    pinModal.close();
    showError('PIN incorrecto. Verifica tu código e inténtalo nuevamente.');
    return false;
  }
  authenticatedSession = session;
  accessError.hidden = true;
  accessError.textContent = '';
  pinEntry.textContent = `${session.name} · ${session.roleLabel}`;
  pinModal.close();
  clearPin();
  return true;
}

if (pinModal && pinEntry && pinKeys && pinConfirm && openPos && accessError) {
  pinKeys.innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']
    .map((key) => `<button type="button" class="pin-key" data-pin-key="${key === '⌫' ? 'backspace' : key === '✓' ? 'submit' : key}" aria-label="${key === '⌫' ? 'Borrar último dígito' : key === '✓' ? 'Validar PIN' : key}">${key}</button>`)
    .join('');

  if (authenticatedSession) pinEntry.textContent = `${authenticatedSession.name} · ${authenticatedSession.roleLabel}`;

  pinEntry.addEventListener('click', () => {
    accessError.hidden = true;
    PosAuth.clearSession();
    authenticatedSession = null;
    pinEntry.textContent = '••••';
    clearPin();
    pinModal.showModal();
  });

  pinKeys.addEventListener('click', (event) => {
    const key = event.target.closest('[data-pin-key]')?.dataset.pinKey;
    if (!key) return;
    if (key === 'submit') {
      authenticate();
    } else if (key === 'backspace') {
      pinValue = pinValue.slice(0, -1);
      renderPin();
    } else if (/^\d$/.test(key) && pinValue.length < 4) {
      pinValue += key;
      renderPin();
      if (pinValue.length === 4) pinConfirm.focus();
    }
  });

  document.querySelector('#pin-clear').addEventListener('click', clearPin);
  document.querySelector('#pin-cancel').addEventListener('click', () => pinModal.close());
  pinConfirm.addEventListener('click', authenticate);

  openPos.addEventListener('click', () => {
    if (!authenticatedSession || PosAuth.getSession()?.userId !== authenticatedSession.userId) {
      accessError.hidden = true;
      showError('Ingresa tu PIN para continuar.');
      clearPin();
      pinModal.showModal();
      return;
    }
    window.location.assign('pos.html');
  });
}
