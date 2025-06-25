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
    const resp = await fetch('https://script.google.com/macros/s/AKfycbzUAxBdqFhnhtaMI7sJv7pCMkxUG94pgL9n-X9prGRZIh_cY8l4wsFKlyyovL--4oy0MQ/exec', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
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
