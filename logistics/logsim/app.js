const GAME_DATA_URL = "content.json";

const state = {
  data: null,
  sceneIndex: 0,
  stats: {},
  started: false,
  finished: false
};

const elements = {
  statsList: document.getElementById("stats-list"),
  sceneCounter: document.getElementById("scene-counter"),
  sceneKicker: document.getElementById("scene-kicker"),
  sceneTitle: document.getElementById("scene-title"),
  sceneText: document.getElementById("scene-text"),
  sceneFlavor: document.getElementById("scene-flavor"),
  choices: document.getElementById("choices"),
  feedback: document.getElementById("feedback"),
  endingPanel: document.getElementById("ending-panel"),
  endingTitle: document.getElementById("ending-title"),
  endingText: document.getElementById("ending-text"),
  summaryTags: document.getElementById("summary-tags"),
  restartButton: document.getElementById("restart-button"),
  errorPanel: document.getElementById("error-panel"),
  errorText: document.getElementById("error-text")
};

const STAT_META = {
  freshness: { label: "Freshness", inverse: false },
  firmness: { label: "Firmness", inverse: false },
  bruiseRisk: { label: "Bruise Risk", inverse: true },
  grade: { label: "Grade", inverse: false }
};

async function init() {
  try {
    const response = await fetch(GAME_DATA_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch stage data: ${response.status}`);
    }

    state.data = await response.json();
    setupRestart();
    resetGame();
  } catch (error) {
    showError(error.message);
  }
}

function setupRestart() {
  elements.restartButton.addEventListener("click", resetGame);
}

function resetGame() {
  if (!state.data) return;

  state.sceneIndex = 0;
  state.finished = false;
  state.started = true;
  state.stats = structuredClone(state.data.initialStats);

  hideFeedback();
  elements.endingPanel.hidden = true;
  renderStats();
  renderScene();
}

function renderStats() {
  const cards = Object.entries(STAT_META).map(([key, meta]) => {
    const value = clampStat(state.stats[key]);
    const meterWidth = `${value}%`;
    const fillClass = meta.inverse ? "meter-fill risk" : "meter-fill";

    return `
      <article class="stat-card">
        <div class="stat-row">
          <span class="stat-name">${meta.label}</span>
          <span class="stat-value">${value}</span>
        </div>
        <div class="meter" aria-hidden="true">
          <div class="${fillClass}" style="width: ${meterWidth};"></div>
        </div>
      </article>
    `;
  });

  elements.statsList.innerHTML = cards.join("");
}

function renderScene() {
  const scene = state.data.scenes[state.sceneIndex];
  const totalScenes = state.data.scenes.length;

  if (!scene) {
    renderEnding();
    return;
  }

  elements.sceneCounter.textContent = `Scene ${state.sceneIndex + 1} of ${totalScenes}`;
  elements.sceneKicker.textContent = scene.kicker;
  elements.sceneTitle.textContent = scene.title;
  elements.sceneText.textContent = scene.text;
  elements.sceneFlavor.textContent = scene.flavor;

  elements.choices.innerHTML = "";

  scene.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.setAttribute("role", "listitem");
    button.setAttribute("aria-label", choice.label);
    button.innerHTML = `
      <span class="choice-title">${choice.label}</span>
      <span class="choice-preview">${choice.preview}</span>
    `;

    button.addEventListener("click", () => handleChoice(index));
    elements.choices.appendChild(button);
  });
}

function handleChoice(choiceIndex) {
  if (state.finished) return;

  const scene = state.data.scenes[state.sceneIndex];
  const choice = scene.choices[choiceIndex];

  applyEffects(choice.effects);
  renderStats();
  showFeedback(choice.result);

  window.setTimeout(() => {
    state.sceneIndex += 1;
    if (state.sceneIndex >= state.data.scenes.length) {
      state.finished = true;
      renderEnding();
      return;
    }

    renderScene();
  }, 550);
}

function applyEffects(effects) {
  Object.keys(effects).forEach((statKey) => {
    const current = state.stats[statKey] ?? 0;
    state.stats[statKey] = clampStat(current + effects[statKey]);
  });
}

function renderEnding() {
  const ending = evaluateEnding();

  elements.endingTitle.textContent = ending.title;
  elements.endingText.textContent = ending.text;
  elements.summaryTags.innerHTML = [
    ...ending.summary.map((line) => `<span class="summary-tag">${line}</span>`),
    ...Object.entries(STAT_META).map(([key, meta]) => {
      return `<span class="summary-tag">${meta.label}: ${clampStat(state.stats[key])}</span>`;
    })
  ].join("");

  elements.endingPanel.hidden = false;
  elements.sceneKicker.textContent = "Stage Complete";
  elements.sceneTitle.textContent = "Farm stage concluded";
  elements.sceneText.textContent = "Your farm story is complete. Review your result below, then decide whether to tempt agriculture again.";
  elements.sceneFlavor.textContent = "The chain continues only for those intact enough to enter it.";
  elements.choices.innerHTML = "";
  elements.sceneCounter.textContent = `Scene ${state.data.scenes.length} of ${state.data.scenes.length}`;
}

function evaluateEnding() {
  const endings = state.data.endings;

  for (const ending of endings) {
    if (matchesRule(ending.rule, state.stats)) {
      return ending;
    }
  }

  return endings[endings.length - 1];
}

function matchesRule(rule, stats) {
  if (!rule || Object.keys(rule).length === 0) {
    return true;
  }

  const tests = [
    ["freshnessMin", stats.freshness >= rule.freshnessMin],
    ["firmnessMin", stats.firmness >= rule.firmnessMin],
    ["bruiseRiskMax", stats.bruiseRisk <= rule.bruiseRiskMax],
    ["gradeMin", stats.grade >= rule.gradeMin]
  ];

  return tests.every(([key, passed]) => !(key in rule) || passed);
}

function showFeedback(message) {
  elements.feedback.hidden = false;
  elements.feedback.textContent = message;
}

function hideFeedback() {
  elements.feedback.hidden = true;
  elements.feedback.textContent = "";
}

function showError(message) {
  elements.errorPanel.hidden = false;
  elements.errorText.textContent = message;
}

function clampStat(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

init();
