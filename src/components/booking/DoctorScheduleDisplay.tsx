import { Clock, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface DoctorScheduleDisplayProps {
  doctorId: string;
  consultationDuration?: number | null;
  compact?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun", fullLabel: "Sunday" },
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
];

export function DoctorScheduleDisplay({ doctorId, consultationDuration, compact = false }: DoctorScheduleDisplayProps) {
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["doctor-schedules", doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_schedules")
        .select("*")
        .eq("doctor_user_id", doctorId)
        .order("day_of_week", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!doctorId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-1">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-10" />
          ))}
        </div>
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return null;
  }

  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // Create a map for quick lookup
  const scheduleMap = new Map(
    schedules.map((s) => [s.day_of_week, s])
  );

  if (compact) {
    // Compact view - just show available days as pills
    const availableDays = DAYS_OF_WEEK.filter((day) => {
      const schedule = scheduleMap.get(day.value);
      return schedule?.is_available;
    });

    if (availableDays.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <Calendar className="w-3 h-3 text-muted-foreground" />
        {availableDays.map((day) => {
          const schedule = scheduleMap.get(day.value);
          return (
            <span
              key={day.value}
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium"
              title={schedule ? `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}` : ""}
            >
              {day.label}
            </span>
          );
        })}
      </div>
    );
  }

  // Full view with times
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="w-4 h-4 text-primary" />
        <span>Weekly Schedule</span>
        {consultationDuration && (
          <span className="text-xs text-muted-foreground">
            (~{consultationDuration} min/patient)
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((day) => {
          const schedule = scheduleMap.get(day.value);
          const isAvailable = schedule?.is_available;
          
          return (
            <div
              key={day.value}
              className={`p-2 rounded-lg text-center text-xs transition-colors ${
                isAvailable
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted/50 text-muted-foreground opacity-50"
              }`}
            >
              <p className={`font-semibold ${isAvailable ? "text-primary" : ""}`}>
                {day.label}
              </p>
              {isAvailable && schedule && (
                <div className="mt-1 text-[10px] leading-tight">
                  <p>{formatTime(schedule.start_time)}</p>
                  <p className="text-muted-foreground">to</p>
                  <p>{formatTime(schedule.end_time)}</p>
                </div>
              )}
              {!isAvailable && (
                <p className="mt-1 text-[10px]">Off</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
