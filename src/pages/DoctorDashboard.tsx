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
  ChevronRight,
  Settings,
  TrendingUp
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
  Sheet,
  SheetContent,
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
        <div className="min-h-screen bg-gradient-to-br from-brand-50 via-background to-medical-light/20">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
            </div>
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
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-background to-medical-light/20 dark:from-background dark:via-background dark:to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Dr. {profile?.name}
                </h1>
                <p className="text-muted-foreground font-medium">{doctorInfo?.specialty}</p>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: "Today's Patients", value: todayAppointments.length, icon: Calendar, color: "from-blue-500 to-blue-600", bg: "bg-blue-50" },
              { label: "Upcoming", value: upcomingAppointments.length, icon: Clock, color: "from-purple-500 to-purple-600", bg: "bg-purple-50" },
              { label: "Completed", value: completedAppointments.length, icon: CheckCircle2, color: "from-green-500 to-green-600", bg: "bg-green-50" },
              { label: "Blocked Slots", value: blockedSlots?.length || 0, icon: CalendarX, color: "from-red-500 to-red-600", bg: "bg-red-50" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card variant="glass" className="border-white/50 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{stat.value}</p>
                        <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="today" className="space-y-6">
              <TabsList className="bg-muted/80 dark:bg-muted/50 backdrop-blur-sm border border-border/50 p-1.5 rounded-xl shadow-sm flex-wrap h-auto gap-1">
                <TabsTrigger value="today" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
                  Today
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <FileText className="w-4 h-4 mr-1 sm:mr-2" />
                  All
                </TabsTrigger>
                <TabsTrigger value="availability" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <CalendarX className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Availability</span>
                  <span className="sm:hidden">Avail</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Settings className="w-4 h-4 mr-1 sm:mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* Today's Appointments */}
              <TabsContent value="today">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-brand-50/50 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-brand-500" />
                      Today's Appointments
                    </CardTitle>
                    <CardDescription>{format(new Date(), "EEEE, MMMM d, yyyy")}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {loadingAppointments ? (
                      <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
                    ) : todayAppointments.length > 0 ? (
                      <div className="space-y-3">
                        {todayAppointments.map((apt) => (
                          <motion.div
                            key={apt.id}
                            whileHover={{ scale: 1.01 }}
                            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/50 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                            onClick={() => setSelectedAppointment(apt)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                                <span className="text-xl font-bold text-brand-600">#{apt.token_number}</span>
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{apt.patient_full_name || "Patient"}</p>
                                <p className="text-sm text-muted-foreground">{apt.patient_phone}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={apt.status === "Completed" ? "status-completed" : "status-upcoming"}>
                                {apt.status}
                              </Badge>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
                          <Calendar className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">No appointments for today</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* All Appointments */}
              <TabsContent value="all">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-brand-50/50 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-brand-500" />
                      All Appointments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {appointments && appointments.length > 0 ? (
                      <div className="space-y-3">
                        {appointments.map((apt) => (
                          <motion.div
                            key={apt.id}
                            whileHover={{ scale: 1.01 }}
                            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/50 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                            onClick={() => setSelectedAppointment(apt)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                                <span className="text-lg font-bold text-brand-600">#{apt.token_number}</span>
                              </div>
                              <div>
                                <p className="font-semibold">{apt.patient_full_name || "Patient"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(apt.appointment_date), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <Badge className={
                              apt.status === "Completed" ? "status-completed" :
                              apt.status === "Upcoming" ? "status-upcoming" :
                              apt.status === "Cancelled" ? "status-cancelled" : "status-pending"
                            }>
                              {apt.status}
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-12 text-muted-foreground">No appointments</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Availability */}
              <TabsContent value="availability">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card variant="glass" className="border-white/50">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-brand-50/50 to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5 text-brand-500" />
                        Block a Slot
                      </CardTitle>
                      <CardDescription>Select a date to block from appointments</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <CalendarComponent
                        mode="single"
                        selected={blockDate}
                        onSelect={setBlockDate}
                        className="rounded-xl border border-border/50 bg-white/50 mb-4"
                      />
                      {blockDate && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          <div>
                            <Label className="text-sm font-medium">Reason (optional)</Label>
                            <Input
                              value={blockReason}
                              onChange={(e) => setBlockReason(e.target.value)}
                              placeholder="Leave, Holiday, etc."
                              className="mt-2 border-border/50 focus:border-brand-500"
                            />
                          </div>
                          <Button onClick={() => blockSlot.mutate()} variant="hero" className="w-full">
                            Block {format(blockDate, "MMM d, yyyy")}
                          </Button>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="border-white/50">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-red-50/50 to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <CalendarX className="w-5 h-5 text-red-500" />
                        Blocked Dates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {blockedSlots && blockedSlots.length > 0 ? (
                        <div className="space-y-3">
                          {blockedSlots.map((slot) => (
                            <div key={slot.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/50">
                              <div>
                                <p className="font-semibold">
                                  {format(new Date(slot.blocked_date), "EEEE, MMM d, yyyy")}
                                </p>
                                {slot.reason && (
                                  <p className="text-sm text-muted-foreground">{slot.reason}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => unblockSlot.mutate(slot.id)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <CalendarX className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">No blocked dates</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Settings */}
              <TabsContent value="settings">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-brand-50/50 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-brand-500" />
                      Doctor Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { label: "Max Patients/Day", value: doctorInfo?.max_patients_per_day || 30, icon: Users },
                        { label: "Consultation Fee", value: `Rs. ${doctorInfo?.fee || 500}`, icon: TrendingUp },
                        { label: "Experience", value: `${doctorInfo?.experience_years || 0} years`, icon: Activity },
                        { label: "Rating", value: `${doctorInfo?.rating || 4.0} ⭐`, icon: CheckCircle2 },
                      ].map((item) => (
                        <div key={item.label} className="p-4 rounded-xl border border-border/50 bg-white/50">
                          <div className="flex items-center gap-2 mb-2">
                            <item.icon className="w-4 h-4 text-brand-500" />
                            <p className="text-sm text-muted-foreground font-medium">{item.label}</p>
                          </div>
                          <p className="font-bold text-xl">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>

      {/* Appointment Detail Sheet */}
      <Sheet open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-gradient-to-b from-white to-brand-50/30">
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
  const [vitals, setVitals] = useState({
    bp: appointment.vitals_bp || "",
    heartRate: appointment.vitals_heart_rate || "",
    temperature: appointment.vitals_temperature || "",
    weight: appointment.vitals_weight || "",
  });
  const [diagnosis, setDiagnosis] = useState(appointment.diagnosis || "");
  const [medicines, setMedicines] = useState(appointment.medicines || "");
  const [labTests, setLabTests] = useState(appointment.lab_tests || "");
  const [comments, setComments] = useState(appointment.doctor_comments || "");

  const handleSave = () => {
    onUpdate({
      vitals_bp: vitals.bp,
      vitals_heart_rate: vitals.heartRate,
      vitals_temperature: vitals.temperature,
      vitals_weight: vitals.weight,
      diagnosis,
      medicines,
      lab_tests: labTests,
      doctor_comments: comments,
    });
  };

  const handleComplete = () => {
    onUpdate({
      vitals_bp: vitals.bp,
      vitals_heart_rate: vitals.heartRate,
      vitals_temperature: vitals.temperature,
      vitals_weight: vitals.weight,
      diagnosis,
      medicines,
      lab_tests: labTests,
      doctor_comments: comments,
      status: "Completed",
    });
  };

  return (
    <div className="space-y-6 pt-6">
      {/* Patient Info Header */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/80 flex items-center justify-center">
            <span className="text-xl font-bold text-brand-600">#{appointment.token_number}</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-900">{appointment.patient_full_name}</h3>
            <p className="text-brand-700">{appointment.patient_phone}</p>
          </div>
        </div>
      </div>

      {/* Vitals */}
      <div className="space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-500" />
          Vitals
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Blood Pressure</Label>
            <Input
              value={vitals.bp}
              onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
              placeholder="120/80"
              className="mt-1 border-border/50"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Heart Rate</Label>
            <Input
              value={vitals.heartRate}
              onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
              placeholder="72 bpm"
              className="mt-1 border-border/50"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Temperature</Label>
            <Input
              value={vitals.temperature}
              onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
              placeholder="98.6°F"
              className="mt-1 border-border/50"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Weight</Label>
            <Input
              value={vitals.weight}
              onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
              placeholder="70 kg"
              className="mt-1 border-border/50"
            />
          </div>
        </div>
      </div>

      {/* Diagnosis */}
      <div className="space-y-2">
        <Label className="font-semibold">Diagnosis</Label>
        <Textarea
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Enter diagnosis..."
          className="border-border/50 min-h-[80px]"
        />
      </div>

      {/* Medicines */}
      <div className="space-y-2">
        <Label className="font-semibold">Medicines</Label>
        <Textarea
          value={medicines}
          onChange={(e) => setMedicines(e.target.value)}
          placeholder="Enter medicines (one per line)..."
          className="border-border/50 min-h-[80px]"
        />
      </div>

      {/* Lab Tests */}
      <div className="space-y-2">
        <Label className="font-semibold">Lab Tests</Label>
        <Textarea
          value={labTests}
          onChange={(e) => setLabTests(e.target.value)}
          placeholder="Enter lab tests if any..."
          className="border-border/50"
        />
      </div>

      {/* Comments */}
      <div className="space-y-2">
        <Label className="font-semibold">Comments</Label>
        <Textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Additional notes..."
          className="border-border/50"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={handleSave} disabled={isLoading} className="flex-1">
          Save Draft
        </Button>
        <Button variant="hero" onClick={handleComplete} disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : "Complete"}
        </Button>
      </div>

      {appointment.status === "Completed" && (
        <Link to={`/prescription/${appointment.id}`}>
          <Button variant="outline" className="w-full mt-2">
            <FileText className="w-4 h-4 mr-2" />
            View Prescription
          </Button>
        </Link>
      )}
    </div>
  );
}