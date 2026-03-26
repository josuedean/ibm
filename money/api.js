(function () {
  // api client build: 2026-03-26
  const { APPS_SCRIPT_URL } = window.MONEY_APP_CONFIG;

  function assertConfigured() {
    if (!APPS_SCRIPT_URL) {
      throw new Error("APPS_SCRIPT_URL is not configured in money/config.js");
    }
  }

  async function request(action, payload) {
    assertConfigured();
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || "Unknown API error");
    }
    return data;
  }

  window.moneyApi = {
    listCounterparties() {
      return request("listCounterparties", {});
    },
    addCounterparty(payload) {
      return request("addCounterparty", payload);
    },
    addTransaction(payload) {
      return request("addTransaction", payload);
    },
    getDashboard() {
      return request("getDashboard", {});
    },
  };
})();
