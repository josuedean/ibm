// main.js

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxCdYBIZtQ-YQgfmQy-8ezEbbq2q5fOfU6_I0Q4fx7_1S26aTjmCFcuCAYVNvckaZlhWQ/exec';

let CORRECT_ANSWERS = null;

async function loadAnswers() {
  const res = await fetch('./answers.json');
  const data = await res.json();
  if (data.encoding !== 'base64') {
    throw new Error('Unsupported encoding in answers.json');
  }
  const decoded = atob(data.payload); // Base64 decode
  CORRECT_ANSWERS = JSON.parse(decoded);
}

function arraysEqualIgnoreOrder(a, b) {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort();
  const bSorted = [...b].sort();
  return aSorted.every((v, i) => v === bSorted[i]);
}

function collectTask1Selections() {
  const result = {};
  const transactions = document.querySelectorAll('.transaction');

  transactions.forEach(txnEl => {
    const txnId = txnEl.getAttribute('data-txn');
    const checked = Array.from(txnEl.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
    result[txnId] = checked;
  });

  return result;
}

function validateTask1(studentAnswers) {
  const correct = CORRECT_ANSWERS.task1.accountSelections;
  for (const txnId in correct) {
    const expected = correct[txnId];
    const actual = studentAnswers[txnId] || [];
    if (!arraysEqualIgnoreOrder(actual, expected)) {
      return false;
    }
  }
  return true;
}

async function sendResultToAppsScript({ userId, isCorrect, answers }) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('REPLACE_WITH')) {
    console.warn('Apps Script URL not configured; skipping POST.');
    return;
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // for simplicity; you can switch to CORS JSON if you configure it
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'task1',
        user_id: userId,
        is_correct: isCorrect,
        answers
      })
    });

    // With mode:no-cors, you can't reliably read the response.
    // This is fine for logging only.
  } catch (err) {
    console.error('Error sending to Apps Script:', err);
  }
}

function showStatus(message, ok) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.classList.remove('hidden', 'ok', 'error');
  statusEl.classList.add(ok ? 'ok' : 'error');
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadAnswers();
  } catch (err) {
    console.error(err);
    showStatus('Error loading answer key. Check console.', false);
    return;
  }

  const form = document.getElementById('task1Form');
  const submitBtn = document.getElementById('submitTask1');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('studentId').value.trim();

    if (!userId) {
      showStatus('Please enter your Student ID first.', false);
      return;
    }

    const studentAnswers = collectTask1Selections();
    const isCorrect = validateTask1(studentAnswers);

    if (isCorrect) {
      showStatus('✅ Task 1 answers are correct. (Result sent to server.)', true);
    } else {
      showStatus('❌ Some answers are incorrect. Please review and try again.', false);
    }

    submitBtn.disabled = true; // prevent spamming; remove if you want multiple attempts

    await sendResultToAppsScript({
      userId,
      isCorrect,
      answers: studentAnswers
    });

    // Re-enable if you want to allow re-submission for testing
    submitBtn.disabled = false;
  });
});
