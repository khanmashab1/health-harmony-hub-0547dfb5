import { useState } from "react";
import { Activity, Heart, Thermometer, Weight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface VitalsEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: {
    id: string;
    patient_full_name: string;
    vitals_bp?: string | null;
    vitals_heart_rate?: string | null;
    vitals_temperature?: string | null;
    vitals_weight?: string | null;
  };
}

export function VitalsEntryDialog({ open, onOpenChange, appointment }: VitalsEntryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [systolic, setSystolic] = useState(appointment.vitals_bp?.split("/")[0] || "");
  const [diastolic, setDiastolic] = useState(appointment.vitals_bp?.split("/")[1] || "");
  const [heartRate, setHeartRate] = useState(appointment.vitals_heart_rate || "");
  const [temperature, setTemperature] = useState(appointment.vitals_temperature || "");
  const [weight, setWeight] = useState(appointment.vitals_weight || "");

  const saveVitals = useMutation({
    mutationFn: async () => {
      const bp = systolic && diastolic ? `${systolic}/${diastolic}` : null;
      
      const { error } = await supabase
        .from("appointments")
        .update({
          vitals_bp: bp,
          vitals_heart_rate: heartRate || null,
          vitals_temperature: temperature || null,
          vitals_weight: weight || null,
        })
        .eq("id", appointment.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-appointments"] });
      toast({ title: "Vitals saved successfully" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to save vitals", description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Record Vitals
          </DialogTitle>
          <DialogDescription>
            Enter vitals for {appointment.patient_full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Blood Pressure */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              Blood Pressure (mmHg)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="120"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">/</span>
              <Input
                type="number"
                placeholder="80"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Heart Rate */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              Heart Rate (bpm)
            </Label>
            <Input
              type="number"
              placeholder="72"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-500" />
              Temperature (°F)
            </Label>
            <Input
              type="number"
              step="0.1"
              placeholder="98.6"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Weight className="w-4 h-4 text-blue-500" />
              Weight (kg)
            </Label>
            <Input
              type="number"
              step="0.1"
              placeholder="70"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => saveVitals.mutate()} 
            disabled={saveVitals.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveVitals.isPending ? "Saving..." : "Save Vitals"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}