// Rule-of-thumb numbers used by the scheduler. General puppy-training guidance,
// not veterinary advice. Mirrored in data/rules.json (a test keeps them equal).

export const RULES = {
  version: "1.0.0",
  weeksPerMonth: 4.345,
  overnight: {
    description: "Longest stretch a sleeping puppy can usually hold it: about (age in months + 1) hours, capped.",
    hoursPerMonth: 1,
    plusHours: 1,
    capHours: 8,
  },
  awake: {
    description: "Interval between breaks while awake and active: about 30 minutes per month of age, clamped.",
    minutesPerMonth: 30,
    minMinutes: 45,
    maxMinutes: 180,
  },
  triggers: {
    wake: { minutes: 10, label: "after waking up" },
    meal: { minutes: 25, label: "after eating" },
    drink: { minutes: 20, label: "after a big drink" },
    play: { minutes: 15, label: "after play" },
    crate: { minutes: 0, label: "out of the crate" },
  },
  bedtime: { label: "last break before bed" },
  mergeWithinMinutes: 20,
  supportedAgeWeeks: { min: 7, max: 104 },
};

const round5 = (n) => Math.round(n / 5) * 5;

function checkAge(ageWeeks) {
  const { min, max } = RULES.supportedAgeWeeks;
  if (typeof ageWeeks !== "number" || !Number.isFinite(ageWeeks) || ageWeeks < min || ageWeeks > max) {
    throw new RangeError(`ageWeeks must be a number between ${min} and ${max}`);
  }
  return ageWeeks / RULES.weeksPerMonth;
}

/** Max interval (minutes) between breaks while the puppy is awake. */
export function awakeIntervalMinutes(ageWeeks) {
  const months = checkAge(ageWeeks);
  const { minutesPerMonth, minMinutes, maxMinutes } = RULES.awake;
  return Math.min(maxMinutes, Math.max(minMinutes, round5(months * minutesPerMonth)));
}

/** Max interval (minutes) a sleeping puppy can usually hold it overnight. */
export function overnightIntervalMinutes(ageWeeks) {
  const months = checkAge(ageWeeks);
  const { hoursPerMonth, plusHours, capHours } = RULES.overnight;
  return round5(Math.min(months * hoursPerMonth + plusHours, capHours) * 60);
}

/** Both limits plus the "months + 1" figure, for display. */
export function maxPottyInterval(ageWeeks) {
  const months = checkAge(ageWeeks);
  return {
    ageWeeks,
    ageMonths: Math.round(months * 10) / 10,
    awakeMinutes: awakeIntervalMinutes(ageWeeks),
    overnightMinutes: overnightIntervalMinutes(ageWeeks),
  };
}
