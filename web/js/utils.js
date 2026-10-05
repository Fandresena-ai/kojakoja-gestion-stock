function formatAr(value) {
  const num = parseFloat(value.replace(/\D/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('fr-FR') + ' Ar';
}

function setupPriceFormat(inputId) {
  const input = document.getElementById(inputId);
  input.addEventListener('input', () => {
    const raw = input.value.replace(/\D/g, '');
    if (!raw) return input.value = '';
    input.value = parseInt(raw).toLocaleString('fr-FR') + ' Ar';
  });

  input.addEventListener('focus', () => {
    input.value = input.value.replace(/[^\d]/g, '');
  });

  input.addEventListener('blur', () => {
    input.value = formatAr(input.value);
  });
}

function showNotification(message, duration = 3000) {
  const notif = document.getElementById('notification');
  notif.textContent = message;
  notif.classList.add('show');

  setTimeout(() => {
    notif.classList.remove('show');
  }, duration);
}

// document.getElementById('liste_notes').addEventListener('show', () => {
//   chargerNotes();
// });

