import { LEVELS } from "./levels.js";

export const STORAGE_KEY = "mathquest-progress-v1";

export function createDefaultProgress() {
  return {
    version: 1,
    completedLevelIds: [],
    starsByLevel: {},
    soundEnabled: true,
    reducedMotion: false,
  };
}

export function normalizeProgress(value) {
  const fallback = createDefaultProgress();
  if (!value || typeof value !== "object" || value.version !== 1) return fallback;

  const validIds = new Set(LEVELS.map((level) => level.id));
  const completedLevelIds = Array.isArray(value.completedLevelIds)
    ? [...new Set(value.completedLevelIds.filter((id) => validIds.has(id)))]
    : [];
  const starsByLevel = {};
  if (value.starsByLevel && typeof value.starsByLevel === "object") {
    for (const [id, stars] of Object.entries(value.starsByLevel)) {
      if (validIds.has(id) && Number.isInteger(stars) && stars >= 1 && stars <= 3) starsByLevel[id] = stars;
    }
  }

  return {
    version: 1,
    completedLevelIds,
    starsByLevel,
    soundEnabled: typeof value.soundEnabled === "boolean" ? value.soundEnabled : true,
    reducedMotion: typeof value.reducedMotion === "boolean" ? value.reducedMotion : false,
  };
}

export function parseProgress(serialized) {
  try {
    return normalizeProgress(JSON.parse(serialized));
  } catch {
    return createDefaultProgress();
  }
}

export function loadProgress(storage) {
  try {
    return parseProgress(storage?.getItem(STORAGE_KEY));
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(storage, progress) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(progress)));
    return true;
  } catch {
    return false;
  }
}

export function scoreForAttempt(attempts) {
  if (attempts <= 1) return 3;
  if (attempts === 2) return 2;
  return 1;
}

export function validateAnswer(level, answer) {
  if (!level) return false;
  if (level.interaction === "numeric") {
    const value = typeof answer === "number" ? answer : Number(String(answer).trim());
    return Number.isFinite(value) && Math.abs(value - level.answer) <= 1e-8;
  }
  if (level.interaction === "choice") return String(answer) === level.answer;
  if (level.interaction === "coordinate") {
    return Number(answer?.x) === level.answer.x && Number(answer?.y) === level.answer.y;
  }
  return false;
}

export function isLevelUnlocked(levelId, completedLevelIds) {
  const index = LEVELS.findIndex((level) => level.id === levelId);
  if (index < 0) return false;
  if (index === 0) return true;
  return completedLevelIds.includes(LEVELS[index - 1].id);
}

export function completeLevel(progress, levelId, stars) {
  const normalized = normalizeProgress(progress);
  if (!LEVELS.some((level) => level.id === levelId)) return normalized;
  const completedLevelIds = normalized.completedLevelIds.includes(levelId)
    ? normalized.completedLevelIds
    : [...normalized.completedLevelIds, levelId];
  return {
    ...normalized,
    completedLevelIds,
    starsByLevel: {
      ...normalized.starsByLevel,
      [levelId]: Math.max(normalized.starsByLevel[levelId] || 0, stars),
    },
  };
}

export function completionForMode(progress, levelId, stars, isShowcase = false) {
  return isShowcase ? normalizeProgress(progress) : completeLevel(progress, levelId, stars);
}

export function totalStars(progress) {
  return Object.values(normalizeProgress(progress).starsByLevel).reduce((sum, stars) => sum + stars, 0);
}

export function isGameComplete(progress) {
  return LEVELS.every((level) => normalizeProgress(progress).completedLevelIds.includes(level.id));
}

export function nextLevelId(levelId) {
  const index = LEVELS.findIndex((level) => level.id === levelId);
  return index >= 0 && index < LEVELS.length - 1 ? LEVELS[index + 1].id : null;
}
