import { useState, useEffect } from "react";
import { Clock, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScheduleSettingsCardProps {
  userId: string | undefined;
  consultationDuration: number | null | undefined;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export function ScheduleSettingsCard({ userId, consultationDuration }: ScheduleSettingsCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState(consultationDuration?.toString() || "15");
  const [schedules, setSchedules] = useState<DaySchedule[]>(
    DAYS_OF_WEEK.map((day) => ({
      day_of_week: day.value,
      start_time: "09:00",
      end_time: "17:00",
      is_available: day.value !== 0 && day.value !== 6, // Weekdays default available
    }))
  );

  // Fetch existing schedules
  const { data: existingSchedules, isLoading } = useQuery({
    queryKey: ["doctor-schedules", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("doctor_schedules")
        .select("*")
        .eq("doctor_user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Update schedules state when data loads
  useEffect(() => {
    if (existingSchedules && existingSchedules.length > 0) {
      const updatedSchedules = DAYS_OF_WEEK.map((day) => {
        const existing = existingSchedules.find((s) => s.day_of_week === day.value);
        if (existing) {
          return {
            day_of_week: existing.day_of_week,
            start_time: existing.start_time?.slice(0, 5) || "09:00",
            end_time: existing.end_time?.slice(0, 5) || "17:00",
            is_available: existing.is_available ?? true,
          };
        }
        return {
          day_of_week: day.value,
          start_time: "09:00",
          end_time: "17:00",
          is_available: day.value !== 0 && day.value !== 6,
        };
      });
      setSchedules(updatedSchedules);
    }
  }, [existingSchedules]);

  useEffect(() => {
    if (consultationDuration) {
      setDuration(consultationDuration.toString());
    }
  }, [consultationDuration]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not found");

      // Update consultation duration in doctors table
      const { error: durationError } = await supabase
        .from("doctors")
        .update({ consultation_duration: parseInt(duration) || 15 })
        .eq("user_id", userId);

      if (durationError) throw durationError;

      // Upsert schedules
      for (const schedule of schedules) {
        const { error } = await supabase
          .from("doctor_schedules")
          .upsert(
            {
              doctor_user_id: userId,
              day_of_week: schedule.day_of_week,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              is_available: schedule.is_available,
            },
            { onConflict: "doctor_user_id,day_of_week" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-info"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-schedules"] });
      toast({ title: "Schedule settings saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save schedule", description: error.message, variant: "destructive" });
    },
  });

  const updateSchedule = (dayIndex: number, field: keyof DaySchedule, value: string | boolean) => {
    setSchedules((prev) =>
      prev.map((s, i) => (i === dayIndex ? { ...s, [field]: value } : s))
    );
  };

  if (isLoading) {
    return (
      <Card variant="glass" className="border-white/50">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="border-white/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-500" />
          Schedule & Timing
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Consultation Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration" className="font-medium">
            Consultation Duration (minutes per patient)
          </Label>
          <Input
            id="duration"
            type="number"
            min="5"
            max="120"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="max-w-[200px]"
            placeholder="15"
          />
          <p className="text-xs text-muted-foreground">
            This helps calculate estimated appointment times for patients
          </p>
        </div>

        {/* Day-wise Schedule */}
        <div className="space-y-4">
          <Label className="font-medium text-base">Weekly Schedule</Label>
          <div className="space-y-3">
            {schedules.map((schedule, index) => (
              <div
                key={schedule.day_of_week}
                className={`flex flex-wrap items-center gap-4 p-3 rounded-lg border transition-colors ${
                  schedule.is_available
                    ? "bg-card border-border/50"
                    : "bg-muted/30 border-border/20 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 min-w-[140px]">
                  <Switch
                    checked={schedule.is_available}
                    onCheckedChange={(checked) => updateSchedule(index, "is_available", checked)}
                  />
                  <span className="font-medium text-sm">
                    {DAYS_OF_WEEK.find((d) => d.value === schedule.day_of_week)?.label}
                  </span>
                </div>

                {schedule.is_available && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Start:</Label>
                      <Input
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) => updateSchedule(index, "start_time", e.target.value)}
                        className="w-[120px] h-8 text-sm"
                      />
                    </div>
                    <span className="text-muted-foreground">to</span>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">End:</Label>
                      <Input
                        type="time"
                        value={schedule.end_time}
                        onChange={(e) => updateSchedule(index, "end_time", e.target.value)}
                        className="w-[120px] h-8 text-sm"
                      />
                    </div>
                  </div>
                )}

                {!schedule.is_available && (
                  <span className="text-sm text-muted-foreground italic">Not available</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          variant="hero"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Schedule
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
