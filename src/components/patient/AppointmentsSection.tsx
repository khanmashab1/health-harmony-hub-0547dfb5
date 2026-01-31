import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format, isToday, isFuture, isPast, parseISO } from "date-fns";
import { 
  Calendar, ChevronRight, Star, Radio, Clock, 
  CheckCircle2, XCircle, CalendarClock, Search, Users, X, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveQueuePosition } from "./LiveQueuePosition";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Appointment {
  id: string;
  token_number: number;
  department: string | null;
  appointment_date: string;
  status: string;
  doctor_user_id: string;
  reason: string | null;
  patient_full_name: string | null;
  patient_user_id: string | null;
}

interface ManagedPatient {
  id: string;
  patient_user_id: string;
  patient_name: string;
  relationship: string;
}

interface AppointmentsSectionProps {
  appointments: Appointment[] | undefined;
  isLoading: boolean;
  onWriteReview: (doctorId: string) => void;
  currentUserId?: string;
  currentUserName?: string | null;
  selectedManagedPatientId?: string | null;
  selectedManagedPatientName?: string | null;
}

export function AppointmentsSection({ 
  appointments, 
  isLoading, 
  onWriteReview,
  currentUserId,
  currentUserName,
  selectedManagedPatientId,
  selectedManagedPatientName
}: AppointmentsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("today");
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch managed patients for filter
  const { data: managedPatients } = useQuery({
    queryKey: ["managed-patients", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from("managed_patients")
        .select("*")
        .eq("manager_user_id", currentUserId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as ManagedPatient[];
    },
    enabled: !!currentUserId,
  });

  // Handle appointment cancellation
  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;
    
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "Cancelled" })
        .eq("id", appointmentToCancel.id);

      if (error) throw error;

      toast({
        title: "Appointment Cancelled",
        description: `Token #${appointmentToCancel.token_number} has been cancelled successfully.`,
      });

      // Refresh appointments
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
    } catch (error: any) {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Could not cancel appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);
    }
  };

  const openCancelDialog = (apt: Appointment) => {
    setAppointmentToCancel(apt);
    setCancelDialogOpen(true);
  };

  // Categorize appointments
  const categorizeAppointments = () => {
    if (!appointments) return { today: [], upcoming: [], completed: [], cancelled: [] };

    const today: Appointment[] = [];
    const upcoming: Appointment[] = [];
    const completed: Appointment[] = [];
    const cancelled: Appointment[] = [];

    appointments.forEach(apt => {
      const aptDate = parseISO(apt.appointment_date);
      
      if (apt.status === "Cancelled") {
        cancelled.push(apt);
      } else if (apt.status === "Completed") {
        completed.push(apt);
      } else if (isToday(aptDate)) {
        today.push(apt);
      } else if (isFuture(aptDate)) {
        upcoming.push(apt);
      } else if (isPast(aptDate) && apt.status !== "Completed") {
        // Past pending appointments go to today for visibility
        today.push(apt);
      }
    });

    // Sort by token number for today, date for others
    today.sort((a, b) => a.token_number - b.token_number);
    upcoming.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
    completed.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());
    cancelled.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

    return { today, upcoming, completed, cancelled };
  };

  const { today, upcoming, completed, cancelled } = categorizeAppointments();

  // Filter appointments based on search and patient filter
  const filterAppointments = (apts: Appointment[]) => {
    let filtered = apts;

    // When a managed patient is selected from PatientSwitcher, only show their appointments
    if (selectedManagedPatientId && selectedManagedPatientName) {
      filtered = filtered.filter(apt => 
        apt.patient_full_name === selectedManagedPatientName
      );
    } else if (!selectedManagedPatientId) {
      // When viewing "self", filter based on the dropdown patientFilter
      if (patientFilter !== "all") {
        if (patientFilter === "self") {
          // Show only logged-in user's own appointments
          filtered = filtered.filter(apt => 
            apt.patient_user_id === currentUserId || 
            apt.patient_full_name === currentUserName
          );
        } else {
          // Filter by specific managed patient from dropdown
          const managedPatient = managedPatients?.find(p => p.id === patientFilter);
          if (managedPatient) {
            filtered = filtered.filter(apt => 
              apt.patient_full_name === managedPatient.patient_name
            );
          }
        }
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.department?.toLowerCase().includes(query) ||
        apt.token_number.toString().includes(query) ||
        apt.id.slice(0, 8).toLowerCase().includes(query) ||
        apt.reason?.toLowerCase().includes(query) ||
        apt.patient_full_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getAppointmentsByTab = () => {
    switch (activeTab) {
      case "today": return filterAppointments(today);
      case "upcoming": return filterAppointments(upcoming);
      case "completed": return filterAppointments(completed);
      case "cancelled": return filterAppointments(cancelled);
      default: return [];
    }
  };

  const currentAppointments = getAppointmentsByTab();
  const hasPatients = managedPatients && managedPatients.length > 0;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Upcoming": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "In Progress": return "bg-emerald-500 text-white animate-pulse";
      case "Pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "Cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const EmptyState = ({ message, icon: Icon }: { message: string; icon: React.ElementType }) => (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{message}</p>
      {activeTab === "today" || activeTab === "upcoming" ? (
        <Link to="/booking" className="mt-4 inline-block">
          <Button variant="hero" size="sm">Book Appointment</Button>
        </Link>
      ) : null}
    </div>
  );

  const AppointmentCard = ({ apt, index }: { apt: Appointment; index: number }) => {
    const isActive = apt.status === "Upcoming" || apt.status === "In Progress" || apt.status === "Pending";
    const aptDate = parseISO(apt.appointment_date);
    const isTodayAppointment = isToday(aptDate);

    return (
      <motion.div
        key={apt.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
      >
        <motion.div
          whileHover={{ scale: 1.005 }}
          className={`relative overflow-hidden rounded-xl border transition-all ${
            isTodayAppointment && isActive
              ? "border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-md"
              : "border-border/50 bg-card hover:bg-accent/5 dark:bg-card/80"
          }`}
        >
          {/* Priority indicator for today's appointments */}
          {isTodayAppointment && isActive && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60" />
          )}
          
          <div className="p-4 pl-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Token Badge */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                  isTodayAppointment && isActive
                    ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg"
                    : "bg-gradient-to-br from-primary/20 to-primary/30 dark:from-primary/30 dark:to-primary/40"
                }`}>
                  <span className={`text-xs font-medium ${isTodayAppointment && isActive ? "text-white/80" : "text-muted-foreground"}`}>
                    Token
                  </span>
                  <span className={`text-lg font-bold ${isTodayAppointment && isActive ? "text-white" : "text-primary"}`}>
                    #{apt.token_number}
                  </span>
                </div>

                {/* Appointment Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{apt.department || "General"}</p>
                    {isTodayAppointment && isActive && (
                      <span className="flex items-center gap-1 text-green-500 text-xs">
                        <Radio className="w-3 h-3 animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {isTodayAppointment ? "Today" : format(aptDate, "MMM d, yyyy")}
                    </span>
                    {apt.reason && (
                      <span className="truncate max-w-[150px]" title={apt.reason}>
                        {apt.reason}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    ID: {apt.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={getStatusBadgeClass(apt.status)}>
                  {apt.status}
                </Badge>
                {/* Cancel button for upcoming/pending appointments */}
                {(apt.status === "Upcoming" || apt.status === "Pending") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCancelDialog(apt);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <X className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Cancel</span>
                  </Button>
                )}
                {apt.status === "Completed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWriteReview(apt.doctor_user_id);
                    }}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  >
                    <Star className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Review</span>
                  </Button>
                )}
                <Link to={apt.status === "Completed" ? `/prescription/${apt.id}` : `/token/${apt.id}`}>
                  <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Live Queue Position for active appointments */}
        {isActive && isTodayAppointment && (
          <LiveQueuePosition
            doctorId={apt.doctor_user_id}
            patientTokenNumber={apt.token_number}
            appointmentDate={apt.appointment_date}
            appointmentStatus={apt.status}
          />
        )}
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <Card variant="glass" className="border-border/30">
        <CardHeader className="border-b border-border/30">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card variant="glass" className="border-border/30 dark:border-border/20">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Your Appointments
              </CardTitle>
              
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by dept, token, name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Patient Filter - Only show if there are managed patients AND no patient is selected from PatientSwitcher */}
            {hasPatients && !selectedManagedPatientId && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Filter by patient:</span>
                </div>
                <Select value={patientFilter} onValueChange={setPatientFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] h-9">
                    <SelectValue placeholder="All Patients" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">All Patients</SelectItem>
                    <SelectItem value="self">{currentUserName || "Myself"}</SelectItem>
                    {managedPatients?.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.patient_name} ({patient.relationship})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Show active patient indicator when a managed patient is selected */}
            {selectedManagedPatientId && selectedManagedPatientName && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Showing appointments for:</span>
                <span className="font-medium text-primary">{selectedManagedPatientName}</span>
              </div>
            )}
          </div>
        </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 bg-muted/50 p-1 rounded-lg h-auto">
            <TabsTrigger 
              value="today" 
              className="flex items-center gap-1.5 text-xs sm:text-sm py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Today</span>
              {today.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/20 data-[state=active]:bg-white/20">
                  {today.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming"
              className="flex items-center gap-1.5 text-xs sm:text-sm py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upcoming</span>
              {upcoming.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-blue-500/20">
                  {upcoming.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="flex items-center gap-1.5 text-xs sm:text-sm py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Completed</span>
              {completed.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-green-500/20">
                  {completed.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="cancelled"
              className="flex items-center gap-1.5 text-xs sm:text-sm py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cancelled</span>
              {cancelled.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500/20">
                  {cancelled.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-3 mt-4">
            {currentAppointments.length > 0 ? (
              currentAppointments.map((apt, index) => (
                <AppointmentCard key={apt.id} apt={apt} index={index} />
              ))
            ) : (
              <EmptyState message="No appointments for today" icon={Clock} />
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {currentAppointments.length > 0 ? (
              currentAppointments.map((apt, index) => (
                <AppointmentCard key={apt.id} apt={apt} index={index} />
              ))
            ) : (
              <EmptyState message="No upcoming appointments" icon={CalendarClock} />
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3 mt-4">
            {currentAppointments.length > 0 ? (
              currentAppointments.map((apt, index) => (
                <AppointmentCard key={apt.id} apt={apt} index={index} />
              ))
            ) : (
              <EmptyState message="No completed appointments yet" icon={CheckCircle2} />
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-3 mt-4">
            {currentAppointments.length > 0 ? (
              currentAppointments.map((apt, index) => (
                <AppointmentCard key={apt.id} apt={apt} index={index} />
              ))
            ) : (
              <EmptyState message="No cancelled appointments" icon={XCircle} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    {/* Cancel Confirmation Dialog */}
    <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
      <AlertDialogContent className="bg-background">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Cancel Appointment
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this appointment?
            {appointmentToCancel && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-1">
                <p><strong>Token:</strong> #{appointmentToCancel.token_number}</p>
                <p><strong>Department:</strong> {appointmentToCancel.department || "General"}</p>
                <p><strong>Date:</strong> {format(parseISO(appointmentToCancel.appointment_date), "MMM d, yyyy")}</p>
                {appointmentToCancel.patient_full_name && (
                  <p><strong>Patient:</strong> {appointmentToCancel.patient_full_name}</p>
                )}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>Keep Appointment</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancelAppointment}
            disabled={isCancelling}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isCancelling ? "Cancelling..." : "Yes, Cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
