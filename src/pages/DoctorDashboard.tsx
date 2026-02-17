import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks } from "date-fns";
import {
  Stethoscope,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  FileText,
  Activity,
  CalendarX,
  Plus,
  Trash2,
  ChevronRight,
  Settings,
  TrendingUp,
  Search,
  BarChart3,
  Radio,
  Crown,
  Lock,
  Building2,
  FlaskConical,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { MedicineEntry } from "@/components/doctor/MedicineEntry";
import { DoctorSettingsPanel } from "@/components/doctor/DoctorSettingsPanel";
import { QueueManagementPanel } from "@/components/doctor/QueueManagementPanel";
import { PAManagementPanel } from "@/components/doctor/PAManagementPanel";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { FeatureGate, PatientLimitWarning } from "@/components/doctor/FeatureGate";
import { PlanRestrictionsCard } from "@/components/doctor/PlanRestrictionsCard";
import { OrganizationPanel } from "@/components/doctor/OrganizationPanel";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { PatientHistoryDialog } from "@/components/doctor/PatientHistoryDialog";
import { DoctorDelayToggle } from "@/components/doctor/DoctorDelayToggle";
import { useLanguage } from "@/hooks/useLanguage";
import { PendingTestReportsPanel } from "@/components/doctor/PendingTestReportsPanel";

export default function DoctorDashboard() {
  const { user, profile, loading } = useRequireAuth(["doctor"]);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [blockDate, setBlockDate] = useState<Date | undefined>();
  const [blockReason, setBlockReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [chartView, setChartView] = useState<"weekly" | "monthly">("weekly");
  const [activeTab, setActiveTab] = useState("queue");
  const [appointmentFilter, setAppointmentFilter] = useState<"all" | "upcoming" | "completed">("all");

  // Fetch doctor info with plan
  const { data: doctorInfo } = useQuery({
    queryKey: ["doctor-info", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*, selected_plan:doctor_payment_plans(id, name, price, billing_period, features)")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Plan-based feature access
  const { features, isFreePlan, canAccessFeature, getUpgradeMessage } = usePlanFeatures(user?.id);

  // Fetch appointments with patient profile info
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ["doctor-appointments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patient_profile:profiles!appointments_patient_user_id_fkey(patient_id)")
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

  // All useMemo hooks MUST be called before any conditional returns
  const todayStr = format(new Date(), "yyyy-MM-dd");
  
  const todayAppointments = useMemo(() => {
    return appointments?.filter(a => a.appointment_date === todayStr && a.status !== "Cancelled") || [];
  }, [appointments, todayStr]);

  const upcomingAppointments = useMemo(() => {
    return appointments?.filter(a => a.appointment_date >= todayStr && a.status === "Upcoming") || [];
  }, [appointments, todayStr]);

  const completedAppointments = useMemo(() => {
    return appointments?.filter(a => a.status === "Completed") || [];
  }, [appointments]);

  // Filter appointments by search term and status filter
  const filteredAppointments = useMemo(() => {
    if (!appointments) return appointments;
    let filtered = appointments;
    
    // Apply status filter
    if (appointmentFilter === "upcoming") {
      filtered = filtered.filter(apt => ["Pending", "Upcoming"].includes(apt.status));
    } else if (appointmentFilter === "completed") {
      filtered = filtered.filter(apt => apt.status === "Completed");
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(apt => {
        const profile = (apt as any).patient_profile;
        const patientId = profile?.patient_id || (Array.isArray(profile) ? profile[0]?.patient_id : null);
        return (
          apt.patient_full_name?.toLowerCase().includes(term) ||
          apt.patient_phone?.includes(term) ||
          patientId?.toLowerCase().includes(term)
        );
      });
    }
    
    return filtered;
  }, [appointments, searchTerm, appointmentFilter]);

  // Chart data - weekly
  const weeklyChartData = useMemo(() => {
    if (!appointments) return [];
    const today = new Date();
    const days = eachDayOfInterval({
      start: subDays(today, 6),
      end: today
    });
    
    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayAppts = appointments.filter(a => a.appointment_date === dateStr);
      return {
        name: format(day, "EEE"),
        date: format(day, "MMM d"),
        completed: dayAppts.filter(a => a.status === "Completed").length,
        upcoming: dayAppts.filter(a => a.status === "Upcoming").length,
        total: dayAppts.filter(a => a.status !== "Cancelled").length,
      };
    });
  }, [appointments]);

  // Chart data - monthly (last 4 weeks)
  const monthlyChartData = useMemo(() => {
    if (!appointments) return [];
    const today = new Date();
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(today, i));
      const weekEnd = endOfWeek(subWeeks(today, i));
      const weekAppts = appointments.filter(a => {
        const aptDate = new Date(a.appointment_date);
        return aptDate >= weekStart && aptDate <= weekEnd;
      });
      weeks.push({
        name: `Week ${4 - i}`,
        date: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
        completed: weekAppts.filter(a => a.status === "Completed").length,
        upcoming: weekAppts.filter(a => a.status === "Upcoming").length,
        total: weekAppts.filter(a => a.status !== "Cancelled").length,
      });
    }
    return weeks;
  }, [appointments]);

  // Loading state AFTER all hooks
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
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-muted-foreground font-medium">{doctorInfo?.specialty}</p>
                  {doctorInfo?.selected_plan && (
                    <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                      <Crown className="w-3 h-3" />
                      {doctorInfo.selected_plan.name}
                    </Badge>
                  )}
                </div>
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
              { label: t("doctor.todayQueue"), value: todayAppointments.length, icon: Calendar, color: "from-blue-500 to-blue-600", bg: "bg-blue-50" },
              { label: t("common.upcoming"), value: upcomingAppointments.length, icon: Clock, color: "from-purple-500 to-purple-600", bg: "bg-purple-50" },
              { label: t("common.completed"), value: completedAppointments.length, icon: CheckCircle2, color: "from-green-500 to-green-600", bg: "bg-green-50" },
              { label: t("doctor.schedule"), value: blockedSlots?.length || 0, icon: CalendarX, color: "from-red-500 to-red-600", bg: "bg-red-50" },
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

          {/* Doctor Running Late Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mb-4"
          >
            {user && (
              <DoctorDelayToggle 
                doctorId={user.id} 
                currentDelay={doctorInfo?.delay_minutes || 0}
              />
            )}
          </motion.div>

          {/* Pending Test Reports */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.13 }}
              className="mb-4"
            >
              <PendingTestReportsPanel doctorUserId={user.id} />
            </motion.div>
          )}

          {/* Plan Restrictions Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <PlanRestrictionsCard 
              userId={user?.id} 
              currentPatientCount={todayAppointments.length}
              onTabChange={(tab) => setActiveTab(tab)}
            />
          </motion.div>


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-muted/80 dark:bg-muted/50 backdrop-blur-sm border border-border/50 p-1.5 rounded-xl shadow-sm flex-wrap h-auto gap-1">
                <TabsTrigger value="queue" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Radio className="w-4 h-4 mr-1 sm:mr-2" />
                  {t("pa.queue")}
                </TabsTrigger>
                <TabsTrigger value="today" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
                  {t("common.today")}
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <FileText className="w-4 h-4 mr-1 sm:mr-2" />
                  {t("common.all")}
                </TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  {!canAccessFeature("analyticsAccess") ? (
                    <Lock className="w-4 h-4 mr-1 sm:mr-2 text-muted-foreground" />
                  ) : (
                    <BarChart3 className="w-4 h-4 mr-1 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">{t("doctor.analytics")}</span>
                  <span className="sm:hidden">{t("doctor.analytics")}</span>
                </TabsTrigger>
                <TabsTrigger value="availability" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <CalendarX className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Availability</span>
                  <span className="sm:hidden">Avail</span>
                </TabsTrigger>
                <TabsTrigger value="team" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  {!canAccessFeature("teamManagement") ? (
                    <Lock className="w-4 h-4 mr-1 sm:mr-2 text-muted-foreground" />
                  ) : (
                    <Users className="w-4 h-4 mr-1 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">My Team</span>
                  <span className="sm:hidden">Team</span>
                </TabsTrigger>
                {canAccessFeature("multiDoctorSupport") && (
                  <TabsTrigger value="organization" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                    <Building2 className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Organization</span>
                    <span className="sm:hidden">Org</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="test-reports" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <FlaskConical className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Test Reports</span>
                  <span className="sm:hidden">Tests</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Settings className="w-4 h-4 mr-1 sm:mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* Queue Management Tab */}
              <TabsContent value="queue">
                {/* Patient Limit Warning */}
                {features.maxPatientsPerDay !== Infinity && (
                  <PatientLimitWarning
                    currentCount={todayAppointments.length}
                    maxAllowed={features.maxPatientsPerDay}
                    isAtLimit={todayAppointments.length >= features.maxPatientsPerDay}
                  />
                )}
                {user && <QueueManagementPanel doctorId={user.id} />}
              </TabsContent>

              {/* Today's Appointments */}
              <TabsContent value="today">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
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
                            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => setSelectedAppointment(apt)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                <span className="text-xl font-bold text-primary">#{apt.token_number}</span>
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
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-brand-500" />
                          {appointmentFilter === "all" ? "All Appointments" : appointmentFilter === "upcoming" ? "Upcoming Appointments" : "Completed Appointments"}
                        </CardTitle>
                        <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search by name, phone, or patient ID..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="pl-9 border-border/50" 
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={appointmentFilter === "all" ? "default" : "outline"}
                          onClick={() => setAppointmentFilter("all")}
                        >
                          All
                        </Button>
                        <Button
                          size="sm"
                          variant={appointmentFilter === "upcoming" ? "default" : "outline"}
                          onClick={() => setAppointmentFilter("upcoming")}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          Upcoming
                        </Button>
                        <Button
                          size="sm"
                          variant={appointmentFilter === "completed" ? "default" : "outline"}
                          onClick={() => setAppointmentFilter("completed")}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Completed
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {filteredAppointments && filteredAppointments.length > 0 ? (
                      <div className="space-y-3">
                        {searchTerm && (
                          <p className="text-sm text-muted-foreground mb-4">
                            Found {filteredAppointments.length} result{filteredAppointments.length !== 1 ? 's' : ''} for "{searchTerm}"
                          </p>
                        )}
                        {filteredAppointments.map((apt) => (
                          <motion.div
                            key={apt.id}
                            whileHover={{ scale: 1.01 }}
                            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => setSelectedAppointment(apt)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                <span className="text-lg font-bold text-primary">#{apt.token_number}</span>
                              </div>
                              <div>
                                <p className="font-semibold">{apt.patient_full_name || "Patient"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(apt.appointment_date), "MMM d, yyyy")} • {apt.patient_phone || "No phone"}
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
                    ) : searchTerm ? (
                      <div className="text-center py-12">
                        <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No patients found matching "{searchTerm}"</p>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearchTerm("")}>
                          Clear search
                        </Button>
                      </div>
                    ) : (
                      <p className="text-center py-12 text-muted-foreground">No appointments</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics">
                <FeatureGate
                  feature="analyticsAccess"
                  canAccess={canAccessFeature("analyticsAccess")}
                  upgradeMessage={getUpgradeMessage("analyticsAccess")}
                  variant={isFreePlan ? "banner" : "replace"}
                  showPreview={true}
                >
                <div className="grid md:grid-cols-2 gap-6">
                  <Card variant="glass" className="border-white/50">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-brand-500" />
                          Appointment Trends
                        </CardTitle>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant={chartView === "weekly" ? "default" : "outline"}
                            onClick={() => setChartView("weekly")}
                          >
                            Weekly
                          </Button>
                          <Button 
                            size="sm" 
                            variant={chartView === "monthly" ? "default" : "outline"}
                            onClick={() => setChartView("monthly")}
                          >
                            Monthly
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {chartView === "weekly" ? "Last 7 days" : "Last 4 weeks"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartView === "weekly" ? weeklyChartData : monthlyChartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="name" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }} 
                            />
                            <Bar dataKey="completed" fill="hsl(142, 76%, 36%)" name="Completed" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="upcoming" fill="hsl(217, 91%, 60%)" name="Upcoming" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="border-white/50">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-500" />
                        Patient Volume
                      </CardTitle>
                      <CardDescription>Total appointments over time</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartView === "weekly" ? weeklyChartData : monthlyChartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="name" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }} 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="total" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              dot={{ fill: 'hsl(var(--primary))' }}
                              name="Total Patients"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card variant="glass" className="border-white/50 md:col-span-2">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-500" />
                        Performance Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
                          <p className="text-3xl font-bold text-primary">{appointments?.length || 0}</p>
                          <p className="text-sm text-muted-foreground">Total Appointments</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
                          <p className="text-3xl font-bold text-green-600">{completedAppointments.length}</p>
                          <p className="text-sm text-muted-foreground">Completed</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
                          <p className="text-3xl font-bold text-blue-600">{upcomingAppointments.length}</p>
                          <p className="text-sm text-muted-foreground">Upcoming</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
                          <p className="text-3xl font-bold text-amber-600">
                            {appointments?.length ? Math.round((completedAppointments.length / appointments.length) * 100) : 0}%
                          </p>
                          <p className="text-sm text-muted-foreground">Completion Rate</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                </FeatureGate>
              </TabsContent>

              {/* Availability */}
              <TabsContent value="availability">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card variant="glass" className="border-white/50">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
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
                        className="rounded-xl border border-border/50 bg-card mb-4"
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
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-destructive/5 to-transparent dark:from-destructive/10">
                      <CardTitle className="flex items-center gap-2">
                        <CalendarX className="w-5 h-5 text-red-500" />
                        Blocked Dates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {blockedSlots && blockedSlots.length > 0 ? (
                        <div className="space-y-3">
                          {blockedSlots.map((slot) => (
                            <div key={slot.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card">
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

              {/* My Team (PA Management) */}
              <TabsContent value="team">
                <FeatureGate
                  feature="teamManagement"
                  canAccess={canAccessFeature("teamManagement")}
                  upgradeMessage={getUpgradeMessage("teamManagement")}
                  variant="replace"
                >
                  {user && <PAManagementPanel doctorId={user.id} />}
                </FeatureGate>
              </TabsContent>

              {/* Organization (Enterprise Only) */}
              {canAccessFeature("multiDoctorSupport") && (
                <TabsContent value="organization">
                  {user && <OrganizationPanel userId={user.id} userEmail={user.email} userName={profile?.name || undefined} />}
                </TabsContent>
              )}

              {/* Test Reports Tab */}
              <TabsContent value="test-reports">
                {user && <PendingTestReportsPanel doctorUserId={user.id} showAll />}
              </TabsContent>

              {/* Settings */}
              <TabsContent value="settings">
                <div className="space-y-6">
                  <DoctorSettingsPanel doctorInfo={doctorInfo} userId={user?.id} profileName={profile?.name} />
                  
                  {/* Change Password Section */}
                  <Card variant="glass" className="border-border/30 dark:border-border/20">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Lock className="w-5 h-5 text-primary" />
                        Account Security
                      </CardTitle>
                      <CardDescription>Manage your account password</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Password</p>
                          <p className="text-sm text-muted-foreground">Change your account password</p>
                        </div>
                        <ChangePasswordDialog />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>

      {/* Appointment Detail Sheet */}
      <Sheet open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-gradient-to-b from-background to-muted/30">
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
  const [followUpDate, setFollowUpDate] = useState(appointment.follow_up_date || "");

  const isCompleted = appointment.status === "Completed";

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
      follow_up_date: followUpDate || null,
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
      follow_up_date: followUpDate || null,
      status: "Completed",
    });
  };

  return (
    <div className="space-y-6 pt-6">
      {/* Patient Info Header */}
      <div className="p-4 rounded-xl bg-primary/10 dark:bg-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-background flex items-center justify-center">
            <span className="text-xl font-bold text-primary">#{appointment.token_number}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground">{appointment.patient_full_name}</h3>
            <p className="text-muted-foreground">{appointment.patient_phone}</p>
          </div>
          {isCompleted && (
            <Badge className="status-completed">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </div>

      {/* View Patient History */}
      <PatientHistoryDialog
        patientName={appointment.patient_full_name || "Patient"}
        patientUserId={appointment.patient_user_id}
        doctorUserId={appointment.doctor_user_id}
        currentAppointmentId={appointment.id}
      />

      {/* Completed Notice */}
      {isCompleted && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            This prescription is finalized and cannot be edited.
          </p>
        </div>
      )}

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
              disabled={isCompleted}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Heart Rate</Label>
            <Input
              value={vitals.heartRate}
              onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
              placeholder="72 bpm"
              className="mt-1 border-border/50"
              disabled={isCompleted}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Temperature</Label>
            <Input
              value={vitals.temperature}
              onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
              placeholder="98.6°F"
              className="mt-1 border-border/50"
              disabled={isCompleted}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Weight</Label>
            <Input
              value={vitals.weight}
              onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
              placeholder="70 kg"
              className="mt-1 border-border/50"
              disabled={isCompleted}
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
          disabled={isCompleted}
        />
      </div>

      {/* Medicines */}
      <MedicineEntry 
        value={medicines}
        onChange={setMedicines}
        disabled={isCompleted}
      />

      {/* Lab Tests */}
      <div className="space-y-2">
        <Label className="font-semibold">Lab Tests</Label>
        <Textarea
          value={labTests}
          onChange={(e) => setLabTests(e.target.value)}
          placeholder="Enter lab tests if any..."
          className="border-border/50"
          disabled={isCompleted}
        />
      </div>

      {/* Follow-up Date */}
      <div className="space-y-2">
        <Label className="font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-500" />
          Follow-up Date
        </Label>
        <Input
          type="date"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          min={format(new Date(), "yyyy-MM-dd")}
          className="border-border/50"
          disabled={isCompleted}
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
          disabled={isCompleted}
        />
      </div>

      {/* Actions - Only show if not completed */}
      {!isCompleted && (
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleSave} disabled={isLoading} className="flex-1">
            Save Draft
          </Button>
          <Button variant="hero" onClick={handleComplete} disabled={isLoading} className="flex-1">
            {isLoading ? "Saving..." : "Complete"}
          </Button>
        </div>
      )}

      {/* View Prescription - Show if completed */}
      {isCompleted && (
        <div className="pt-4">
          <Link to={`/prescription/${appointment.id}`} className="block">
            <Button variant="hero" className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              View Prescription
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}