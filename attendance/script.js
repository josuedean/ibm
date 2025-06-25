const form = document.getElementById('loginForm');
const messageEl = document.getElementById('message');

let clientIp = '';

// Fetch client IP via public service
fetch('https://api.ipify.org?format=json')
  .then(r => r.json())
  .then(d => clientIp = d.ip)
  .catch(() => {});

const GAS_ENDPOINT = 'YOUR_GOOGLE_APPS_SCRIPT_DEPLOYMENT_URL';

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageEl.textContent = 'Signing in...';

  const payload = new URLSearchParams({
    id: document.getElementById('studentId').value.trim(),
    password: document.getElementById('password').value,
    ip: clientIp,
  });

  try {
    const resp = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      body: payload,
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
