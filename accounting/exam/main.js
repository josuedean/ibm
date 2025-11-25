// main.js

// TODO: replace with your deployed Apps Script Web App URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnk83EOIxGLG8o8Fgigv94QyezgtYpUcH23vW0QCjAGAE_tY27d49yIBnAV1A8-r3e5Q/exec';

// 90 minutes in ms
const EXAM_DURATION_MS = 90 * 60 * 1000;

let CORRECT_ANSWERS = null;

// exam session state
let examStarted = false;
let examStartTime = null;
let examTimerId = null;
let task1Attempts = 0;
let task1Submitted = false;

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

function formatTask1AnswerString(studentAnswers) {
  // Flatten to a readable description; here we just join each txn's accounts
  // You can change this format later if you prefer.
  // Example output: "1:[cash,capital];2:[cash,revenue];..."
  const parts = [];
  Object.keys(studentAnswers).sort((a, b) => Number(a) - Number(b)).forEach(txnId => {
    const accounts = [...studentAnswers[txnId]].sort().join(',');
    parts.push(`${txnId}:[${accounts}]`);
  });
  return parts.join(';');
}

/* ---------------- Timer ---------------- */

function startTimer(startTimeMs) {
  examStartTime = startTimeMs;
  updateTimerDisplay(); // initial
  if (examTimerId) clearInterval(examTimerId);

  examTimerId = setInterval(() => {
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('timerDisplay');
  if (!timerEl || !examStartTime) return;

  const now = Date.now();
  const elapsed = now - examStartTime;
  const remaining = EXAM_DURATION_MS - elapsed;

  if (remaining <= 0) {
    clearInterval(examTimerId);
    timerEl.textContent = 'Time remaining: 00:00';
    handleTimeUp();
    return;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  timerEl.textContent = `Time remaining: ${minutes}:${seconds}`;
}

function handleTimeUp() {
  showStatus('⏰ Time is up. Your last Task 1 answers will be submitted (if not already).', false);
  // Disable form inputs
  const form = document.getElementById('task1Form');
  if (form) {
    Array.from(form.querySelectorAll('input, button, textarea')).forEach(el => {
      el.disabled = true;
    });
  }

  // If Task 1 not yet submitted, force-submit whatever is selected now
  if (!task1Submitted) {
    forceSubmitTask1OnTimeout();
  }
}

/* ---------- Start exam + send to Apps Script ---------- */

async function startExam() {
  const userId = document.getElementById('studentId').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!userId || !password) {
    showStatus('Please enter both Student ID and Password before starting.', false);
    return;
  }

  if (examStarted) {
    showStatus('Exam already started.', false);
    return;
  }

  // Mark locally
  examStarted = true;
  const now = Date.now();
  startTimer(now);

  // Persist in localStorage so refresh doesn’t kill everything
  localStorage.setItem('exam_user_id', userId);
  localStorage.setItem('exam_password', password);
  localStorage.setItem('exam_start_time', String(now));

  // Enable Task 1 form (if you initially had it disabled in HTML)
  const form = document.getElementById('task1Form');
  if (form) {
    Array.from(form.querySelectorAll('input, button, textarea')).forEach(el => {
      el.disabled = false;
    });
  }

  showStatus('Exam started. You have 90 minutes.', true);

  // Fire-and-forget call to Apps Script to log start
  // We use no-cors so we don’t worry about CORS issues; we don’t read the response.
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'start',
        user_id: userId,
        password: password
      })
    });
  } catch (err) {
    console.error('Error sending start to Apps Script:', err);
  }
}

async function submitTask1ToServer(task1_a_string, task1_b_text) {
  const userId = document.getElementById('studentId').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!userId || !password) {
    showStatus('Missing Student ID or Password; cannot submit.', false);
    return;
  }

  const payload = {
    mode: 'submit',
    user_id: userId,
    password: password,
    answers: {
      task1_a: task1_a_string,
      task1_b: task1_b_text
    }
  };

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Error sending submit to Apps Script:', err);
  }
}

/* ------------- Task 1 logic (3 attempts) ------------- */

function showStatus(message, ok) {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.remove('hidden', 'ok', 'error');
  statusEl.classList.add(ok ? 'ok' : 'error');
}

