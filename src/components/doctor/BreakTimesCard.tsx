import { useState, useEffect } from "react";
import { Coffee, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BreakTimesCardProps {
  userId: string | undefined;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

interface BreakTime {
  id?: string;
  break_name: string;
  start_time: string;
  end_time: string;
  applies_to_days: number[];
  is_active: boolean;
}

const DEFAULT_BREAKS: BreakTime[] = [
  {
    break_name: "Lunch Break",
    start_time: "13:00",
    end_time: "14:00",
    applies_to_days: [1, 2, 3, 4, 5],
    is_active: true,
  },
];

export function BreakTimesCard({ userId }: BreakTimesCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [breaks, setBreaks] = useState<BreakTime[]>([]);

  // Fetch existing breaks
  const { data: existingBreaks, isLoading } = useQuery({
    queryKey: ["doctor-breaks", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("doctor_breaks")
        .select("*")
        .eq("doctor_user_id", userId)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Update breaks state when data loads
  useEffect(() => {
    if (existingBreaks && existingBreaks.length > 0) {
      setBreaks(
        existingBreaks.map((b) => ({
          id: b.id,
          break_name: b.break_name,
          start_time: b.start_time?.slice(0, 5) || "13:00",
          end_time: b.end_time?.slice(0, 5) || "14:00",
          applies_to_days: b.applies_to_days || [1, 2, 3, 4, 5],
          is_active: b.is_active ?? true,
        }))
      );
    } else if (existingBreaks && existingBreaks.length === 0) {
      setBreaks(DEFAULT_BREAKS);
    }
  }, [existingBreaks]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not found");

      // Delete existing breaks and insert new ones
      await supabase
        .from("doctor_breaks")
        .delete()
        .eq("doctor_user_id", userId);

      if (breaks.length > 0) {
        const { error } = await supabase.from("doctor_breaks").insert(
          breaks.map((b) => ({
            doctor_user_id: userId,
            break_name: b.break_name,
            start_time: b.start_time,
            end_time: b.end_time,
            applies_to_days: b.applies_to_days,
            is_active: b.is_active,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-breaks"] });
      toast({ title: "Break times saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save breaks", description: error.message, variant: "destructive" });
    },
  });

  const addBreak = () => {
    setBreaks((prev) => [
      ...prev,
      {
        break_name: "New Break",
        start_time: "12:00",
        end_time: "12:30",
        applies_to_days: [1, 2, 3, 4, 5],
        is_active: true,
      },
    ]);
  };

  const removeBreak = (index: number) => {
    setBreaks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBreak = (index: number, field: keyof BreakTime, value: any) => {
    setBreaks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  const toggleDay = (breakIndex: number, day: number) => {
    setBreaks((prev) =>
      prev.map((b, i) => {
        if (i !== breakIndex) return b;
        const days = b.applies_to_days.includes(day)
          ? b.applies_to_days.filter((d) => d !== day)
          : [...b.applies_to_days, day].sort();
        return { ...b, applies_to_days: days };
      })
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
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-orange-500/5 to-transparent dark:from-orange-500/10">
        <CardTitle className="flex items-center gap-2">
          <Coffee className="w-5 h-5 text-orange-500" />
          Break Times
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure break times (lunch, prayer, etc.) to exclude from appointment scheduling.
        </p>

        {breaks.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Coffee className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No breaks configured</p>
          </div>
        )}

        <div className="space-y-4">
          {breaks.map((breakItem, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border transition-colors ${
                breakItem.is_active
                  ? "bg-card border-border/50"
                  : "bg-muted/30 border-border/20 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Switch
                    checked={breakItem.is_active}
                    onCheckedChange={(checked) => updateBreak(index, "is_active", checked)}
                  />
                </div>

                <div className="flex-1 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground">Break Name</Label>
                  <Input
                    value={breakItem.break_name}
                    onChange={(e) => updateBreak(index, "break_name", e.target.value)}
                    className="h-8 text-sm"
                    placeholder="e.g., Lunch Break"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div>
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <Input
                      type="time"
                      value={breakItem.start_time}
                      onChange={(e) => updateBreak(index, "start_time", e.target.value)}
                      className="w-[110px] h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <Input
                      type="time"
                      value={breakItem.end_time}
                      onChange={(e) => updateBreak(index, "end_time", e.target.value)}
                      className="w-[110px] h-8 text-sm"
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBreak(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Days selector */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Label className="text-xs text-muted-foreground mr-2">Applies to:</Label>
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day.value}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                      breakItem.applies_to_days.includes(day.value)
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "bg-muted/50 text-muted-foreground border border-transparent"
                    }`}
                  >
                    <Checkbox
                      checked={breakItem.applies_to_days.includes(day.value)}
                      onCheckedChange={() => toggleDay(index, day.value)}
                      className="sr-only"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={addBreak}>
            <Plus className="w-4 h-4 mr-1" />
            Add Break
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            variant="hero"
            size="sm"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Breaks
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
