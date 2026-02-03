/**
 * Utility to calculate estimated appointment time based on token number,
 * doctor's schedule, consultation duration, and break times.
 */

interface DoctorSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface DoctorBreak {
  break_name: string;
  start_time: string;
  end_time: string;
  applies_to_days: number[];
  is_active: boolean;
}

/**
 * Parse time string (HH:MM or HH:MM:SS) to minutes from midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to formatted time string (12-hour format)
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${mins.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Calculate total break duration in minutes for a given day
 * that falls within working hours
 */
function calculateBreakDuration(
  breaks: DoctorBreak[],
  dayOfWeek: number,
  workStartMinutes: number,
  workEndMinutes: number
): number {
  let totalBreakMinutes = 0;

  for (const brk of breaks) {
    if (!brk.is_active) continue;
    if (!brk.applies_to_days.includes(dayOfWeek)) continue;

    const breakStart = parseTimeToMinutes(brk.start_time);
    const breakEnd = parseTimeToMinutes(brk.end_time);

    // Only count break time that falls within working hours
    const effectiveStart = Math.max(breakStart, workStartMinutes);
    const effectiveEnd = Math.min(breakEnd, workEndMinutes);

    if (effectiveEnd > effectiveStart) {
      totalBreakMinutes += effectiveEnd - effectiveStart;
    }
  }

  return totalBreakMinutes;
}

/**
 * Calculate the estimated appointment time for a given token number
 */
export function calculateEstimatedAppointmentTime(
  tokenNumber: number,
  schedule: DoctorSchedule | null,
  breaks: DoctorBreak[],
  consultationDuration: number,
  appointmentDate: Date
): string | null {
  if (!schedule || !schedule.is_available) {
    return null;
  }

  const dayOfWeek = appointmentDate.getDay();
  const workStartMinutes = parseTimeToMinutes(schedule.start_time);
  const workEndMinutes = parseTimeToMinutes(schedule.end_time);

  // Get breaks for this day sorted by start time
  const dayBreaks = breaks
    .filter((b) => b.is_active && b.applies_to_days.includes(dayOfWeek))
    .map((b) => ({
      start: parseTimeToMinutes(b.start_time),
      end: parseTimeToMinutes(b.end_time),
    }))
    .sort((a, b) => a.start - b.start);

  // Calculate appointment start time accounting for previous appointments and breaks
  let currentTime = workStartMinutes;
  let appointmentsScheduled = 0;

  while (appointmentsScheduled < tokenNumber - 1) {
    // Check if we hit a break
    let skippedBreak = false;
    for (const brk of dayBreaks) {
      if (currentTime >= brk.start && currentTime < brk.end) {
        // We're in a break, skip to end of break
        currentTime = brk.end;
        skippedBreak = true;
        break;
      }
      if (currentTime < brk.start && currentTime + consultationDuration > brk.start) {
        // Appointment would overlap with break, skip to end of break
        currentTime = brk.end;
        skippedBreak = true;
        break;
      }
    }

    if (!skippedBreak) {
      // Schedule an appointment
      currentTime += consultationDuration;
      appointmentsScheduled++;
    }

    // Safety check - don't go past work hours
    if (currentTime >= workEndMinutes) {
      return "End of day";
    }
  }

  // Now currentTime is where our appointment should start
  // But first check if it falls in a break
  for (const brk of dayBreaks) {
    if (currentTime >= brk.start && currentTime < brk.end) {
      currentTime = brk.end;
    }
  }

  if (currentTime >= workEndMinutes) {
    return "End of day";
  }

  return formatMinutesToTime(currentTime);
}

/**
 * Simple estimation without breaks (fallback)
 */
export function calculateSimpleEstimatedTime(
  tokenNumber: number,
  startTime: string,
  consultationDuration: number
): string {
  const startMinutes = parseTimeToMinutes(startTime);
  const appointmentMinutes = startMinutes + (tokenNumber - 1) * consultationDuration;
  return formatMinutesToTime(appointmentMinutes);
}
