export type TriggerType = "wake" | "meal" | "drink" | "play" | "crate";
export type TimeInput = Date | string | number;

export declare const RULES: {
  version: string;
  weeksPerMonth: number;
  overnight: { description: string; hoursPerMonth: number; plusHours: number; capHours: number };
  awake: { description: string; minutesPerMonth: number; minMinutes: number; maxMinutes: number };
  triggers: Record<TriggerType, { minutes: number; label: string }>;
  bedtime: { label: string };
  mergeWithinMinutes: number;
  supportedAgeWeeks: { min: number; max: number };
};

export declare function awakeIntervalMinutes(ageWeeks: number): number;
export declare function overnightIntervalMinutes(ageWeeks: number): number;
export declare function maxPottyInterval(ageWeeks: number): {
  ageWeeks: number; ageMonths: number; awakeMinutes: number; overnightMinutes: number;
};

export interface PottyBreak {
  time: string; // "HH:MM", 24h
  kinds: Array<TriggerType | "bedtime" | "interval" | "overnight">;
  reason: string;
  overnight: boolean;
}
export declare function buildDaySchedule(opts: {
  ageWeeks: number; wake: string; bed: string; meals?: string[]; play?: string[];
}): PottyBreak[];

export interface NextPotty {
  at: Date;
  kind: TriggerType | "interval" | "overnight" | "unknown";
  reason: string;
  minutesFromNow: number;
  overdue: boolean;
}
export declare function nextPotty(opts: {
  ageWeeks: number;
  lastPotty?: TimeInput | null;
  events?: Array<{ type: TriggerType; at: TimeInput }>;
  now?: TimeInput;
  asleep?: boolean;
}): NextPotty;

export declare function parseClock(value: string): number;
export declare function formatClock(minutes: number): string;
