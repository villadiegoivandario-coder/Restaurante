'use strict';

const terminalBadge = document.querySelector('#tablet-id-badge');
const footerTerminalId = document.querySelector('#footer-device-id');
const liveClock = document.querySelector('#live-clock');
const awsStatusBadge = document.querySelector('#aws-status-badge');
const awsStatusLabel = awsStatusBadge?.querySelector('.connection-label');

// TODO: Conectar con AWS WebSocket/HealthCheck
const isOnline = false;

if (awsStatusBadge && awsStatusLabel) {
  const status = isOnline ? 'online' : 'offline';
  awsStatusBadge.dataset.state = status;
  awsStatusLabel.textContent = status.toUpperCase();
  awsStatusBadge.setAttribute('aria-label', `Estado del servidor: ${status}`);
}

if (terminalBadge && footerTerminalId && liveClock) {
  terminalBadge.textContent = `TERMINAL: ${PosTerminal.id}`;
  footerTerminalId.textContent = `ID Terminal: ${PosTerminal.id}`;

  const updateClock = () => {
    liveClock.textContent = new Date().toLocaleString('es-CO', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  updateClock();
  window.setInterval(updateClock, 1000);
}
