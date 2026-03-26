(function () {
  const form = document.getElementById("transactionForm");
  const typeEl = document.getElementById("transactionType");
  const personEl = document.getElementById("person");
  const counterpartyEl = document.getElementById("counterparty");
  const counterpartyLabel = document.getElementById("counterpartyLabel");
  const dateTimeEl = document.getElementById("dateTime");
  const amountEl = document.getElementById("amount");
  const descriptionEl = document.getElementById("description");
  const submitBtn = document.getElementById("submitBtn");
  const formMessage = document.getElementById("formMessage");

  const totalCashEl = document.getElementById("totalCash");
  const recentTransactionsBody = document.getElementById("recentTransactionsBody");

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

  function filterCounterparties() {
    const type = typeEl.value;
    if (!type) {
      return [];
    }

    const category = type === "received" ? "tutee" : "merchant";
    return counterparties.filter((cp) => cp.category === category && cp.active === true);
  }

  function renderCounterpartyOptions() {
    const type = typeEl.value;
    const label = type === "received" ? "Payer (Tutee) *" : type === "spent" ? "Payee (Merchant) *" : "Payer / Payee *";
    counterpartyLabel.textContent = label;

    const options = filterCounterparties();
    if (!type) {
      counterpartyEl.innerHTML = '<option value="">Select type first</option>';
      return;
    }

    if (options.length === 0) {
      counterpartyEl.innerHTML = '<option value="">No names yet. Add one below.</option>';
      return;
    }

    const placeholder = type === "received" ? "Select payer" : "Select payee";
    counterpartyEl.innerHTML = `<option value="">${placeholder}</option>` +
      options
        .map((cp) => `<option value="${cp.id}">${cp.name}</option>`)
        .join("");
  }

  function validateTransaction() {
    const type = typeEl.value;
    const person = personEl.value;
    const counterpartyId = counterpartyEl.value;
    const dateTimeKst = dateTimeEl.value;
    const amount = Number(amountEl.value);

    if (!type) return "Select transaction type.";
    if (!person) return "Select receiver/spender.";
    if (!counterpartyId) return "Select payer/payee.";
    if (!dateTimeKst) return "Select date and time.";
    if (!Number.isInteger(amount) || amount <= 0) return "Amount must be a positive integer in KRW.";
    return "";
  }

  async function refreshDashboard() {
    const data = await window.moneyApi.getDashboard();
    totalCashEl.textContent = formatKRW(data.dashboard.totalCash);

    const rows = data.dashboard.recentTransactions || [];
    if (rows.length === 0) {
      recentTransactionsBody.innerHTML = '<tr><td colspan="6">No transactions yet.</td></tr>';
      return;
    }

    recentTransactionsBody.innerHTML = rows
      .map((row) => `
        <tr>
          <td>${row.dateTimeKst}</td>
          <td>${row.type === "received" ? "Received" : "Spent"}</td>
          <td>${row.person}</td>
          <td>${row.counterpartyName}</td>
          <td>${formatKRW(row.amountKrw)}</td>
          <td>${row.description || ""}</td>
        </tr>
      `)
      .join("");
  }

  async function loadCounterparties() {
    const data = await window.moneyApi.listCounterparties();
    counterparties = data.counterparties || [];
    renderCounterpartyOptions();
  }

  typeEl.addEventListener("change", renderCounterpartyOptions);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(formMessage);

    const error = validateTransaction();
    if (error) {
      setMessage(formMessage, error, "error");
      return;
    }

    submitBtn.disabled = true;
    try {
      const payload = {
        type: typeEl.value,
        person: personEl.value,
        counterpartyId: counterpartyEl.value,
        dateTimeKst: dateTimeEl.value,
        amountKrw: Number(amountEl.value),
        description: descriptionEl.value.trim(),
      };

      await window.moneyApi.addTransaction(payload);
      setMessage(formMessage, "Transaction saved.", "success");

      amountEl.value = "";
      descriptionEl.value = "";
      dateTimeEl.value = toKstDateTimeLocal();

      await refreshDashboard();
    } catch (err) {
      setMessage(formMessage, err.message || "Failed to save transaction.", "error");
    } finally {
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
    dateTimeEl.value = toKstDateTimeLocal();

    try {
      await loadCounterparties();
      await refreshDashboard();
    } catch (err) {
      setMessage(
        formMessage,
        `Setup error: ${err.message}. Configure APPS_SCRIPT_URL in money/config.js and deploy Apps Script as a web app.`,
        "error"
      );
    }
  }

  init();
})();
