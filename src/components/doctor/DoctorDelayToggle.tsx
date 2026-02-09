import { useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";

interface DoctorDelayToggleProps {
  doctorId: string;
  currentDelay: number;
}

export function DoctorDelayToggle({ doctorId, currentDelay }: DoctorDelayToggleProps) {
  const [isLate, setIsLate] = useState(currentDelay > 0);
  const [delayMinutes, setDelayMinutes] = useState(currentDelay || 15);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const handleToggle = async (checked: boolean) => {
    setIsLate(checked);
    if (!checked) {
      // Clear delay when turning off
      await saveDelay(0);
    }
  };

  const saveDelay = async (minutes: number) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("doctors")
        .update({ delay_minutes: minutes })
        .eq("user_id", doctorId);

      if (error) throw error;

      toast({
        title: minutes > 0 ? "Delay set" : "Delay cleared",
        description: minutes > 0 
          ? `Patients will see +${minutes} min added to estimated time`
          : "Estimated times are back to normal",
      });

      queryClient.invalidateQueries({ queryKey: ["doctor-info"] });
      queryClient.invalidateQueries({ queryKey: ["appointment"] });
    } catch (error) {
      console.error("Error updating delay:", error);
      toast({
        title: "Error",
        description: "Failed to update delay",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDelay = () => {
    saveDelay(delayMinutes);
  };

  return (
    <Card className="p-4 border-amber-200 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-700/50">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="delay-toggle" className="font-medium text-amber-800 dark:text-amber-300">
              {t("doctor.lateToggle")}
            </Label>
            <Switch
              id="delay-toggle"
              checked={isLate}
              onCheckedChange={handleToggle}
              disabled={isSaving}
            />
          </div>

          {isLate && (
            <div className="flex items-center gap-2 pt-2 border-t border-amber-200/50">
              <Clock className="w-4 h-4 text-amber-600" />
              <Input
                type="number"
                min={5}
                max={120}
                step={5}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                className="w-20 h-8 text-center"
                disabled={isSaving}
              />
              <span className="text-sm text-muted-foreground">{t("common.minutes")}</span>
              <Button
                size="sm"
                onClick={handleSaveDelay}
                disabled={isSaving}
                className="ml-auto"
              >
                {isSaving ? "..." : t("doctor.setDelay")}
              </Button>
            </div>
          )}

          {currentDelay > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Currently showing +{currentDelay} {t("common.minutes")} delay to patients
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
