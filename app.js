import { LEVELS, SHOWCASE_LEVEL_IDS, WORLDS, levelById, levelsForWorld, worldById } from "./levels.js";
import {
  completionForMode,
  createDefaultProgress,
  isGameComplete,
  isLevelUnlocked,
  loadProgress,
  nextLevelId,
  saveProgress,
  scoreForAttempt,
  totalStars,
  validateAnswer,
} from "./games.js";

const app = document.querySelector("#app");
const announcer = document.querySelector("#announcer");

let progress = loadProgress(window.localStorage);
let view = progress.completedLevelIds.length ? "map" : "welcome";
let currentLevelId = suggestedLevelId();
let attempts = 0;
let selectedChoice = "";
let coordinatePosition = { x: 0, y: 0 };
let feedback = null;
let audioContext = null;
let showcaseMode = false;
let showcaseIndex = 0;
let campaignLevelIdBeforeShowcase = currentLevelId;

function suggestedLevelId() {
  return LEVELS.find((level) => isLevelUnlocked(level.id, progress.completedLevelIds) && !progress.completedLevelIds.includes(level.id))?.id
    || LEVELS.at(-1).id;
}

function persist() {
  saveProgress(window.localStorage, progress);
  document.body.classList.toggle("reduce-motion", progress.reducedMotion);
}

function announce(message) {
  announcer.textContent = "";
  requestAnimationFrame(() => { announcer.textContent = message; });
}

function playTone(success) {
  if (!progress.soundEnabled) return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = success ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(success ? 523.25 : 180, audioContext.currentTime);
    if (success) oscillator.frequency.exponentialRampToValueAtTime(783.99, audioContext.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.26);
  } catch {
    // Sound is optional; gameplay must survive blocked Web Audio.
  }
}

