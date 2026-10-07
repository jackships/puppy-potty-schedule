#!/usr/bin/env node
// Usage: node examples/cli.js <ageWeeks> [wake] [bed] [meal,meal,...]
// e.g.   node examples/cli.js 10 06:30 22:00 07:00,12:00,17:00
import { buildDaySchedule, maxPottyInterval } from "../src/index.js";

const [ageArg = "10", wake = "07:00", bed = "22:00", mealsArg = "07:30,12:30,17:30"] = process.argv.slice(2);
const ageWeeks = Number(ageArg);
const meals = mealsArg.split(",").filter(Boolean);

try {
  const limits = maxPottyInterval(ageWeeks);
  console.log(`Puppy age: ${ageWeeks} weeks (~${limits.ageMonths} months)`);
  console.log(`Awake: a break about every ${limits.awakeMinutes} min | Overnight: up to ~${limits.overnightMinutes} min\n`);
  for (const b of buildDaySchedule({ ageWeeks, wake, bed, meals })) {
    console.log(`${b.time}  ${b.overnight ? "[night] " : ""}${b.reason}`);
  }
  console.log("\nGeneral guidance only, not veterinary advice. Watch your own puppy's signals.");
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
