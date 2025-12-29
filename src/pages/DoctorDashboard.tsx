import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Stethoscope,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Activity,
  CalendarX,
  Plus,
  Trash2,
  LogOut,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Layout } from "@/components/layout/Layout";
import { useRequireAuth, useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, Link } from "react-router-dom";

export default function DoctorDashboard() {
  const { user, profile, loading } = useRequireAuth(["doctor"]);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [blockDate, setBlockDate] = useState<Date | undefined>();
  const [blockReason, setBlockReason] = useState("");

  // Fetch doctor info
  const { data: doctorInfo } = useQuery({
    queryKey: ["doctor-info", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch appointments
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ["doctor-appointments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_user_id", user!.id)
        .order("appointment_date", { ascending: true })
        .order("token_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch blocked slots
  const { data: blockedSlots } = useQuery({
    queryKey: ["doctor-blocked-slots", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_slots")
        .select("*")
        .eq("doctor_user_id", user!.id)
        .order("blocked_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Update appointment mutation
  const updateAppointment = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", selectedAppointment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
      toast({ title: "Appointment updated" });
      setSelectedAppointment(null);
    },
  });

  // Block slot mutation
  const blockSlot = useMutation({
    mutationFn: async () => {
      if (!blockDate || !user) return;
      const { error } = await supabase.from("blocked_slots").insert({
        doctor_user_id: user.id,
        blocked_date: format(blockDate, "yyyy-MM-dd"),
        reason: blockReason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-blocked-slots"] });
      toast({ title: "Slot blocked" });
      setBlockDate(undefined);
      setBlockReason("");
    },
  });

  // Unblock slot mutation
  const unblockSlot = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from("blocked_slots").delete().eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-blocked-slots"] });
      toast({ title: "Slot unblocked" });
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = appointments?.filter(a => a.appointment_date === todayStr && a.status !== "Cancelled") || [];
  const upcomingAppointments = appointments?.filter(a => a.appointment_date >= todayStr && a.status === "Upcoming") || [];
  const completedAppointments = appointments?.filter(a => a.status === "Completed") || [];

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Dr. {profile?.name}</h1>
                <p className="text-muted-foreground">{doctorInfo?.specialty}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Today", value: todayAppointments.length, icon: Calendar, color: "text-blue-600" },
              { label: "Upcoming", value: upcomingAppointments.length, icon: Clock, color: "text-purple-600" },
              { label: "Completed", value: completedAppointments.length, icon: CheckCircle2, color: "text-green-600" },
              { label: "Blocked Slots", value: blockedSlots?.length || 0, icon: CalendarX, color: "text-red-600" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="today" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="all">All Appointments</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Today's Appointments */}
            <TabsContent value="today">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Appointments</CardTitle>
                  <CardDescription>{format(new Date(), "EEEE, MMMM d, yyyy")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAppointments ? (
                    <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
                  ) : todayAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {todayAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setSelectedAppointment(apt)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary">#{apt.token_number}</span>
                            </div>
                            <div>
                              <p className="font-medium">{apt.patient_full_name || "Patient"}</p>
                              <p className="text-sm text-muted-foreground">{apt.patient_phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={apt.status === "Completed" ? "default" : "secondary"}>
                              {apt.status}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No appointments for today</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Appointments */}
            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>All Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments && appointments.length > 0 ? (
                    <div className="space-y-3">
                      {appointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setSelectedAppointment(apt)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary">#{apt.token_number}</span>
                            </div>
                            <div>
                              <p className="font-medium">{apt.patient_full_name || "Patient"}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(apt.appointment_date), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <Badge variant={
                            apt.status === "Completed" ? "default" :
                            apt.status === "Upcoming" ? "secondary" :
                            apt.status === "Cancelled" ? "destructive" : "outline"
                          }>
                            {apt.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No appointments</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Availability */}
            <TabsContent value="availability">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Block a Slot</CardTitle>
                    <CardDescription>Select a date to block</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CalendarComponent
                      mode="single"
                      selected={blockDate}
                      onSelect={setBlockDate}
                      className="rounded-lg border mb-4"
                    />
                    {blockDate && (
                      <div className="space-y-3">
                        <div>
                          <Label>Reason (optional)</Label>
                          <Input
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            placeholder="Leave, Holiday, etc."
                            className="mt-1"
                          />
                        </div>
                        <Button onClick={() => blockSlot.mutate()} className="w-full">
                          Block {format(blockDate, "MMM d, yyyy")}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Blocked Dates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {blockedSlots && blockedSlots.length > 0 ? (
                      <div className="space-y-2">
                        {blockedSlots.map((slot) => (
                          <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium">
                                {format(new Date(slot.blocked_date), "EEEE, MMM d, yyyy")}
                              </p>
                              {slot.reason && (
                                <p className="text-sm text-muted-foreground">{slot.reason}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unblockSlot.mutate(slot.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">No blocked dates</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Doctor Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Max Patients/Day</p>
                      <p className="font-medium text-lg">{doctorInfo?.max_patients_per_day || 30}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Consultation Fee</p>
                      <p className="font-medium text-lg">Rs. {doctorInfo?.fee || 500}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Experience</p>
                      <p className="font-medium text-lg">{doctorInfo?.experience_years || 0} years</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rating</p>
                      <p className="font-medium text-lg">{doctorInfo?.rating || 4.0} ⭐</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Appointment Detail Sheet */}
      <Sheet open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedAppointment && (
            <AppointmentDetail
              appointment={selectedAppointment}
              onUpdate={(updates) => updateAppointment.mutate(updates)}
              isLoading={updateAppointment.isPending}
            />
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}

// Appointment Detail Component
function AppointmentDetail({ appointment, onUpdate, isLoading }: { appointment: any; onUpdate: (updates: any) => void; isLoading: boolean }) {
  const [vitalsWeight, setVitalsWeight] = useState(appointment.vitals_weight || "");
  const [vitalsBP, setVitalsBP] = useState(appointment.vitals_bp || "");
  const [vitalsTemp, setVitalsTemp] = useState(appointment.vitals_temperature || "");
  const [vitalsHR, setVitalsHR] = useState(appointment.vitals_heart_rate || "");
  const [diagnosis, setDiagnosis] = useState(appointment.diagnosis || "");
  const [medicines, setMedicines] = useState(appointment.medicines || "");
  const [labTests, setLabTests] = useState(appointment.lab_tests || "");
  const [comments, setComments] = useState(appointment.doctor_comments || "");

  const handleSave = () => {
    onUpdate({
      vitals_weight: vitalsWeight,
      vitals_bp: vitalsBP,
      vitals_temperature: vitalsTemp,
      vitals_heart_rate: vitalsHR,
      diagnosis,
      medicines,
      lab_tests: labTests,
      doctor_comments: comments,
    });
  };

  const handleComplete = () => {
    onUpdate({
      status: "Completed",
      vitals_weight: vitalsWeight,
      vitals_bp: vitalsBP,
      vitals_temperature: vitalsTemp,
      vitals_heart_rate: vitalsHR,
      diagnosis,
      medicines,
      lab_tests: labTests,
      doctor_comments: comments,
    });
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>Appointment #{appointment.token_number}</SheetTitle>
        <SheetDescription>
          {format(new Date(appointment.appointment_date), "EEEE, MMMM d, yyyy")}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        {/* Patient Info */}
        <div className="p-4 rounded-lg bg-muted">
          <h4 className="font-medium mb-2">Patient Information</h4>
          <p className="text-sm">{appointment.patient_full_name}</p>
          <p className="text-sm text-muted-foreground">{appointment.patient_phone}</p>
          <p className="text-sm text-muted-foreground">{appointment.patient_email}</p>
          {appointment.reason && (
            <p className="text-sm mt-2"><strong>Reason:</strong> {appointment.reason}</p>
          )}
        </div>

        {/* Vitals */}
        <div>
          <h4 className="font-medium mb-3">Vitals</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Weight (kg)</Label>
              <Input value={vitalsWeight} onChange={(e) => setVitalsWeight(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Blood Pressure</Label>
              <Input value={vitalsBP} onChange={(e) => setVitalsBP(e.target.value)} placeholder="120/80" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Temperature (°F)</Label>
              <Input value={vitalsTemp} onChange={(e) => setVitalsTemp(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Heart Rate (bpm)</Label>
              <Input value={vitalsHR} onChange={(e) => setVitalsHR(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>

        {/* Prescription */}
        <div>
          <h4 className="font-medium mb-3">Prescription</h4>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Diagnosis</Label>
              <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Medicines</Label>
              <Textarea value={medicines} onChange={(e) => setMedicines(e.target.value)} placeholder="Medicine name - dosage - duration" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Lab Tests</Label>
              <Textarea value={labTests} onChange={(e) => setLabTests(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Comments</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={handleSave} variant="outline" className="flex-1" disabled={isLoading}>
            Save
          </Button>
          {appointment.status !== "Completed" && (
            <Button onClick={handleComplete} variant="hero" className="flex-1" disabled={isLoading}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete
            </Button>
          )}
        </div>

        {appointment.status === "Completed" && (
          <Link to={`/prescription/${appointment.id}`}>
            <Button variant="outline" className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              View Prescription
            </Button>
          </Link>
        )}
      </div>
    </>
  );
}
