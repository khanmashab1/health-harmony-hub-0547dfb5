import { Pill } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Medicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

interface MedicinesListProps {
  medicinesJson: string | null;
  compact?: boolean;
}

export function parseMedicines(medicinesJson: string | null): Medicine[] {
  if (!medicinesJson) return [];
  try {
    const parsed = JSON.parse(medicinesJson);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    // If it's not JSON, treat as plain text - return empty array
    return [];
  }
}

export function isMedicinesJson(medicinesJson: string | null): boolean {
  if (!medicinesJson) return false;
  try {
    const parsed = JSON.parse(medicinesJson);
    return Array.isArray(parsed);
  } catch {
    return false;
  }
}

export function MedicinesList({ medicinesJson, compact = false }: MedicinesListProps) {
  if (!medicinesJson) return null;

  const isJson = isMedicinesJson(medicinesJson);
  
  if (!isJson) {
    // Plain text - display as-is
    return (
      <p className="text-sm whitespace-pre-line">{medicinesJson}</p>
    );
  }

  const medicines = parseMedicines(medicinesJson);

  if (medicines.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {medicines.map((med, index) => (
          <Badge 
            key={index} 
            variant="secondary" 
            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
          >
            <Pill className="w-3 h-3 mr-1" />
            {med.name}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {medicines.map((med, index) => (
        <div 
          key={index} 
          className="p-3 rounded-lg bg-background border border-border/50 space-y-1"
        >
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-emerald-500" />
            <span className="font-medium text-sm">{med.name}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pl-6">
            {med.dosage && (
              <span><span className="font-medium text-foreground">Dosage:</span> {med.dosage}</span>
            )}
            {med.frequency && (
              <span><span className="font-medium text-foreground">Frequency:</span> {med.frequency}</span>
            )}
            {med.duration && (
              <span><span className="font-medium text-foreground">Duration:</span> {med.duration}</span>
            )}
          </div>
          {med.instructions && (
            <p className="text-xs text-muted-foreground pl-6 italic">
              {med.instructions}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
