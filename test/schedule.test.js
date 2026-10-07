import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDaySchedule, nextPotty, parseClock, formatClock, awakeIntervalMinutes, overnightIntervalMinutes } from "../src/index.js";

const base = { wake: "07:00", bed: "22:00", meals: ["07:30", "12:30", "17:30"] };
const toRel = (t, wake = "07:00") => (parseClock(t) - parseClock(wake) + 1440) % 1440;

test("clock helpers round-trip and validate", () => {
  assert.equal(parseClock("07:30"), 450);
  assert.equal(formatClock(450), "07:30");
  assert.equal(formatClock(1440 + 30), "00:30");
  assert.throws(() => parseClock("25:00"), TypeError);
  assert.throws(() => parseClock("7am"), TypeError);
});

test("day schedule starts at wake, includes meals and bedtime", () => {
  const s = buildDaySchedule({ ageWeeks: 10, ...base });
  assert.equal(s[0].time, "07:00");
  assert.ok(s[0].kinds.includes("wake"));
  for (const t of ["07:55", "12:55", "17:55"]) {
    const b = s.find((x) => x.time === t);
    assert.ok(b && b.kinds.includes("meal"), `meal break at ${t}`);
  }
  assert.ok(s.some((b) => b.time === "22:00" && b.kinds.includes("bedtime")));
});

test("no awake gap exceeds the age interval; night gaps respect overnight limit", () => {
  for (const ageWeeks of [8, 10, 12, 16, 24, 40]) {
    const s = buildDaySchedule({ ageWeeks, ...base });
    const rel = s.map((b) => toRel(b.time));
    for (let i = 1; i < rel.length; i++) assert.ok(rel[i] > rel[i - 1], `sorted at ${ageWeeks}w`);
    const day = s.filter((b) => !b.overnight).map((b) => toRel(b.time));
    for (let i = 1; i < day.length; i++) {
      assert.ok(day[i] - day[i - 1] <= awakeIntervalMinutes(ageWeeks) + 2, `awake gap at ${ageWeeks}w`);
    }
    const night = [toRel("22:00"), ...s.filter((b) => b.overnight).map((b) => toRel(b.time)), 1440];
    for (let i = 1; i < night.length; i++) {
      assert.ok(night[i] - night[i - 1] <= overnightIntervalMinutes(ageWeeks) + 2, `night gap at ${ageWeeks}w`);
    }
  }
});

test("young puppies get night breaks, older ones sleep through", () => {
  assert.ok(buildDaySchedule({ ageWeeks: 8, ...base }).some((b) => b.overnight));
  assert.ok(!buildDaySchedule({ ageWeeks: 40, ...base, bed: "23:00" }).some((b) => b.overnight));
});

test("close triggers merge into one break", () => {
  const s = buildDaySchedule({ ageWeeks: 12, wake: "07:00", bed: "22:00", meals: ["12:00"], play: ["12:15"] });
  const b = s.find((x) => x.kinds.includes("meal"));
  assert.ok(b.kinds.includes("play"));
  assert.equal(b.time, "12:25");
});

test("handles a schedule that crosses midnight", () => {
  const s = buildDaySchedule({ ageWeeks: 16, wake: "10:00", bed: "01:00", meals: ["10:30", "18:00"] });
  assert.equal(s[0].time, "10:00");
  assert.ok(s.some((b) => b.time === "01:00" && b.kinds.includes("bedtime")));
});

const T = (hm) => new Date(`2026-10-07T${hm}:00Z`);

test("nextPotty falls back to the awake interval", () => {
  const r = nextPotty({ ageWeeks: 12, lastPotty: T("09:00"), now: T("09:30") });
  assert.equal(r.kind, "interval");
  assert.equal(r.at.toISOString(), T("10:25").toISOString());
  assert.equal(r.minutesFromNow, 55);
});

test("nextPotty picks the earliest trigger after the last break", () => {
  const r = nextPotty({
    ageWeeks: 12,
    lastPotty: T("09:00"),
    events: [{ type: "meal", at: T("09:20") }, { type: "play", at: "2026-10-07T09:40:00Z" }, { type: "wake", at: T("08:30") }],
    now: T("09:45"),
  });
  assert.equal(r.kind, "meal");
  assert.equal(r.at.toISOString(), T("09:45").toISOString());
  assert.equal(r.overdue, false);
});

test("nextPotty uses the overnight limit when asleep and flags overdue", () => {
  const r = nextPotty({ ageWeeks: 8, lastPotty: T("00:00"), asleep: true, now: T("03:00") });
  assert.equal(r.kind, "overnight");
  assert.equal(r.at.toISOString(), T("02:50").toISOString());
  assert.equal(r.overdue, true);
});

test("nextPotty with no record says go now; rejects bad input", () => {
  assert.equal(nextPotty({ ageWeeks: 10, now: T("08:00") }).kind, "unknown");
  assert.throws(() => nextPotty({ ageWeeks: 10, lastPotty: "nope" }), TypeError);
  assert.throws(() => nextPotty({ ageWeeks: 10, lastPotty: T("08:00"), events: [{ type: "bath", at: T("08:10") }] }), TypeError);
});
