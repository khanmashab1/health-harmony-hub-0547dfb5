import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { 
  Users, Play, CheckCircle2, SkipForward, XCircle, 
  Radio, ChevronRight, Clock, Phone, User, Mail, Loader2, FileText, Ban, Pause, FlaskConical, Search, History
} from "lucide-react";
import { PatientHistoryDialog } from "./PatientHistoryDialog";
import { PausedPatientsSection } from "./PausedPatientsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MedicineEntry } from "@/components/doctor/MedicineEntry";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";

interface QueueManagementPanelProps {
  doctorId: string;
}

export function QueueManagementPanel({ doctorId }: QueueManagementPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  
  // State for prescription sheet and cancel dialog
  const [prescriptionAppointment, setPrescriptionAppointment] = useState<any>(null);
  const [cancelAppointment, setCancelAppointment] = useState<any>(null);
  const [pauseForLabTests, setPauseForLabTests] = useState(false);
  
  // Prescription form state
  const [diagnosis, setDiagnosis] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicines, setMedicines] = useState("");  // JSON string for MedicineEntry
  const [labTests, setLabTests] = useState("");
  const [doctorComments, setDoctorComments] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  // Fetch today's queue
  const { data: queueData, isLoading } = useQuery({
    queryKey: ["doctor-queue", doctorId, todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_user_id", doctorId)
        .eq("appointment_date", todayStr)
        .neq("status", "Cancelled")
        .order("token_number", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time feel
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('doctor-queue-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_user_id=eq.${doctorId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["doctor-queue", doctorId, todayStr] });
          queryClient.invalidateQueries({ queryKey: ["doctor-appointments", doctorId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, todayStr, queryClient]);

  // Send prescription email mutation
  const sendPrescriptionEmail = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data, error } = await supabase.functions.invoke("send-prescription-email", {
        body: { appointmentId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ 
        title: "Prescription Sent", 
        description: "Email with prescription sent to patient" 
      });
    },
    onError: (error: any) => {
      console.error("Failed to send prescription email:", error);
      // Don't show error toast - prescription email is optional
    },
  });

  // Update appointment status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", appointmentId);
      
      if (error) throw error;
      
      // If completing, also send prescription email
      if (status === "Completed") {
        // Get appointment to check if patient has email
        const { data: apt } = await supabase
          .from("appointments")
          .select("patient_email")
          .eq("id", appointmentId)
          .single();
        
        if (apt?.patient_email) {
          // Fire and forget - don't await
          sendPrescriptionEmail.mutate(appointmentId);
        }
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-queue", doctorId, todayStr] });
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments", doctorId] });
      toast({ 
        title: "Status Updated", 
        description: `Patient marked as ${status}${status === "Completed" ? " - prescription email sent" : ""}` 
      });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message 
      });
    },
  });

  const currentlyServing = queueData?.find(apt => apt.status === "In Progress" && !apt.is_paused);
  const pausedPatients = queueData?.filter(apt => apt.is_paused === true) || [];
  const waitingQueue = queueData?.filter(apt => apt.status === "Upcoming" && !apt.is_paused) || [];
  const completedToday = queueData?.filter(apt => apt.status === "Completed") || [];

  const handleCallNext = () => {
    if (waitingQueue.length === 0) {
      toast({ title: "Queue Empty", description: "No more patients waiting" });
      return;
    }
    
    const nextPatient = waitingQueue[0];
    updateStatus.mutate({ appointmentId: nextPatient.id, status: "In Progress" });
  };

  // Open prescription sheet instead of directly completing
  const handleOpenPrescription = (appointment: any, forLabTests: boolean = false) => {
    // Pre-fill form with existing data if any
    setDiagnosis(appointment.diagnosis || "");
    setAllergies(appointment.allergies || "");
    setMedicines(appointment.medicines || "");  // Already a string
    setLabTests(appointment.lab_tests || "");
    setDoctorComments(appointment.doctor_comments || "");
    setFollowUpDate(appointment.follow_up_date || "");
    setPauseForLabTests(forLabTests);
    setPrescriptionAppointment(appointment);
  };

  // Pause appointment for lab tests
  const handlePauseForLabTests = async () => {
    if (!prescriptionAppointment) return;
    
    const { error } = await supabase
      .from("appointments")
      .update({
        diagnosis,
        allergies,
        lab_tests: labTests,
        doctor_comments: doctorComments,
        is_paused: true,
        status: "Upcoming", // Move back to upcoming but paused
        updated_at: new Date().toISOString(),
      })
      .eq("id", prescriptionAppointment.id);
    
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ["doctor-queue", doctorId, todayStr] });
    queryClient.invalidateQueries({ queryKey: ["doctor-appointments", doctorId] });
    
    toast({ 
      title: "Paused for Lab Tests", 
      description: "Patient can return with results. Print the lab tests slip for them." 
    });
    
    // Open lab tests print page in new tab
    window.open(`/lab-tests/${prescriptionAppointment.id}`, '_blank');
    
    // Reset form
    setPrescriptionAppointment(null);
    setPauseForLabTests(false);
    setDiagnosis("");
    setAllergies("");
    setMedicines("");
    setLabTests("");
    setDoctorComments("");
    setFollowUpDate("");
  };

  // Resume paused appointment
  const handleResume = (appointmentId: string) => {
    updateStatus.mutate({ appointmentId, status: "In Progress" });
    // Also unset is_paused
    supabase
      .from("appointments")
      .update({ is_paused: false })
      .eq("id", appointmentId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["doctor-queue", doctorId, todayStr] });
      });
  };

  // Save prescription and complete appointment
  const handleSaveAndComplete = async () => {
    if (!prescriptionAppointment) return;
    
    const { error } = await supabase
      .from("appointments")
      .update({
        diagnosis,
        allergies,
        medicines,  // Already a JSON string from MedicineEntry
        lab_tests: labTests,
        doctor_comments: doctorComments,
        follow_up_date: followUpDate || null,
        status: "Completed",
        is_paused: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prescriptionAppointment.id);
    
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    
    // Send prescription email if patient has email
    if (prescriptionAppointment.patient_email) {
      sendPrescriptionEmail.mutate(prescriptionAppointment.id);
    }
    
    queryClient.invalidateQueries({ queryKey: ["doctor-queue", doctorId, todayStr] });
    queryClient.invalidateQueries({ queryKey: ["doctor-appointments", doctorId] });
    
    toast({ 
      title: "Appointment Completed", 
      description: "Prescription saved and email sent to patient" 
    });
    
    // Reset form
    setPrescriptionAppointment(null);
    setPauseForLabTests(false);
    setDiagnosis("");
    setAllergies("");
    setMedicines("");
    setLabTests("");
    setDoctorComments("");
    setFollowUpDate("");
  };

  const handleSkip = (appointmentId: string) => {
    // Move to end of queue by setting status back to Upcoming
    updateStatus.mutate({ appointmentId, status: "Upcoming" });
  };

  const handleNoShow = (appointmentId: string) => {
    updateStatus.mutate({ appointmentId, status: "No Show" });
  };

  const handleCancelAppointment = (appointmentId: string) => {
    updateStatus.mutate({ appointmentId, status: "Cancelled" });
    setCancelAppointment(null);
  };

  if (isLoading) {
    return (
      <Card variant="glass" className="border-border/30">
        <CardContent className="p-6">
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Status Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card variant="glass" className="border-green-500/20 bg-green-500/5 dark:bg-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Play className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">
                  {currentlyServing ? `#${currentlyServing.token_number}` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Now Serving</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{waitingQueue.length}</p>
                <p className="text-xs text-muted-foreground">Waiting</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-primary/20 bg-primary/5 dark:bg-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{completedToday.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currently Serving */}
      <Card variant="glass" className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-transparent dark:from-green-500/20">
        <CardHeader className="border-b border-border/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-green-500 animate-pulse" />
              Currently Serving
            </CardTitle>
            <Badge className="bg-green-500 text-white animate-pulse">Live</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {currentlyServing ? (
              <motion.div
                key={currentlyServing.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-2xl sm:text-3xl font-bold text-white">#{currentlyServing.token_number}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-xl font-bold truncate">{currentlyServing.patient_full_name || "Patient"}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {currentlyServing.patient_phone || "No phone"}
                      </span>
                    </div>
                    {currentlyServing.reason && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        Reason: {currentlyServing.reason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PatientHistoryDialog
                    patientName={currentlyServing.patient_full_name || "Patient"}
                    patientUserId={currentlyServing.patient_user_id}
                    doctorUserId={doctorId}
                    currentAppointmentId={currentlyServing.id}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSkip(currentlyServing.id)}
                    disabled={updateStatus.isPending}
                    className="hover:bg-yellow-500/10 hover:text-yellow-600 hover:border-yellow-500 flex-1 sm:flex-none min-w-[70px]"
                  >
                    <SkipForward className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Skip</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNoShow(currentlyServing.id)}
                    disabled={updateStatus.isPending}
                    className="hover:bg-red-500/10 hover:text-red-600 hover:border-red-500 flex-1 sm:flex-none min-w-[70px]"
                  >
                    <XCircle className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">No Show</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelAppointment(currentlyServing)}
                    disabled={updateStatus.isPending}
                    className="hover:bg-red-500/10 hover:text-red-600 hover:border-red-500 flex-1 sm:flex-none min-w-[70px]"
                  >
                    <Ban className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Cancel</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenPrescription(currentlyServing)}
                    disabled={updateStatus.isPending}
                    className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Prescription
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No patient currently being served</p>
                <Button 
                  onClick={handleCallNext} 
                  disabled={waitingQueue.length === 0 || updateStatus.isPending}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Call Next Patient
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Paused for Lab Tests */}
      {pausedPatients.length > 0 && (
        <PausedPatientsSection
          pausedPatients={pausedPatients}
          onResume={handleResume}
          isResumeDisabled={updateStatus.isPending || !!currentlyServing}
        />
      )}

      {/* Waiting Queue */}
      <Card variant="glass" className="border-border/30">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-blue-500/5 to-transparent dark:from-blue-500/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Waiting Queue
              </CardTitle>
              <CardDescription>Patients waiting to be called</CardDescription>
            </div>
            {waitingQueue.length > 0 && !currentlyServing && (
              <Button onClick={handleCallNext} disabled={updateStatus.isPending}>
                <Play className="w-4 h-4 mr-2" />
                Call Next
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {waitingQueue.length > 0 ? (
            <div className="space-y-2">
              {waitingQueue.map((apt, index) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                      index === 0 
                        ? "bg-blue-500/20 text-blue-500" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      #{apt.token_number}
                    </div>
                    <div>
                      <p className="font-medium">{apt.patient_full_name || "Patient"}</p>
                      <p className="text-xs text-muted-foreground">{apt.patient_phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <Badge variant="outline" className="border-blue-500/50 text-blue-500">
                        Next
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCancelAppointment(apt)}
                      disabled={updateStatus.isPending}
                      className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
                      title="Cancel Appointment"
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleNoShow(apt.id)}
                      disabled={updateStatus.isPending}
                      className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
                      title="Mark No Show"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No patients waiting</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelAppointment} onOpenChange={() => setCancelAppointment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment for{" "}
              <strong>{cancelAppointment?.patient_full_name || "this patient"}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleCancelAppointment(cancelAppointment?.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prescription Sheet */}
      <Sheet open={!!prescriptionAppointment} onOpenChange={() => setPrescriptionAppointment(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-gradient-to-b from-background to-muted/30">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Enter Prescription
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              For: <strong>{prescriptionAppointment?.patient_full_name || "Patient"}</strong> (Token #{prescriptionAppointment?.token_number})
            </p>
          </SheetHeader>

          <div className="space-y-6">
            {/* Diagnosis */}
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter diagnosis..."
                className="min-h-[80px]"
              />
            </div>

            {/* Allergies */}
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Input
                id="allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Known allergies..."
              />
            </div>

            {/* Medicines */}
            <div className="space-y-2">
              <Label>Medicines</Label>
              <MedicineEntry
                value={medicines}
                onChange={setMedicines}
              />
            </div>

            {/* Lab Tests */}
            <div className="space-y-2">
              <Label htmlFor="labTests">Lab Tests</Label>
              <Textarea
                id="labTests"
                value={labTests}
                onChange={(e) => setLabTests(e.target.value)}
                placeholder="Recommended lab tests..."
                className="min-h-[60px]"
              />
            </div>

            {/* Doctor Comments */}
            <div className="space-y-2">
              <Label htmlFor="doctorComments">Doctor's Notes</Label>
              <Textarea
                id="doctorComments"
                value={doctorComments}
                onChange={(e) => setDoctorComments(e.target.value)}
                placeholder="Additional notes..."
                className="min-h-[60px]"
              />
            </div>

            {/* Follow-up Date */}
            <div className="space-y-2">
              <Label htmlFor="followUpDate">Follow-up Date (Optional)</Label>
              <Input
                id="followUpDate"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4">
              {/* Pause for Lab Tests Button */}
              {labTests.trim() && (
                <Button
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  onClick={handlePauseForLabTests}
                  disabled={updateStatus.isPending}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause & Print Lab Tests
                </Button>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setPrescriptionAppointment(null);
                    setPauseForLabTests(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={handleSaveAndComplete}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save & Complete
                </Button>
              </div>
            </div>

            {/* Print Link */}
            {prescriptionAppointment && (
              <div className="text-center pt-2">
                <Link
                  to={`/prescription/${prescriptionAppointment.id}`}
                  target="_blank"
                  className="text-sm text-primary hover:underline"
                >
                  Preview / Print Prescription
                </Link>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
