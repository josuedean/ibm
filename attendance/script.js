const form = document.getElementById('loginForm');
const messageEl = document.getElementById('message');

let clientIp = '';

// Fetch client IP via public service
fetch('https://api.ipify.org?format=json')
  .then(r => r.json())
  .then(d => clientIp = d.ip)
  .catch(() => {});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageEl.textContent = 'Signing in...';

  const payload = {
    id: document.getElementById('studentId').value.trim(),
    password: document.getElementById('password').value,
    ip: clientIp,
  };

  try {
    const resp = await fetch('https://script.google.com/macros/s/AKfycbzjQFbv5ptBYYGxKoQmdesJyRDZMXibVnR9lLPa3X35rFsANrmll3YxKAbW1za4SwP3Fg/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload).toString()
    });
    const data = await resp.json();
    if (data.success) {
      messageEl.textContent = 'Attendance recorded';
      form.reset();
    } else {
      messageEl.textContent = data.error || 'Invalid ID or password';
    }
  } catch (err) {
    messageEl.textContent = 'Error connecting to server';
  }
});
