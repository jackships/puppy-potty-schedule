# puppy-potty-schedule

A tiny, dependency-free JavaScript library (ESM, with TypeScript types) for puppy potty timing:

- **`maxPottyInterval(ageWeeks)`**: rule-of-thumb limits by age, awake vs. overnight.
- **`buildDaySchedule(...)`**: an ordered list of potty breaks for a day, each with a reason.
- **`nextPotty(...)`**: when the next break is probably due, given the last one and what happened since.

It works in Node 18+ and modern browsers. The rules are also published as plain JSON in [`data/rules.json`](data/rules.json), so you can use them from other languages.

> **This is general guidance, not veterinary advice.** Every puppy is different. Frequent accidents, straining, very frequent urination or a sudden change in habits are reasons to talk to a vet.

## Install

Not published to npm. Clone it, or copy `src/` into your project:

```sh
git clone https://github.com/jackships/puppy-potty-schedule.git
cd puppy-potty-schedule
npm test
node examples/cli.js 10 07:00 22:00 07:30,12:30,17:30
```

## Usage

```js
import { maxPottyInterval, buildDaySchedule, nextPotty } from "./src/index.js";

maxPottyInterval(12);
// { ageWeeks: 12, ageMonths: 2.8, awakeMinutes: 85, overnightMinutes: 225 }

buildDaySchedule({ ageWeeks: 12, wake: "07:00", bed: "22:00", meals: ["07:30", "12:30", "17:30"] });
// [
//   { time: "07:00", kinds: ["wake"], reason: "first thing after waking", overnight: false },
//   { time: "07:55", kinds: ["meal"], reason: "after eating (07:30)", overnight: false },
//   { time: "09:10", kinds: ["interval"], reason: "awake interval (~85 min at 12 weeks)", overnight: false },
//   ...
//   { time: "22:00", kinds: ["bedtime"], reason: "last break before bed", overnight: false },
//   { time: "01:00", kinds: ["overnight"], reason: "overnight limit (~225 min at 12 weeks)", overnight: true },
//   ...
// ]

nextPotty({
  ageWeeks: 12,
  lastPotty: "2026-10-07T09:00:00Z",
  events: [{ type: "meal", at: "2026-10-07T09:20:00Z" }],
  now: "2026-10-07T09:30:00Z",
});
// { at: 2026-10-07T09:45:00.000Z, kind: "meal",
//   reason: "after eating: usually within ~25 min", minutesFromNow: 15, overdue: false }
```

`buildDaySchedule` options: `ageWeeks`, `wake` and `bed` (24h `"HH:MM"`), and optional `meals` and `play` time lists. Days that cross midnight are fine.

`nextPotty` options: `ageWeeks`, `lastPotty` (Date, epoch ms or ISO string; omit it and the answer is "go now"), `events` (`wake`, `meal`, `drink`, `play`, `crate`), `now`, and `asleep: true` to use the overnight limit. The earliest candidate wins. Events at or before the last break are ignored, since that break already covered them.

## The rules

| Age (weeks) | Age (months) | Awake: break about every | Overnight: can usually hold up to |
|---|---|---|---|
| 8 | ~1.8 | 55 min | 2.8 h |
| 10 | ~2.3 | 70 min | 3.3 h |
| 12 | ~2.8 | 85 min | 3.8 h |
| 16 | ~3.7 | 110 min | 4.7 h |
| 20 | ~4.6 | 140 min | 5.6 h |
| 24 | ~5.5 | 165 min | 6.5 h |
| 32+ | ~7.4+ | 180 min | 8 h (cap) |

- **Overnight:** the familiar "age in months + 1 = hours" rule of thumb, capped at 8 hours. It describes a resting puppy. It is a ceiling, not a target.
- **Awake:** active puppies need to go far more often than the overnight figure suggests. The library uses about 30 minutes per month of age, kept between 45 and 180 minutes. That matches the common advice of roughly hourly breaks at 8 weeks.
- **Triggers:** after waking (about 10 min; the morning break is immediate), after eating (about 15 to 30 min, 25 used here), after a big drink (about 20 min), after play (about 15 min), straight out of the crate, and a last break right before bed.

These figures are the general guidance repeated across common puppy-training references (house-training guides, trainer and shelter handouts). They are population averages, not measurements of your dog. Once you know your own puppy's pattern, trust that over this table. Every number lives in `RULES` / `data/rules.json`, so you can tune it.

## Disclaimer

This software gives generic, rule-of-thumb estimates for house-training. It is not veterinary or behavioral advice. It does not diagnose anything and it does not replace a vet or a qualified trainer. Use your judgment, and watch your puppy's signals (sniffing, circling, heading for the door).

## License

[MIT](LICENSE) © 2026 Jack Ships

---

Made by Jack, who also builds [Puppy Routine](https://puppyroutine.app/puppy-potty-schedule/), an iOS app that learns your puppy's own potty timing ([App Store](https://apps.apple.com/app/id6809403926)).
