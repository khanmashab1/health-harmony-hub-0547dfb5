import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pill, Clock, Calendar, Search, X } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

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
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
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

export function MedicineEntry({ value, onChange }: MedicineEntryProps) {
  const [medicines, setMedicines] = useState<Medicine[]>(() => parseMedicines(value));
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Fetch medicines from database
  const { data: medicinesList } = useQuery({
    queryKey: ["medicines-catalog", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .or(`name.ilike.%${searchTerm}%,generic_name.ilike.%${searchTerm}%`)
        .eq("is_active", true)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 2,
  });

  useEffect(() => {
    const jsonStr = JSON.stringify(medicines);
    onChange(jsonStr);
  }, [medicines, onChange]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setActiveIndex(medicines.length);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
    if (activeIndex === index) {
      setActiveIndex(null);
      setSearchTerm("");
    }
  };

  const updateMedicine = (index: number, field: keyof Medicine, val: string) => {
    setMedicines(
      medicines.map((m, i) => (i === index ? { ...m, [field]: val } : m))
    );
    if (field === "name") {
      setSearchTerm(val);
      setActiveIndex(index);
      setShowSuggestions(true);
    }
  };

  const selectMedicine = (index: number, medicineName: string, form?: string) => {
    const dosageHint = form ? `1 ${form.toLowerCase()}` : "";
    setMedicines(
      medicines.map((m, i) => (i === index ? { ...m, name: medicineName, dosage: dosageHint || m.dosage } : m))
    );
    setShowSuggestions(false);
    setSearchTerm("");
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
                  {/* Medicine Name with Autocomplete */}
                  <div className="sm:col-span-2 relative" ref={activeIndex === index ? suggestionRef : null}>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Search className="w-3 h-3" />
                      Medicine Name (type to search)
                    </Label>
                    <Input
                      value={medicine.name}
                      onChange={(e) => updateMedicine(index, "name", e.target.value)}
                      onFocus={() => {
                        setActiveIndex(index);
                        if (medicine.name.length >= 2) setShowSuggestions(true);
                      }}
                      placeholder="e.g., Paracetamol 500mg"
                      className="mt-1 border-border/50"
                    />
                    
                    {/* Autocomplete Suggestions */}
                    {showSuggestions && activeIndex === index && medicinesList && medicinesList.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                        {medicinesList.map((med) => (
                          <button
                            key={med.id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between gap-2 text-sm"
                            onClick={() => selectMedicine(index, med.name, med.form || undefined)}
                          >
                            <div>
                              <p className="font-medium">{med.name}</p>
                              {med.generic_name && (
                                <p className="text-xs text-muted-foreground">{med.generic_name}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {med.category && (
                                <Badge variant="outline" className="text-xs">{med.category}</Badge>
                              )}
                              {med.form && (
                                <Badge variant="secondary" className="text-xs">{med.form}</Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dosage */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Dosage</Label>
                    <Input
                      value={medicine.dosage}
                      onChange={(e) => updateMedicine(index, "dosage", e.target.value)}
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
                      onValueChange={(val) => updateMedicine(index, "frequency", val)}
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
                    <Label className="text-xs text-muted-foreground">Timing</Label>
                    <Select
                      value={medicine.timing}
                      onValueChange={(val) => updateMedicine(index, "timing", val)}
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
                      onValueChange={(val) => updateMedicine(index, "duration", val)}
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
                      onChange={(e) => updateMedicine(index, "instructions", e.target.value)}
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
