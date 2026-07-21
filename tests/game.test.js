import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS, WORLDS } from "../levels.js";
import {
  STORAGE_KEY,
  completeLevel,
  createDefaultProgress,
  isGameComplete,
  isLevelUnlocked,
  loadProgress,
  normalizeProgress,
  saveProgress,
  scoreForAttempt,
  totalStars,
  validateAnswer,
} from "../games.js";

test("all twenty levels are complete, unique, and reference valid worlds", () => {
  assert.equal(LEVELS.length, 20);
  assert.equal(new Set(LEVELS.map((level) => level.id)).size, 20);
  const worldIds = new Set(WORLDS.map((world) => world.id));
  for (const level of LEVELS) {
    assert.ok(worldIds.has(level.worldId));
    for (const key of ["id", "title", "prompt", "interaction", "answer", "hint", "explanation", "scene"]) {
      assert.notEqual(level[key], undefined, `${level.id} is missing ${key}`);
    }
  }
  for (const world of WORLDS) assert.equal(LEVELS.filter((level) => level.worldId === world.id).length, 5);
});

test("validates all three interaction types", () => {
  assert.equal(validateAnswer(LEVELS[0], "5"), true);
  assert.equal(validateAnswer(LEVELS[0], "5.1"), false);
  assert.equal(validateAnswer(LEVELS[3], "two-three"), true);
  assert.equal(validateAnswer(LEVELS[3], "one-six"), false);
  assert.equal(validateAnswer(LEVELS[11], { x: 3, y: 2 }), true);
  assert.equal(validateAnswer(LEVELS[11], { x: 2, y: 3 }), false);
});

test("awards three, two, then one star", () => {
  assert.equal(scoreForAttempt(1), 3);
  assert.equal(scoreForAttempt(2), 2);
  assert.equal(scoreForAttempt(3), 1);
  assert.equal(scoreForAttempt(20), 1);
});

test("unlocks levels only after their immediate prerequisite", () => {
  assert.equal(isLevelUnlocked(LEVELS[0].id, []), true);
  assert.equal(isLevelUnlocked(LEVELS[1].id, []), false);
  assert.equal(isLevelUnlocked(LEVELS[1].id, [LEVELS[0].id]), true);
  assert.equal(isLevelUnlocked(LEVELS[5].id, LEVELS.slice(0, 4).map((level) => level.id)), false);
  assert.equal(isLevelUnlocked(LEVELS[5].id, LEVELS.slice(0, 5).map((level) => level.id)), true);
  assert.equal(isLevelUnlocked("missing", []), false);
});

test("completion is idempotent and preserves the best star score", () => {
  let progress = completeLevel(createDefaultProgress(), LEVELS[0].id, 2);
  progress = completeLevel(progress, LEVELS[0].id, 1);
  assert.deepEqual(progress.completedLevelIds, [LEVELS[0].id]);
  assert.equal(progress.starsByLevel[LEVELS[0].id], 2);
  progress = completeLevel(progress, LEVELS[0].id, 3);
  assert.equal(progress.starsByLevel[LEVELS[0].id], 3);
});

test("recognizes full completion and totals stars", () => {
  let progress = createDefaultProgress();
  for (const level of LEVELS) progress = completeLevel(progress, level.id, 3);
  assert.equal(isGameComplete(progress), true);
  assert.equal(totalStars(progress), 60);
});

test("storage round trip works and unavailable storage fails safely", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const progress = completeLevel(createDefaultProgress(), LEVELS[0].id, 3);
  assert.equal(saveProgress(storage, progress), true);
  assert.equal(values.has(STORAGE_KEY), true);
  assert.deepEqual(loadProgress(storage), progress);
  assert.deepEqual(loadProgress({ getItem: () => { throw new Error("blocked"); } }), createDefaultProgress());
  assert.equal(saveProgress({ setItem: () => { throw new Error("full"); } }, progress), false);
});

test("corrupt and foreign progress data is normalized", () => {
  assert.deepEqual(loadProgress({ getItem: () => "not-json" }), createDefaultProgress());
  assert.deepEqual(normalizeProgress({ version: 99 }), createDefaultProgress());
  const cleaned = normalizeProgress({
    version: 1,
    completedLevelIds: [LEVELS[0].id, LEVELS[0].id, "unknown"],
    starsByLevel: { [LEVELS[0].id]: 3, [LEVELS[1].id]: 8, unknown: 2 },
    soundEnabled: false,
    reducedMotion: true,
  });
  assert.deepEqual(cleaned.completedLevelIds, [LEVELS[0].id]);
  assert.deepEqual(cleaned.starsByLevel, { [LEVELS[0].id]: 3 });
  assert.equal(cleaned.soundEnabled, false);
  assert.equal(cleaned.reducedMotion, true);
});
