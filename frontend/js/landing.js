'use strict';

const terminalBadge = document.querySelector('#tablet-id-badge');
const footerTerminalId = document.querySelector('#footer-device-id');
const liveClock = document.querySelector('#live-clock');

if (terminalBadge && footerTerminalId && liveClock) {
  terminalBadge.textContent = `Terminal: ${PosTerminal.id}`;
  footerTerminalId.textContent = `ID: ${PosTerminal.id}`;

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
