import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a doctor image path, fixing any mismatched Supabase project URLs.
 */
export function resolveDoctorImage(imagePath: string | null | undefined): string | undefined {
  if (!imagePath) return undefined;
  // Fix URLs pointing to wrong Supabase instance
  return imagePath.replace('zfibmvdqnagcajgehqni', 'zikbiesawrowlkhvrbmz');
}

interface MedicineEntry {
  name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  timing?: string;
  instructions?: string;
}

/**
 * Formats a medicines JSON string into a human-readable text.
 * Handles both JSON arrays and plain text gracefully.
 */
export function formatMedicinesText(medicines: string | null): string {
  if (!medicines) return "";

  try {
    const parsed = JSON.parse(medicines);
    if (Array.isArray(parsed)) {
      return parsed
        .map((med: MedicineEntry, index: number) => {
          const parts: string[] = [];
          if (med.name) parts.push(med.name);
          if (med.dosage) parts.push(med.dosage);
          if (med.frequency) parts.push(med.frequency.replace(/_/g, " "));
          if (med.duration) parts.push(`for ${med.duration.replace(/_/g, " ")}`);
          if (med.timing) parts.push(`(${med.timing.replace(/_/g, " ")})`);
          if (med.instructions) parts.push(`- ${med.instructions}`);
          return `${index + 1}. ${parts.join(" • ")}`;
        })
        .join("\n");
    }
    // If parsed but not an array, return as-is
    return medicines;
  } catch {
    // Not JSON, return as plain text
    return medicines;
  }
}
