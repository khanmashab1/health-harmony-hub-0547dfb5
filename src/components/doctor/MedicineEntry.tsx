import { useState, useEffect } from "react";
import { Plus, Trash2, Pill, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
  instructions?: string;
}

interface MedicineEntryProps {
  value: string;
  onChange: (value: string) => void;
}

const frequencyOptions = [
  { value: "once", label: "Once daily" },
  { value: "twice", label: "Twice daily" },
  { value: "thrice", label: "Three times daily" },
  { value: "four", label: "Four times daily" },
  { value: "sos", label: "As needed (SOS)" },
  { value: "custom", label: "Custom" },
];

const timingOptions = [
  { value: "before_meal", label: "Before meal" },
  { value: "after_meal", label: "After meal" },
  { value: "with_meal", label: "With meal" },
  { value: "empty_stomach", label: "Empty stomach" },
  { value: "bedtime", label: "At bedtime" },
  { value: "any", label: "Any time" },
];

const durationOptions = [
  { value: "3_days", label: "3 days" },
  { value: "5_days", label: "5 days" },
  { value: "7_days", label: "7 days (1 week)" },
  { value: "10_days", label: "10 days" },
  { value: "14_days", label: "14 days (2 weeks)" },
  { value: "30_days", label: "30 days (1 month)" },
  { value: "continuous", label: "Continuous" },
  { value: "custom", label: "Custom" },
];

const parseMedicines = (value: string): Medicine[] => {
  if (!value) return [];
  
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fall back to parsing text format
    if (!value.trim()) return [];
    const lines = value.split('\n').filter(l => l.trim());
    return lines.map(line => ({
      name: line,
      dosage: "",
      frequency: "twice",
      duration: "5_days",
      timing: "after_meal",
    }));
  }
  return [];
};

const formatMedicinesForDisplay = (medicines: Medicine[]): string => {
  return medicines.map(m => {
    const freq = frequencyOptions.find(f => f.value === m.frequency)?.label || m.frequency;
    const timing = timingOptions.find(t => t.value === m.timing)?.label || m.timing;
    const duration = durationOptions.find(d => d.value === m.duration)?.label || m.duration;
    
    let line = `${m.name}`;
    if (m.dosage) line += ` (${m.dosage})`;
    line += ` - ${freq}, ${timing}`;
    if (m.duration) line += ` for ${duration}`;
    if (m.instructions) line += ` | ${m.instructions}`;
    return line;
  }).join('\n');
};

export function MedicineEntry({ value, onChange }: MedicineEntryProps) {
  const [medicines, setMedicines] = useState<Medicine[]>(() => parseMedicines(value));

  useEffect(() => {
    // Store as JSON for proper parsing later, but keep text format for display
    const jsonStr = JSON.stringify(medicines);
    onChange(jsonStr);
  }, [medicines, onChange]);

  const addMedicine = () => {
    setMedicines([
      ...medicines,
      {
        name: "",
        dosage: "",
        frequency: "twice",
        duration: "5_days",
        timing: "after_meal",
      },
    ]);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: keyof Medicine, val: string) => {
    setMedicines(
      medicines.map((m, i) => (i === index ? { ...m, [field]: val } : m))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="font-semibold flex items-center gap-2">
          <Pill className="w-4 h-4 text-primary" />
          Medicines
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMedicine}
          className="h-8"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Medicine
        </Button>
      </div>

      {medicines.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-xl bg-muted/30">
          <Pill className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No medicines added</p>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={addMedicine}
            className="mt-2"
          >
            Add first medicine
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {medicines.map((medicine, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Medicine Name */}
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">
                      Medicine Name
                    </Label>
                    <Input
                      value={medicine.name}
                      onChange={(e) =>
                        updateMedicine(index, "name", e.target.value)
                      }
                      placeholder="e.g., Paracetamol 500mg"
                      className="mt-1 border-border/50"
                    />
                  </div>

                  {/* Dosage */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Dosage
                    </Label>
                    <Input
                      value={medicine.dosage}
                      onChange={(e) =>
                        updateMedicine(index, "dosage", e.target.value)
                      }
                      placeholder="e.g., 1 tablet"
                      className="mt-1 border-border/50"
                    />
                  </div>

                  {/* Frequency */}
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Frequency
                    </Label>
                    <Select
                      value={medicine.frequency}
                      onValueChange={(val) =>
                        updateMedicine(index, "frequency", val)
                      }
                    >
                      <SelectTrigger className="mt-1 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Timing */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Timing
                    </Label>
                    <Select
                      value={medicine.timing}
                      onValueChange={(val) =>
                        updateMedicine(index, "timing", val)
                      }
                    >
                      <SelectTrigger className="mt-1 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timingOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duration */}
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Duration
                    </Label>
                    <Select
                      value={medicine.duration}
                      onValueChange={(val) =>
                        updateMedicine(index, "duration", val)
                      }
                    >
                      <SelectTrigger className="mt-1 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {durationOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Special Instructions */}
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">
                      Special Instructions (optional)
                    </Label>
                    <Input
                      value={medicine.instructions || ""}
                      onChange={(e) =>
                        updateMedicine(index, "instructions", e.target.value)
                      }
                      placeholder="e.g., Take with warm water"
                      className="mt-1 border-border/50"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMedicine(index)}
                  className="text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to format medicines for display in prescription
export const formatMedicinesForPrescription = (value: string): Medicine[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Return empty if can't parse
    return [];
  }
  return [];
};

export const frequencyLabels: Record<string, string> = {
  once: "Once daily",
  twice: "Twice daily",
  thrice: "Three times daily",
  four: "Four times daily",
  sos: "As needed (SOS)",
  custom: "Custom",
};

export const timingLabels: Record<string, string> = {
  before_meal: "Before meal",
  after_meal: "After meal",
  with_meal: "With meal",
  empty_stomach: "Empty stomach",
  bedtime: "At bedtime",
  any: "Any time",
};

export const durationLabels: Record<string, string> = {
  "3_days": "3 days",
  "5_days": "5 days",
  "7_days": "1 week",
  "10_days": "10 days",
  "14_days": "2 weeks",
  "30_days": "1 month",
  continuous: "Continuous",
  custom: "Custom",
};
