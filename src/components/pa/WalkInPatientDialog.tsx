import { useState } from "react";
import { format } from "date-fns";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WalkInPatientDialogProps {
  assignedDoctors: Array<{
    doctor_user_id: string;
    doctorProfile?: { id: string; name: string };
    doctorInfo?: { user_id: string; specialty: string; fee: number };
  }>;
}

export function WalkInPatientDialog({ assignedDoctors }: WalkInPatientDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    reason: "",
    doctorId: "",
  });

  const createWalkInAppointment = useMutation({
    mutationFn: async () => {
      if (!formData.doctorId || !formData.patientName) {
        throw new Error("Please fill in required fields");
      }
      
      const today = format(new Date(), "yyyy-MM-dd");
      
      // Call the allocate_token function to get next token
      const { data: tokenNumber, error: tokenError } = await supabase.rpc(
        "allocate_token",
        { p_doctor_id: formData.doctorId, p_date: today }
      );
      
      if (tokenError) throw tokenError;
      
      // Create the walk-in appointment
      const { error: insertError } = await supabase
        .from("appointments")
        .insert({
          doctor_user_id: formData.doctorId,
          patient_full_name: formData.patientName,
          patient_phone: formData.patientPhone || null,
          patient_email: formData.patientEmail || null,
          reason: formData.reason || "Walk-in patient",
          appointment_date: today,
          token_number: tokenNumber,
          payment_method: "Cash",
          payment_status: "Pending",
          status: "Upcoming",
        });
      
      if (insertError) throw insertError;
      
      return tokenNumber;
    },
    onSuccess: (tokenNumber) => {
      queryClient.invalidateQueries({ queryKey: ["pa-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["pa-pending-payments"] });
      toast({ 
        title: "Walk-in patient registered", 
        description: `Token #${tokenNumber} assigned successfully` 
      });
      setOpen(false);
      setFormData({
        patientName: "",
        patientPhone: "",
        patientEmail: "",
        reason: "",
        doctorId: "",
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Registration failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Walk-in Patient</span>
          <span className="sm:hidden">Walk-in</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Register Walk-in Patient
          </DialogTitle>
          <DialogDescription>
            Add a patient who arrived without a prior appointment
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="doctor">Select Doctor *</Label>
            <Select
              value={formData.doctorId}
              onValueChange={(value) => setFormData({ ...formData, doctorId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a doctor" />
              </SelectTrigger>
              <SelectContent>
                {assignedDoctors.map((doc) => (
                  <SelectItem key={doc.doctor_user_id} value={doc.doctor_user_id}>
                    Dr. {doc.doctorProfile?.name || "Unknown"} - {doc.doctorInfo?.specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="patientName">Patient Name *</Label>
            <Input
              id="patientName"
              value={formData.patientName}
              onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
              placeholder="Full name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="patientPhone">Phone Number</Label>
            <Input
              id="patientPhone"
              type="tel"
              value={formData.patientPhone}
              onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
              placeholder="03XX-XXXXXXX"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="patientEmail">Email (optional)</Label>
            <Input
              id="patientEmail"
              type="email"
              value={formData.patientEmail}
              onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
              placeholder="patient@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Visit</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Brief description of symptoms or reason..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => createWalkInAppointment.mutate()}
            disabled={createWalkInAppointment.isPending || !formData.doctorId || !formData.patientName}
          >
            {createWalkInAppointment.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              "Register Patient"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