async function handleTask1Submit(e) {
  e.preventDefault();

  if (!examStarted) {
    showStatus('You must start the exam before submitting Task 1.', false);
    return;
  }

  if (task1Submitted) {
    showStatus('Task 1 has already been submitted.', false);
    return;
  }

  const explanationEl = document.getElementById('task1_b');
  const explanation = explanationEl ? explanationEl.value.trim() : '';

  if (!explanation) {
    showStatus('Please enter your explanation (answer b) before submitting.', false);
    return;
  }

  const studentAnswers = collectTask1Selections();
  const isCorrect = validateTask1(studentAnswers);

  // Only count attempt after explanation is present
  task1Attempts += 1;

  if (isCorrect) {
    const answerString = formatTask1AnswerString(studentAnswers);
    await submitTask1ToServer(answerString, explanation);
    task1Submitted = true;

    showStatus('✅ Task 1 answers are correct and have been submitted.', true);
    disableTask1Form();
    return;
  }

  // Incorrect:
  if (task1Attempts < 3) {
    const remaining = 3 - task1Attempts;
    showStatus(`❌ Some answers are incorrect. Try again. Attempts left: ${remaining}`, false);
    return;
  }

  // 3rd incorrect attempt → submit last answer with (FALSE)
  const answerStringBase = formatTask1AnswerString(studentAnswers);
  const answerString = answerStringBase + '(FALSE)';

  await submitTask1ToServer(answerString, explanation);
  task1Submitted = true;

  showStatus('❌ Task 1 submitted after 3 attempts. Your last answers were recorded with (FALSE).', false);
  disableTask1Form();
}

function disableTask1Form() {
  const form = document.getElementById('task1Form');
  if (!form) return;
  Array.from(form.querySelectorAll('input, button, textarea')).forEach(el => {
    el.disabled = true;
  });
}

// Called when time runs out and Task 1 not yet submitted
async function forceSubmitTask1OnTimeout() {
  const explanationEl = document.getElementById('task1_b');
  const explanation = explanationEl ? explanationEl.value.trim() : '[TIME UP – NO EXPLANATION]';

  const studentAnswers = collectTask1Selections();
  const answerStringBase = formatTask1AnswerString(studentAnswers);
  const answerString = answerStringBase + '(FALSE)';

  await submitTask1ToServer(answerString, explanation);
  task1Submitted = true;
}

/* ----------------- Init on load ----------------- */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadAnswers();
  } catch (err) {
    console.error(err);
    showStatus('Error loading answer key. Check console.', false);
    return;
  }

  // Hook up Start Exam button
  const startBtn = document.getElementById('startExamBtn');
  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      startExam();
    });
  }

  // Hook up Task 1 form submit
  const form = document.getElementById('task1Form');
  if (form) {
    form.addEventListener('submit', handleTask1Submit);

    // Optional: initially disable Task 1 inputs until exam starts
    Array.from(form.querySelectorAll('input, button, textarea')).forEach(el => {
      if (el.id === 'submitTask1') {
        el.disabled = true; // you can leave the button disabled initially
      } else {
        el.disabled = true;
      }
    });
  }

  // Resume session if present (optional basic resume)
  const storedUser = localStorage.getItem('exam_user_id');
  const storedPw = localStorage.getItem('exam_password');
  const storedStart = localStorage.getItem('exam_start_time');

  if (storedUser && storedPw && storedStart) {
    const startMs = Number(storedStart);
    const now = Date.now();
    if (now - startMs < EXAM_DURATION_MS) {
      examStarted = true;
      startTimer(startMs);
      if (document.getElementById('studentId')) {
        document.getElementById('studentId').value = storedUser;
      }
      if (document.getElementById('password')) {
        document.getElementById('password').value = storedPw;
      }
      // Re-enable task1 form
      if (form) {
        Array.from(form.querySelectorAll('input, button, textarea')).forEach(el => {
          el.disabled = false;
        });
      }
      showStatus('Resumed existing exam session.', true);
    } else {
      // Past the 90 min; clear local storage
      localStorage.removeItem('exam_user_id');
      localStorage.removeItem('exam_password');
      localStorage.removeItem('exam_start_time');
      showStatus('Previous exam session expired.', false);
    }
  }
});