function icon(name, className = "") {
  const paths = {
    star: '<path d="m12 2.4 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9Z"/>',
    sound: '<path d="M4 10v4h4l5 4V6L8 10H4Zm12.2-2.2a6 6 0 0 1 0 8.4M18.8 5.2a10 10 0 0 1 0 13.6"/>',
    motion: '<path d="M5 7h10M2 12h13M6 17h9M18 7l3 5-3 5"/>',
    reset: '<path d="M4 7V3m0 0h4M4 3l3.2 3.2A7 7 0 1 1 5 15"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  };
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.star}</svg>`;
}

function header() {
  const showReset = !showcaseMode && view !== "showcase";
  return `
    <header class="topbar">
      <button class="brand" data-action="go-map" aria-label="Return to world map">
        <span class="brand-mark" aria-hidden="true">✦</span>
        <span><strong>MathQuest</strong><small>Four Realms</small></span>
      </button>
      <div class="topbar-actions">
        <div class="star-total" aria-label="${totalStars(progress)} of 60 stars earned">
          ${icon("star")}<strong>${totalStars(progress)}</strong><span>/ 60</span>
        </div>
        <button class="icon-button" data-action="toggle-sound" aria-pressed="${progress.soundEnabled}" title="Toggle sound">
          ${icon("sound")}<span>Sound</span><b>${progress.soundEnabled ? "On" : "Off"}</b>
        </button>
        <button class="icon-button" data-action="toggle-motion" aria-pressed="${!progress.reducedMotion}" title="Toggle motion">
          ${icon("motion")}<span>Motion</span><b>${progress.reducedMotion ? "Off" : "On"}</b>
        </button>
        ${showReset ? `<button class="icon-button reset-button" data-action="reset" title="Reset adventure">${icon("reset")}<span>Reset</span></button>` : ""}
      </div>
    </header>`;
}

function showcaseBanner() {
  if (!showcaseMode) return "";
  return `<aside class="showcase-banner" aria-label="Judge showcase mode">
    <strong>Judge Showcase</strong><span>Four sample challenges · Campaign progress is not saved</span>
    <button data-action="exit-showcase">Exit showcase</button>
  </aside>`;
}

function realmArt(worldId) {
  const common = 'viewBox="0 0 280 150" role="img"';
  if (worldId === "algebra") return `<svg ${common} aria-label="Purple castle with a locked gate" class="realm-art">
    <path class="ground" d="M22 132Q42 96 69 113q28-54 55-16 26-48 55-4 34-28 76 39Z"/>
    <path class="silhouette" d="M54 123V66h29V43l15-18 15 18v80h27V55h35v68h25V76h28v47Z"/>
    <path class="detail" d="M88 123V85h23v38m51 0V91h18v32M75 66h9m60-11h27m35 21h-8"/>
    <path class="accent-line" d="M131 123V94a12 12 0 0 1 24 0v29"/>
  </svg>`;
  if (worldId === "geometry") return `<svg ${common} aria-label="Teal fortified city protected by a shield" class="realm-art">
    <path class="ground" d="M18 133Q60 100 95 120q40-42 80-5 42-20 86 18Z"/>
    <path class="silhouette" d="M46 125V80l19-18 19 18v45h20V49l20-22 20 22v76h22V68l18-19 18 19v57h31V93h21v32Z"/>
    <path class="detail" d="M58 88h13m46-29h14m46 18h13M104 83h40m-20-55v20"/>
    <path class="accent-line" d="m140 72 22 9v19c0 15-10 25-22 30-12-5-22-15-22-30V81l22-9Zm-9 26 7 7 13-15"/>
  </svg>`;
  if (worldId === "coordinates") return `<svg ${common} aria-label="Golden treasure island with a coordinate grid" class="realm-art">
    <path class="ground" d="M23 129q22-50 57-28 24-48 65-13 35-20 58 12 37-7 54 29Z"/>
    <path class="detail grid-lines" d="M56 44h154M56 64h154M56 84h154M56 104h154M76 28v94M106 28v94M136 28v94M166 28v94M196 28v94"/>
    <path class="accent-line" d="M136 28v96M52 84h164m-9-6 9 6-9 6m-77-69 6 7 6-7"/>
    <path class="silhouette" d="m85 101 14-17 14 17-14 17-14-17Zm92-42 14-18 14 18-14 18-14-18Z"/>
    <path class="accent-line dashed" d="M100 101q35 13 53-11t38-31"/>
  </svg>`;
  return `<svg ${common} aria-label="Coral crystal dungeon with dice" class="realm-art">
    <path class="ground" d="M17 133q23-43 51-23 22-58 56-14 29-60 60-6 47-22 78 43Z"/>
    <path class="silhouette" d="m57 124 18-68 17 68m18 0 29-97 25 97m19 0 21-73 21 73"/>
    <rect class="detail dice" x="104" y="69" width="54" height="54" rx="9"/>
    <circle class="accent-fill" cx="119" cy="84" r="4"/><circle class="accent-fill" cx="143" cy="108" r="4"/><circle class="accent-fill" cx="131" cy="96" r="4"/>
  </svg>`;
}

function welcomeScreen() {
  return `${header()}<main id="main" class="welcome-shell" tabindex="-1">
    <section class="welcome-hero">
      <div class="welcome-copy">
        <h1>Turn difficult maths into an adventure.</h1>
        <p>Restore four magical realms through 20 Class 9–10 challenges. Every wrong answer reveals a useful clue, every success builds visible mastery, and progress stays safely on this device.</p>
        <div class="welcome-actions">
          <button class="primary-button" data-action="start-adventure">Start adventure ${icon("arrow")}</button>
          <button class="secondary-button" data-action="open-showcase">Judge showcase</button>
        </div>
        <ul class="welcome-proof" aria-label="Game features">
          <li><strong>4</strong><span>maths realms</span></li>
          <li><strong>20</strong><span>handcrafted levels</span></li>
          <li><strong>0</strong><span>APIs or logins</span></li>
        </ul>
      </div>
      <div class="welcome-realms" aria-label="The four mathematical realms">
        ${WORLDS.map((world) => `<article style="--realm:${world.color}">${realmArt(world.id)}<strong>${world.shortName}</strong></article>`).join("")}
      </div>
    </section>
  </main>`;
}

function showcaseScreen() {
  return `${header()}<main id="main" class="showcase-shell" tabindex="-1">
    <button class="back-button" data-action="exit-showcase">← Back to adventure</button>
    <section class="showcase-intro">
      <div><h1>Four realms. Four quick challenges.</h1><p>Sample one representative level from every world. Your campaign stars, unlocks, and saved progress will stay exactly as they are.</p>
        <button class="primary-button" data-action="begin-showcase">Begin showcase ${icon("arrow")}</button>
      </div>
      <ol class="showcase-route">
        ${SHOWCASE_LEVEL_IDS.map((id, index) => { const level = levelById(id); const world = worldById(level.worldId); return `<li style="--realm:${world.color}"><span>${index + 1}</span><div><strong>${world.shortName}</strong><small>${level.skill}</small></div></li>`; }).join("")}
      </ol>
    </section>
  </main>`;
}

function levelStars(levelId) {
  const count = progress.starsByLevel[levelId] || 0;
  return `<span class="node-stars" aria-label="${count} stars">${"★".repeat(count)}${"☆".repeat(3 - count)}</span>`;
}

function mapScreen() {
  const selected = levelById(currentLevelId) || LEVELS[0];
  const selectedWorld = worldById(selected.worldId);
  const completedTotal = progress.completedLevelIds.length;
  return `
    ${header()}
    <main id="main" class="map-shell" tabindex="-1">
      <div class="map-heading">
        <div><h1>Choose your path</h1><p>Master every challenge to restore the four realms.</p></div>
        <div class="map-heading-actions"><button class="secondary-button" data-action="open-showcase">Judge showcase</button><button class="secondary-button mobile-reset" data-action="reset">Reset adventure</button></div>
      </div>
      <section class="mastery-dashboard" aria-label="Learning progress">
        <div class="mastery-overall"><span>Adventure mastery</span><strong>${Math.round(completedTotal / LEVELS.length * 100)}%</strong><div role="progressbar" aria-label="Overall adventure mastery" aria-valuemin="0" aria-valuemax="20" aria-valuenow="${completedTotal}"><i style="width:${completedTotal / LEVELS.length * 100}%"></i></div><small>${completedTotal} of 20 challenges · ${totalStars(progress)} of 60 stars</small></div>
        <div class="realm-mastery">
          ${WORLDS.map((world) => { const complete = levelsForWorld(world.id).filter((level) => progress.completedLevelIds.includes(level.id)).length; return `<div style="--realm:${world.color}"><span>${world.shortName}</span><div role="progressbar" aria-label="${world.shortName} mastery" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${complete}"><i style="width:${complete / 5 * 100}%"></i></div><strong>${complete === 5 ? "Restored" : `${complete}/5`}</strong></div>`; }).join("")}
        </div>
      </section>
      <section class="realm-map" aria-label="Four mathematical realms">
        ${WORLDS.map((world, worldIndex) => {
          const levels = levelsForWorld(world.id);
          const unlocked = isLevelUnlocked(levels[0].id, progress.completedLevelIds);
          const completedCount = levels.filter((level) => progress.completedLevelIds.includes(level.id)).length;
          return `<article class="realm ${unlocked ? "is-unlocked" : "is-locked"} ${world.id}" style="--realm:${world.color}">
            <div class="realm-title"><span>Realm ${worldIndex + 1}</span><h2>${world.name}</h2><p>${world.description}</p></div>
            ${realmArt(world.id)}
            <div class="level-path" aria-label="${world.name} levels">
              ${levels.map((level) => {
                const levelUnlocked = isLevelUnlocked(level.id, progress.completedLevelIds);
                const complete = progress.completedLevelIds.includes(level.id);
                const selectedClass = currentLevelId === level.id ? "is-selected" : "";
                return `<button class="level-node ${complete ? "is-complete" : ""} ${selectedClass}" data-action="select-level" data-level="${level.id}" ${levelUnlocked ? "" : "disabled"} aria-label="${level.title}${complete ? ", completed" : levelUnlocked ? ", unlocked" : ", locked"}">
                  <span>${complete ? icon("check") : levelUnlocked ? level.number : icon("lock")}</span>
                  ${complete ? levelStars(level.id) : ""}
                </button>`;
              }).join("")}
            </div>
            ${!unlocked ? `<div class="realm-lock">${icon("lock")}<span>Complete the previous realm</span></div>` : `<div class="realm-count">${completedCount === 5 ? "✓ Realm restored" : `${completedCount} / 5 complete`}</div>`}
          </article>`;
        }).join("")}
      </section>
      <section class="mission-dock" style="--realm:${selectedWorld.color}" aria-label="Selected mission">
        <div class="mission-symbol">${icon(selectedWorld.id === "algebra" ? "lock" : "map")}</div>
        <div><span>${selectedWorld.name} · Level ${selected.number}</span><h2>${selected.title}</h2></div>
        <p>${selected.scene.formula}</p>
        <button class="primary-button" data-action="open-level" data-level="${selected.id}">Start level ${icon("arrow")}</button>
      </section>
    </main>`;
}

function sceneIllustration(level) {
  const world = worldById(level.worldId);
  return `<div class="challenge-scene" style="--realm:${world.color}">
    ${realmArt(level.worldId)}
    <div class="scene-formula">${level.scene.formula}</div>
  </div>`;
}

function introScreen(level) {
  const world = worldById(level.worldId);
  return `${header()}${showcaseBanner()}<main id="main" class="stage-shell" tabindex="-1" style="--realm:${world.color}">
    <button class="back-button" data-action="${showcaseMode ? "exit-showcase" : "go-map"}">← ${showcaseMode ? "Exit showcase" : "World map"}</button>
    <section class="briefing-panel">
      <div class="briefing-copy"><span>${world.name} · Level ${level.number}</span><h1>${level.title}</h1><p>${level.prompt}</p>
        <button class="primary-button" data-action="begin-level">Enter challenge ${icon("arrow")}</button>
      </div>
      ${sceneIllustration(level)}
    </section>
  </main>`;
}

function coordinateGrid(position) {
  const toPixelX = (x) => 150 + x * 24;
  const toPixelY = (y) => 150 - y * 24;
  const lines = Array.from({ length: 11 }, (_, index) => index - 5).map((n) => `
    <line x1="${toPixelX(n)}" y1="30" x2="${toPixelX(n)}" y2="270"/>
    <line x1="30" y1="${toPixelY(n)}" x2="270" y2="${toPixelY(n)}"/>`).join("");
  return `<svg class="coordinate-grid" viewBox="0 0 300 300" role="img" aria-label="Coordinate grid. Current position ${position.x}, ${position.y}">
    <g class="minor-grid">${lines}</g>
    <path class="axis" d="M30 150h240M150 30v240"/>
    <path class="axis-arrow" d="m264 144 8 6-8 6M144 36l6-8 6 8"/>
    <g class="grid-labels"><text x="276" y="145">x</text><text x="157" y="27">y</text><text x="136" y="166">0</text></g>
    <circle class="player-shadow" cx="${toPixelX(position.x)}" cy="${toPixelY(position.y) + 5}" r="11"/>
    <path class="player-marker" transform="translate(${toPixelX(position.x) - 12} ${toPixelY(position.y) - 24})" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22C24 5.4 18.6 0 12 0Zm0 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"/>
  </svg>`;
}

function interactionMarkup(level) {
  if (level.interaction === "numeric") return `<form class="answer-form" id="answer-form">
    <label for="numeric-answer">Your answer</label>
    <div class="answer-row"><input id="numeric-answer" name="answer" type="number" step="any" inputmode="decimal" autocomplete="off" required><button class="primary-button" type="submit">Check answer</button></div>
  </form>`;
  if (level.interaction === "choice") return `<div class="choice-grid" role="group" aria-label="Choose an answer">
    ${level.choices.map((choice) => `<button class="choice-button ${selectedChoice === choice.id ? "is-selected" : ""}" data-action="choose" data-choice="${choice.id}" aria-pressed="${selectedChoice === choice.id}">${choice.label}</button>`).join("")}
    <button class="primary-button choice-submit" data-action="submit-answer" ${selectedChoice ? "" : "disabled"}>Check answer</button>
  </div>`;
  return `<div class="coordinate-challenge">
    ${coordinateGrid(coordinatePosition)}
    <div class="coordinate-readout" aria-live="polite">Current position <strong>(${coordinatePosition.x}, ${coordinatePosition.y})</strong></div>
    <div class="direction-pad" aria-label="Move explorer">
      <button data-action="move" data-dx="0" data-dy="1" aria-label="Move up">↑</button>
      <button data-action="move" data-dx="-1" data-dy="0" aria-label="Move left">←</button>
      <button data-action="move" data-dx="0" data-dy="-1" aria-label="Move down">↓</button>
      <button data-action="move" data-dx="1" data-dy="0" aria-label="Move right">→</button>
    </div>
    <button class="primary-button" data-action="submit-answer">Check position</button>
  </div>`;
}

function playingScreen(level) {
  const world = worldById(level.worldId);
  const pathIds = showcaseMode ? SHOWCASE_LEVEL_IDS : levelsForWorld(world.id).map((item) => item.id);
  return `${header()}${showcaseBanner()}<main id="main" class="play-shell" tabindex="-1" style="--realm:${world.color}">
    <div class="play-status"><button class="back-button" data-action="${showcaseMode ? "exit-showcase" : "go-map"}">← ${showcaseMode ? "Exit showcase" : "Leave level"}</button><span>${world.name}</span><div class="level-dots">${pathIds.map((id) => `<i class="${showcaseMode && SHOWCASE_LEVEL_IDS.indexOf(id) < showcaseIndex ? "done" : id === level.id ? "current" : !showcaseMode && progress.completedLevelIds.includes(id) ? "done" : ""}"></i>`).join("")}</div></div>
    <section class="play-layout">
      ${sceneIllustration(level)}
      <div class="challenge-panel">
        <div class="challenge-heading"><span>${showcaseMode ? `Showcase ${showcaseIndex + 1} of 4` : `Level ${level.number} of 5`}</span><h1>${level.title}</h1><p>${level.prompt}</p></div>
        ${interactionMarkup(level)}
        ${attempts ? `<p class="attempt-note">Attempt ${attempts + 1} · A correct answer now earns ${scoreForAttempt(attempts + 1)} ${scoreForAttempt(attempts + 1) === 1 ? "star" : "stars"}.</p>` : ""}
      </div>
    </section>
  </main>`;
}

function feedbackScreen(level) {
  const world = worldById(level.worldId);
  return `${header()}${showcaseBanner()}<main id="main" class="feedback-shell" tabindex="-1" style="--realm:${world.color}">
    <section class="feedback-panel is-wrong">
      <div class="feedback-symbol" aria-hidden="true">?</div>
      <span>Not quite yet</span><h1>The realm left you a clue</h1>
      <p>${level.hint}</p>
      <div class="feedback-formula">${level.scene.formula}</div>
      <button class="primary-button" data-action="retry">Try again ${icon("arrow")}</button>
    </section>
  </main>`;
}

function completeScreen(level) {
  const world = worldById(level.worldId);
  const stars = feedback?.stars || progress.starsByLevel[level.id] || 1;
  const allComplete = !showcaseMode && isGameComplete(progress);
  const nextId = showcaseMode ? SHOWCASE_LEVEL_IDS[showcaseIndex + 1] : nextLevelId(level.id);
  const nextLevel = levelById(nextId);
  const showcaseComplete = showcaseMode && !nextId;
  const unlockMessage = showcaseMode
    ? "Showcase result only · Your campaign progress is unchanged."
    : nextLevel
      ? `${nextLevel.worldId !== level.worldId ? `New realm unlocked: ${worldById(nextLevel.worldId).name}` : "Next challenge unlocked"}: ${nextLevel.title}`
      : "Every challenge is complete.";
  return `${header()}${showcaseBanner()}<main id="main" class="feedback-shell ${allComplete || showcaseComplete ? "finale" : ""}" tabindex="-1" style="--realm:${world.color}">
    <div class="spark-field" aria-hidden="true">${Array.from({ length: 16 }, (_, i) => `<i style="--i:${i}">✦</i>`).join("")}</div>
    <section class="feedback-panel is-correct">
      <div class="feedback-symbol" aria-hidden="true">${allComplete ? "♛" : "✓"}</div>
      <span>${allComplete ? "All four realms restored" : showcaseComplete ? "Showcase complete" : "Challenge complete"}</span>
      <h1>${allComplete ? "You are a MathQuest Champion" : showcaseComplete ? "You explored all four realms" : level.title + " conquered"}</h1>
      <div class="earned-stars" aria-label="${stars} ${showcaseMode ? "practice stars" : "stars earned"}">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
      <p>${level.explanation}</p>
      <div class="skill-takeaway"><span>${showcaseMode ? "Skill demonstrated" : "Skill mastered"}</span><strong>${level.skill}</strong></div>
      <p class="unlock-note">${unlockMessage}</p>
      <div class="complete-actions">
        ${allComplete ? `<button class="primary-button" data-action="print">Print certificate</button>` : showcaseComplete ? `<button class="primary-button" data-action="exit-showcase">Return to adventure ${icon("arrow")}</button>` : nextId ? `<button class="primary-button" data-action="${showcaseMode ? "next-showcase" : "next-level"}" data-level="${nextId}">${showcaseMode ? "Next realm" : "Next challenge"} ${icon("arrow")}</button>` : ""}
        ${showcaseComplete ? "" : `<button class="secondary-button" data-action="${showcaseMode ? "exit-showcase" : "go-map"}">${showcaseMode ? "Exit showcase" : "World map"}</button>`}
      </div>
    </section>
    ${allComplete ? `<section class="certificate" aria-label="Completion certificate"><span>Certificate of completion</span><h2>MathQuest: Four Realms</h2><p>This certifies that a brave explorer restored all four mathematical realms and completed 20 challenges.</p><strong>${totalStars(progress)} / 60 stars</strong></section>` : ""}
  </main>`;
}

function render({ focus = false } = {}) {
  const level = levelById(currentLevelId) || LEVELS[0];
  if (view === "welcome") app.innerHTML = welcomeScreen();
  if (view === "showcase") app.innerHTML = showcaseScreen();
  if (view === "map") app.innerHTML = mapScreen();
  if (view === "intro") app.innerHTML = introScreen(level);
  if (view === "playing") app.innerHTML = playingScreen(level);
  if (view === "feedback") app.innerHTML = feedbackScreen(level);
  if (view === "complete") app.innerHTML = completeScreen(level);
  document.body.classList.toggle("reduce-motion", progress.reducedMotion);
  if (focus) {
    window.scrollTo({ top: 0, behavior: "auto" });
    const focusTarget = app.querySelector("h1, .primary-button, input");
    if (focusTarget?.matches("h1")) focusTarget.tabIndex = -1;
    focusTarget?.focus({ preventScroll: true });
  }
}

function startLevel(levelId, screen = "intro") {
  const level = levelById(levelId);
  if (!level || (!showcaseMode && !isLevelUnlocked(levelId, progress.completedLevelIds))) return;
  currentLevelId = levelId;
  attempts = 0;
  selectedChoice = "";
  coordinatePosition = { ...(level.start || { x: 0, y: 0 }) };
  feedback = null;
  view = screen;
  render({ focus: true });
}

function submitCurrentAnswer(answer) {
  const level = levelById(currentLevelId);
  if (!level || view !== "playing") return;
  attempts += 1;
  if (validateAnswer(level, answer)) {
    const stars = scoreForAttempt(attempts);
    const completedProgress = completionForMode(progress, level.id, stars, showcaseMode);
    if (!showcaseMode) {
      progress = completedProgress;
      persist();
    }
    feedback = { correct: true, stars };
    view = "complete";
    playTone(true);
    announce(`Correct. ${showcaseMode ? `Practice rating: ${stars} stars.` : `${stars} campaign stars earned.`} ${level.explanation}${showcaseMode ? " Campaign progress was not changed." : ""}`);
  } else {
    feedback = { correct: false };
    view = "feedback";
    playTone(false);
    announce(`Not quite. Hint: ${level.hint}`);
  }
  render({ focus: true });
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "start-adventure") {
    showcaseMode = false;
    view = "map";
    render({ focus: true });
  }
  if (action === "open-showcase") {
    campaignLevelIdBeforeShowcase = currentLevelId;
    showcaseMode = false;
    view = "showcase";
    render({ focus: true });
  }
  if (action === "begin-showcase") {
    showcaseMode = true;
    showcaseIndex = 0;
    startLevel(SHOWCASE_LEVEL_IDS[showcaseIndex]);
  }
  if (action === "exit-showcase") {
    showcaseMode = false;
    showcaseIndex = 0;
    currentLevelId = campaignLevelIdBeforeShowcase;
    view = "map";
    render({ focus: true });
    announce("Showcase closed. Campaign progress was not changed.");
  }
  if (action === "go-map") {
    const returnLevelId = showcaseMode ? campaignLevelIdBeforeShowcase : suggestedLevelId();
    showcaseMode = false;
    view = "map";
    currentLevelId = returnLevelId;
    render({ focus: true });
  }
  if (action === "select-level") {
    currentLevelId = button.dataset.level;
    render();
    document.querySelector(".mission-dock")?.scrollIntoView({ behavior: progress.reducedMotion ? "auto" : "smooth", block: "nearest" });
  }
  if (action === "open-level") startLevel(button.dataset.level);
  if (action === "begin-level") startLevel(currentLevelId, "playing");
  if (action === "choose") {
    selectedChoice = button.dataset.choice;
    render();
    app.querySelector(`[data-choice="${selectedChoice}"]`)?.focus();
  }
  if (action === "move") {
    coordinatePosition.x = Math.max(-5, Math.min(5, coordinatePosition.x + Number(button.dataset.dx)));
    coordinatePosition.y = Math.max(-5, Math.min(5, coordinatePosition.y + Number(button.dataset.dy)));
    render();
    app.querySelector(`[data-dx="${button.dataset.dx}"][data-dy="${button.dataset.dy}"]`)?.focus();
  }
  if (action === "submit-answer") {
    const level = levelById(currentLevelId);
    submitCurrentAnswer(level.interaction === "choice" ? selectedChoice : coordinatePosition);
  }
  if (action === "retry") {
    view = "playing";
    selectedChoice = "";
    render({ focus: true });
  }
  if (action === "next-level") startLevel(button.dataset.level);
  if (action === "next-showcase") {
    showcaseIndex += 1;
    startLevel(button.dataset.level);
  }
  if (action === "toggle-sound") {
    progress = { ...progress, soundEnabled: !progress.soundEnabled };
    persist(); render(); app.querySelector('[data-action="toggle-sound"]')?.focus(); announce(`Sound ${progress.soundEnabled ? "on" : "off"}.`);
  }
  if (action === "toggle-motion") {
    progress = { ...progress, reducedMotion: !progress.reducedMotion };
    persist(); render(); app.querySelector('[data-action="toggle-motion"]')?.focus(); announce(`Motion ${progress.reducedMotion ? "reduced" : "enabled"}.`);
  }
  if (action === "reset" && window.confirm("Reset all MathQuest progress and stars?")) {
    progress = createDefaultProgress();
    persist(); showcaseMode = false; currentLevelId = LEVELS[0].id; view = "welcome"; render({ focus: true }); announce("Adventure reset.");
  }
  if (action === "print") window.print();
});

app.addEventListener("submit", (event) => {
  if (event.target.id !== "answer-form") return;
  event.preventDefault();
  submitCurrentAnswer(new FormData(event.target).get("answer"));
});

window.addEventListener("keydown", (event) => {
  const level = levelById(currentLevelId);
  if (view !== "playing" || level?.interaction !== "coordinate") return;
  const moves = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  if (!moves[event.key]) return;
  event.preventDefault();
  const [dx, dy] = moves[event.key];
  coordinatePosition.x = Math.max(-5, Math.min(5, coordinatePosition.x + dx));
  coordinatePosition.y = Math.max(-5, Math.min(5, coordinatePosition.y + dy));
  render();
});

persist();
render();
