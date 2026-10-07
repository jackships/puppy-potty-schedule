import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RULES, awakeIntervalMinutes, overnightIntervalMinutes, maxPottyInterval } from "../src/index.js";

test("data/rules.json mirrors RULES", () => {
  const json = JSON.parse(readFileSync(new URL("../data/rules.json", import.meta.url), "utf8"));
  assert.deepEqual(json, RULES);
});

test("overnight follows months + 1 hours, capped at 8h", () => {
  assert.equal(overnightIntervalMinutes(8), 170); // ~1.8 mo -> ~2.8 h
  assert.equal(overnightIntervalMinutes(12), 225);
  assert.equal(overnightIntervalMinutes(16), 280);
  assert.equal(overnightIntervalMinutes(52), 480);
  assert.equal(overnightIntervalMinutes(104), 480);
});

test("awake interval is about 30 min per month, clamped 45-180", () => {
  assert.equal(awakeIntervalMinutes(7), 50);
  assert.equal(awakeIntervalMinutes(8), 55);
  assert.equal(awakeIntervalMinutes(12), 85);
  assert.equal(awakeIntervalMinutes(30), 180);
});

test("awake interval never exceeds overnight interval and grows with age", () => {
  let prev = 0;
  for (let w = 7; w <= 104; w++) {
    const a = awakeIntervalMinutes(w);
    assert.ok(a <= overnightIntervalMinutes(w), `week ${w}`);
    assert.ok(a >= prev, `week ${w}`);
    prev = a;
  }
});

test("rejects unsupported ages", () => {
  assert.throws(() => awakeIntervalMinutes(3), RangeError);
  assert.throws(() => overnightIntervalMinutes(Number.NaN), RangeError);
  assert.throws(() => maxPottyInterval("10"), RangeError);
});

test("maxPottyInterval summarises both limits", () => {
  assert.deepEqual(maxPottyInterval(12), { ageWeeks: 12, ageMonths: 2.8, awakeMinutes: 85, overnightMinutes: 225 });
});
