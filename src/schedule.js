import { RULES, awakeIntervalMinutes, overnightIntervalMinutes } from "./rules.js";

const DAY = 1440;

/** "07:30" -> 450 */
export function parseClock(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) {
    throw new TypeError(`expected a 24h "HH:MM" time, got ${JSON.stringify(value)}`);
  }
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 450 -> "07:30" (wraps past midnight) */
export function formatClock(minutes) {
  const m = ((Math.round(minutes) % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

const round5 = (n) => Math.round(n / 5) * 5;

/**
 * Build one day of potty breaks, from wake-up through the night.
 * @param {{ageWeeks:number, wake:string, bed:string, meals?:string[], play?:string[]}} opts
 */
export function buildDaySchedule({ ageWeeks, wake, bed, meals = [], play = [] }) {
  const awake = awakeIntervalMinutes(ageWeeks);
  const night = overnightIntervalMinutes(ageWeeks);
  const wakeAt = parseClock(wake);
  // Work in "minutes since wake-up" so days that cross midnight still sort.
  const rel = (clock) => (parseClock(clock) - wakeAt + DAY) % DAY;
  const bedRel = rel(bed);
  if (bedRel === 0) throw new RangeError("wake and bed must differ");

  const t = RULES.triggers;
  // The morning break is immediate: the puppy has been holding it all night.
  let breaks = [{ at: 0, kinds: ["wake"], reasons: ["first thing after waking"] }];
  const addTrigger = (clock, kind) => {
    const at = rel(clock) + t[kind].minutes;
    if (at < bedRel) breaks.push({ at, kinds: [kind], reasons: [`${t[kind].label} (${clock})`] });
  };
  meals.forEach((c) => addTrigger(c, "meal"));
  play.forEach((c) => addTrigger(c, "play"));
  breaks.push({ at: bedRel, kinds: ["bedtime"], reasons: [RULES.bedtime.label] });
  breaks.sort((a, b) => a.at - b.at);

  // Merge breaks that land close together; the earlier time wins, except bedtime.
  const merged = [];
  for (const b of breaks) {
    const prev = merged[merged.length - 1];
    if (prev && b.at - prev.at <= RULES.mergeWithinMinutes) {
      if (b.kinds.includes("bedtime")) prev.at = b.at;
      prev.kinds.push(...b.kinds);
      prev.reasons.push(...b.reasons);
    } else merged.push({ ...b, kinds: [...b.kinds], reasons: [...b.reasons] });
  }

  // Fill any awake gap longer than the age-based interval, evenly spaced.
  const day = [];
  merged.forEach((b, i) => {
    day.push(b);
    const next = merged[i + 1];
    if (!next) return;
    const gap = next.at - b.at;
    const extra = Math.ceil(gap / awake) - 1;
    for (let k = 1; k <= extra; k++) {
      day.push({ at: round5(b.at + (gap * k) / (extra + 1)), kinds: ["interval"], reasons: [`awake interval (~${awake} min at ${ageWeeks} weeks)`] });
    }
  });

  // Overnight: only wake the puppy if the night is longer than it can hold.
  const nightLen = DAY - bedRel;
  const nightBreaks = Math.ceil(nightLen / night) - 1;
  for (let k = 1; k <= nightBreaks; k++) {
    day.push({ at: round5(bedRel + (nightLen * k) / (nightBreaks + 1)), kinds: ["overnight"], reasons: [`overnight limit (~${night} min at ${ageWeeks} weeks)`], overnight: true });
  }

  return day.map((b) => ({
    time: formatClock(wakeAt + b.at),
    kinds: b.kinds,
    reason: b.reasons.join("; "),
    overnight: Boolean(b.overnight),
  }));
}

function toMs(value, name) {
  const ms = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(ms)) throw new TypeError(`${name} must be a Date, epoch ms or ISO string`);
  return ms;
}

/**
 * Suggest the next potty break from the last one and what happened since.
 * @param {{ageWeeks:number, lastPotty?:Date|string|number|null,
 *          events?:{type:"wake"|"meal"|"drink"|"play"|"crate", at:Date|string|number}[],
 *          now?:Date|string|number, asleep?:boolean}} opts
 */
export function nextPotty({ ageWeeks, lastPotty, events = [], now, asleep = false }) {
  const nowMs = now === undefined ? Date.now() : toMs(now, "now");
  const awake = awakeIntervalMinutes(ageWeeks);
  const night = overnightIntervalMinutes(ageWeeks);
  if (lastPotty == null) {
    return { at: new Date(nowMs), kind: "unknown", reason: "no potty break logged yet: go out now", minutesFromNow: 0, overdue: false };
  }
  const last = toMs(lastPotty, "lastPotty");
  const limit = asleep ? night : awake;
  const candidates = [{
    at: last + limit * 60000,
    kind: asleep ? "overnight" : "interval",
    reason: `${asleep ? "overnight" : "awake"} limit: ~${limit} min since the last break at ${ageWeeks} weeks`,
  }];
  for (const e of events) {
    const rule = RULES.triggers[e.type];
    if (!rule) throw new TypeError(`unknown event type ${JSON.stringify(e.type)}`);
    const at = toMs(e.at, "event.at");
    if (at <= last) continue; // already answered by the last break
    candidates.push({ at: at + rule.minutes * 60000, kind: e.type, reason: `${rule.label}: usually within ~${rule.minutes} min` });
  }
  const best = candidates.reduce((a, b) => (b.at < a.at ? b : a));
  const minutesFromNow = Math.round((best.at - nowMs) / 60000);
  return { at: new Date(best.at), kind: best.kind, reason: best.reason, minutesFromNow, overdue: minutesFromNow < 0 };
}
