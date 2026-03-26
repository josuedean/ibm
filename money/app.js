(function () {
  const homeSection = document.getElementById("homeSection");
  const formSection = document.getElementById("formSection");
  const recordingOverlay = document.getElementById("recordingOverlay");

  const startReceivedBtn = document.getElementById("startReceivedBtn");
  const startSpentBtn = document.getElementById("startSpentBtn");
  const formTitle = document.getElementById("formTitle");
  const cancelFormBtn = document.getElementById("cancelFormBtn");

  const totalCashEl = document.getElementById("totalCash");
  const monthReceivedEl = document.getElementById("monthReceived");
  const monthSpentEl = document.getElementById("monthSpent");
  const homeMessage = document.getElementById("homeMessage");

  const form = document.getElementById("transactionForm");
  const personEl = document.getElementById("person");
  const counterpartyEl = document.getElementById("counterparty");
  const counterpartyLabel = document.getElementById("counterpartyLabel");
  const dateTimeEl = document.getElementById("dateTime");
  const amountEl = document.getElementById("amount");
  const descriptionEl = document.getElementById("description");
  const submitBtn = document.getElementById("submitBtn");
  const formMessage = document.getElementById("formMessage");

  const openCounterpartyBtn = document.getElementById("openCounterpartyBtn");
  const counterpartyDialog = document.getElementById("counterpartyDialog");
  const counterpartyForm = document.getElementById("counterpartyForm");
  const cancelCounterpartyBtn = document.getElementById("cancelCounterpartyBtn");
  const newCounterpartyName = document.getElementById("newCounterpartyName");
  const newCounterpartyCategory = document.getElementById("newCounterpartyCategory");
  const newCounterpartyDescription = document.getElementById("newCounterpartyDescription");
  const newCounterpartyPhone = document.getElementById("newCounterpartyPhone");
  const counterpartyMessage = document.getElementById("counterpartyMessage");

  let counterparties = [];
  let currentType = "";

  function formatKRW(value) {
    return `₩${Number(value || 0).toLocaleString("ko-KR")}`;
  }

  function toKstDateTimeLocal(date = new Date()) {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: window.MONEY_APP_CONFIG.TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {});

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  }

  function setMessage(el, text, type) {
    el.textContent = text;
    el.classList.remove("error", "success");
    if (type) el.classList.add(type);
  }

  function clearMessage(el) {
    setMessage(el, "", null);
  }

  function animatePanel(panelEl) {
    panelEl.classList.remove("panel-enter");
    requestAnimationFrame(() => panelEl.classList.add("panel-enter"));
  }

  function showHome() {
    formSection.classList.add("hidden");
    homeSection.classList.remove("hidden");
    animatePanel(homeSection);
    currentType = "";
    formSection.classList.remove("form-received", "form-spent");
    form.reset();
    dateTimeEl.value = toKstDateTimeLocal();
    clearMessage(formMessage);
  }

  function showForm(type) {
    currentType = type;
    formTitle.textContent = type === "received" ? "+ Record Cash Received" : "- Record Cash Spent";
    counterpartyLabel.textContent = type === "received" ? "Payer (Tutee) *" : "Payee (Merchant) *";
    formSection.classList.remove("form-received", "form-spent");
    formSection.classList.add(type === "received" ? "form-received" : "form-spent");
    renderCounterpartyOptions();
    dateTimeEl.value = toKstDateTimeLocal();
    clearMessage(formMessage);

    homeSection.classList.add("hidden");
    formSection.classList.remove("hidden");
    animatePanel(formSection);
  }

  function showRecordingOverlay(isVisible) {
    recordingOverlay.classList.toggle("hidden", !isVisible);
  }

  function filterCounterpartiesByType(type) {
    const category = type === "received" ? "tutee" : "merchant";
    return counterparties.filter((cp) => cp.category === category && cp.active === true);
  }

  function renderCounterpartyOptions() {
    if (!currentType) {
      counterpartyEl.innerHTML = '<option value="">Select a record action first</option>';
      return;
    }

    const options = filterCounterpartiesByType(currentType);
    if (options.length === 0) {
      const hint = currentType === "received" ? "No tutees yet. Add payer." : "No merchants yet. Add payee.";
      counterpartyEl.innerHTML = `<option value="">${hint}</option>`;
      return;
    }

    const placeholder = currentType === "received" ? "Select payer" : "Select payee";
    counterpartyEl.innerHTML = `<option value="">${placeholder}</option>` +
      options.map((cp) => `<option value="${cp.id}">${cp.name}</option>`).join("");
  }

  function validateTransaction() {
    const person = personEl.value;
    const counterpartyId = counterpartyEl.value;
    const dateTimeKst = dateTimeEl.value;
    const amount = Number(amountEl.value);

    if (!currentType) return "Choose received or spent from home screen.";
    if (!person) return "Select receiver/spender.";
    if (!counterpartyId) return "Select payer/payee.";
    if (!dateTimeKst) return "Select date and time.";
    if (!Number.isInteger(amount) || amount <= 0) return "Amount must be a positive integer in KRW.";
    return "";
  }

  async function refreshDashboard() {
    const data = await window.moneyApi.getDashboard();
    totalCashEl.textContent = formatKRW(data.dashboard.totalCash);
    monthReceivedEl.textContent = formatKRW(data.dashboard.monthReceived);
    monthSpentEl.textContent = formatKRW(data.dashboard.monthSpent);
  }

  async function loadCounterparties() {
    const data = await window.moneyApi.listCounterparties();
    counterparties = data.counterparties || [];
    renderCounterpartyOptions();
  }

  startReceivedBtn.addEventListener("click", () => showForm("received"));
  startSpentBtn.addEventListener("click", () => showForm("spent"));
  cancelFormBtn.addEventListener("click", showHome);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(formMessage);

    const error = validateTransaction();
    if (error) {
      setMessage(formMessage, error, "error");
      return;
    }

    submitBtn.disabled = true;
    showRecordingOverlay(true);

    try {
      const payload = {
        type: currentType,
        person: personEl.value,
        counterpartyId: counterpartyEl.value,
        dateTimeKst: dateTimeEl.value,
        amountKrw: Number(amountEl.value),
        description: descriptionEl.value.trim(),
      };

      await window.moneyApi.addTransaction(payload);
      await refreshDashboard();
      showHome();
      setMessage(homeMessage, "Transaction recorded.", "success");
    } catch (err) {
      setMessage(formMessage, err.message || "Failed to save transaction.", "error");
    } finally {
      showRecordingOverlay(false);
      submitBtn.disabled = false;
    }
  });

  openCounterpartyBtn.addEventListener("click", () => {
    clearMessage(counterpartyMessage);
    counterpartyDialog.showModal();
  });

  cancelCounterpartyBtn.addEventListener("click", () => {
    counterpartyDialog.close();
  });

  counterpartyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(counterpartyMessage);

    const payload = {
      name: newCounterpartyName.value.trim(),
      category: newCounterpartyCategory.value,
      description: newCounterpartyDescription.value.trim(),
      phone: newCounterpartyPhone.value.trim(),
    };

    if (!payload.name || !payload.category || !payload.description || !payload.phone) {
      setMessage(counterpartyMessage, "Complete all required counterparty fields.", "error");
      return;
    }

    try {
      await window.moneyApi.addCounterparty(payload);
      setMessage(counterpartyMessage, "Counterparty saved.", "success");
      counterpartyForm.reset();
      await loadCounterparties();
      setTimeout(() => counterpartyDialog.close(), 250);
    } catch (err) {
      setMessage(counterpartyMessage, err.message || "Failed to save counterparty.", "error");
    }
  });

  async function init() {
    [homeSection, formSection].forEach((panel) => {
      panel.addEventListener("animationend", () => panel.classList.remove("panel-enter"));
    });
    dateTimeEl.value = toKstDateTimeLocal();

    try {
      await loadCounterparties();
      await refreshDashboard();
    } catch (err) {
      setMessage(
        homeMessage,
        `Setup error: ${err.message}. Configure APPS_SCRIPT_URL in money/config.js and deploy Apps Script web app.`,
        "error"
      );
    }
  }

  init();
})();
