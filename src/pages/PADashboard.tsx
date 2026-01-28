import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import {
  UserCog,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  CalendarX,
  Clock,
  LogOut,
  Eye,
  Trash2,
  Users,
  History,
  Bell,
  Download,
  Filter,
  Search,
  Activity,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Layout } from "@/components/layout/Layout";
import { useRequireAuth, useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { VitalsEntryDialog } from "@/components/pa/VitalsEntryDialog";
import { exportPaymentHistoryCSV, exportPaymentHistoryPDF } from "@/lib/exportUtils";

export default function PADashboard() {
  const { user, profile, loading } = useRequireAuth(["pa"]);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [blockDate, setBlockDate] = useState<Date | undefined>();
  const [blockReason, setBlockReason] = useState("");
  
  // Payment confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  
  // Payment history filter state
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [historyDateRange, setHistoryDateRange] = useState<string>("all");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  
  // Pending payments filter state
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [pendingPaymentFilter, setPendingPaymentFilter] = useState<string>("all");
  
  // Vitals dialog state
  const [vitalsDialogOpen, setVitalsDialogOpen] = useState(false);
  const [selectedVitalsAppointment, setSelectedVitalsAppointment] = useState<any>(null);

  // Fetch PA assignments
  const { data: assignments } = useQuery({
    queryKey: ["pa-assignments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pa_assignments")
        .select("*")
        .eq("pa_user_id", user!.id);
      if (error) throw error;

      const doctorIds = data.map(a => a.doctor_user_id);
      if (doctorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", doctorIds);
        
        const { data: doctors } = await supabase
          .from("doctors")
          .select("user_id, specialty")
          .in("user_id", doctorIds);

        return data.map(a => ({
          ...a,
          doctorProfile: profiles?.find(p => p.id === a.doctor_user_id),
          doctorInfo: doctors?.find(d => d.user_id === a.doctor_user_id),
        }));
      }
      return data;
    },
    enabled: !!user,
  });

  const assignedDoctorIds = assignments?.map(a => a.doctor_user_id) || [];

  // Fetch pending payments (includes both Online and Cash pending)
  const { data: pendingPayments, isLoading: loadingPayments } = useQuery({
    queryKey: ["pa-pending-payments", assignedDoctorIds],
    queryFn: async () => {
      if (assignedDoctorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .in("doctor_user_id", assignedDoctorIds)
        .eq("payment_status", "Pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: assignedDoctorIds.length > 0,
  });

  // Fetch completed payments for today (daily view)
  const { data: completedPaymentsToday } = useQuery({
    queryKey: ["pa-completed-payments-today", assignedDoctorIds],
    queryFn: async () => {
      if (assignedDoctorIds.length === 0) return [];
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .in("doctor_user_id", assignedDoctorIds)
        .eq("appointment_date", todayStr)
        .eq("status", "Completed")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: assignedDoctorIds.length > 0,
  });

  // Fetch all appointments
  const { data: appointments } = useQuery({
    queryKey: ["pa-appointments", assignedDoctorIds],
    queryFn: async () => {
      if (assignedDoctorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .in("doctor_user_id", assignedDoctorIds)
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: assignedDoctorIds.length > 0,
  });

  // Fetch blocked slots
  const { data: blockedSlots } = useQuery({
    queryKey: ["pa-blocked-slots", assignedDoctorIds],
    queryFn: async () => {
      if (assignedDoctorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("blocked_slots")
        .select("*")
        .in("doctor_user_id", assignedDoctorIds)
        .order("blocked_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: assignedDoctorIds.length > 0,
  });

  // Fetch payment history (confirmed/rejected payments)
  const { data: paymentHistory } = useQuery({
    queryKey: ["pa-payment-history", assignedDoctorIds],
    queryFn: async () => {
      if (assignedDoctorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .in("doctor_user_id", assignedDoctorIds)
        .eq("payment_method", "Online")
        .in("payment_status", ["Confirmed", "NA"])
        .not("doctor_comments", "is", null)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: assignedDoctorIds.length > 0,
  });

  // Real-time subscription for new payments
  useEffect(() => {
    if (assignedDoctorIds.length === 0) return;

    const channel = supabase
      .channel('pa-payments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          const newRecord = payload.new as any;
          // Check if this appointment is for one of our assigned doctors
          if (newRecord && assignedDoctorIds.includes(newRecord.doctor_user_id)) {
            // Show toast for new pending payments
            if (payload.eventType === 'INSERT' || 
                (payload.eventType === 'UPDATE' && newRecord.payment_status === 'Pending' && newRecord.payment_method === 'Online')) {
              toast({
                title: "New Payment Pending",
                description: `${newRecord.patient_full_name} uploaded a receipt`,
              });
            }
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["pa-pending-payments"] });
            queryClient.invalidateQueries({ queryKey: ["pa-appointments"] });
            queryClient.invalidateQueries({ queryKey: ["pa-payment-history"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assignedDoctorIds, queryClient, toast]);

  // Download receipt as PDF
  const downloadReceiptAsPDF = async (receiptPath: string, patientName: string) => {
    setDownloadingReceipt(true);
    try {
      const { data, error } = await supabase.storage
        .from("receipts")
        .createSignedUrl(receiptPath, 60);
      if (error) throw error;
      
      // Fetch the image and convert to PDF
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      
      // Create a download link for the image (as PDF would require additional library)
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${patientName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.${blob.type.split('/')[1] || 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ title: "Receipt downloaded" });
    } catch (error) {
      console.error("Failed to download receipt:", error);
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloadingReceipt(false);
    }
  };

  // Load receipt with signed URL (receipts bucket is private)
  const loadReceipt = async (receiptPath: string) => {
    setLoadingReceipt(true);
    setSelectedReceipt(receiptPath);
    try {
      const { data, error } = await supabase.storage
        .from("receipts")
        .createSignedUrl(receiptPath, 300); // 5 minutes expiry
      if (error) throw error;
      setReceiptUrl(data.signedUrl);
    } catch (error) {
      console.error("Failed to load receipt:", error);
      setReceiptUrl(null);
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Send payment email notification
  const sendPaymentEmail = async (appointment: any, status: "confirmed" | "rejected", note?: string) => {
    if (!appointment.patient_email) {
      console.log("No patient email, skipping notification");
      return;
    }

    const doctorName = (assignments?.find(a => a.doctor_user_id === appointment.doctor_user_id) as any)?.doctorProfile?.name || "Doctor";
    
    const subject = status === "confirmed" 
      ? `Payment Confirmed - Appointment with Dr. ${doctorName}`
      : `Payment Issue - Appointment with Dr. ${doctorName}`;
    
    const html = status === "confirmed" 
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">✓ Payment Confirmed</h2>
          <p>Dear ${appointment.patient_full_name},</p>
          <p>Your payment for the appointment with <strong>Dr. ${doctorName}</strong> has been confirmed.</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Date:</strong> ${format(new Date(appointment.appointment_date), "MMMM d, yyyy")}</p>
            <p style="margin: 4px 0;"><strong>Token Number:</strong> #${appointment.token_number}</p>
          </div>
          ${note ? `<p><strong>Note from PA:</strong> ${note}</p>` : ""}
          <p>Your appointment status is now <strong>Upcoming</strong>. Please arrive on time.</p>
          <p>Thank you!</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Payment Issue</h2>
          <p>Dear ${appointment.patient_full_name},</p>
          <p>We encountered an issue with your payment for the appointment with <strong>Dr. ${doctorName}</strong>.</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Date:</strong> ${format(new Date(appointment.appointment_date), "MMMM d, yyyy")}</p>
            <p style="margin: 4px 0;"><strong>Token Number:</strong> #${appointment.token_number}</p>
          </div>
          ${note ? `<p><strong>Reason:</strong> ${note}</p>` : ""}
          <p>Your appointment has been cancelled. Please contact us or rebook if needed.</p>
        </div>
      `;

    try {
      await supabase.functions.invoke("send-email", {
        body: { to: appointment.patient_email, subject, html }
      });
      
      // Log the email
      await supabase.from("email_logs").insert({
        recipient_email: appointment.patient_email,
        email_type: status === "confirmed" ? "payment_confirmed" : "payment_rejected",
        subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        appointment_id: appointment.id,
      });
    } catch (error) {
      console.error("Failed to send email:", error);
      // Log failed email
      await supabase.from("email_logs").insert({
        recipient_email: appointment.patient_email,
        email_type: status === "confirmed" ? "payment_confirmed" : "payment_rejected",
        subject,
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        appointment_id: appointment.id,
      });
    }
  };

  // Mutations
  const confirmPayment = useMutation({
    mutationFn: async ({ appointment, note }: { appointment: any; note?: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ 
          payment_status: "Confirmed", 
          status: "Upcoming",
          doctor_comments: note ? `Payment confirmed: ${note}` : undefined
        })
        .eq("id", appointment.id);
      if (error) throw error;
      
      // Send email notification
      await sendPaymentEmail(appointment, "confirmed", note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["pa-appointments"] });
      toast({ title: "Payment confirmed", description: "Email notification sent to patient" });
      setConfirmDialogOpen(false);
      setSelectedPayment(null);
      setPaymentNote("");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const rejectPayment = useMutation({
    mutationFn: async ({ appointment, note }: { appointment: any; note?: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ 
          status: "Cancelled",
          doctor_comments: note ? `Payment rejected: ${note}` : "Payment rejected"
        })
        .eq("id", appointment.id);
      if (error) throw error;
      
      // Send email notification
      await sendPaymentEmail(appointment, "rejected", note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["pa-pending-payments"] });
      toast({ title: "Payment rejected", description: "Appointment cancelled and patient notified" });
      setRejectDialogOpen(false);
      setSelectedPayment(null);
      setPaymentNote("");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const cancelAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "Cancelled" })
        .eq("id", appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["pa-pending-payments"] });
      toast({ title: "Appointment cancelled" });
    },
  });

  const openConfirmDialog = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentNote("");
    setConfirmDialogOpen(true);
  };

  const openRejectDialog = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentNote("");
    setRejectDialogOpen(true);
  };

  const blockSlot = useMutation({
    mutationFn: async (doctorId: string) => {
      if (!blockDate) return;
      const { error } = await supabase.from("blocked_slots").insert({
        doctor_user_id: doctorId,
        blocked_date: format(blockDate, "yyyy-MM-dd"),
        reason: blockReason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-blocked-slots"] });
      toast({ title: "Slot blocked" });
      setBlockDate(undefined);
      setBlockReason("");
    },
  });

  const unblockSlot = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from("blocked_slots").delete().eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-blocked-slots"] });
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-background to-brand-50/20">
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-background to-brand-50/20 dark:from-background dark:via-background dark:to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <UserCog className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{profile?.name || "PA Dashboard"}</h1>
                <p className="text-muted-foreground font-medium">Personal Assistant</p>
              </div>
            </div>
          </motion.div>

          {/* Assigned Doctors */}
          {assignments && assignments.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-8"
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Assigned Doctors</h2>
              <div className="flex flex-wrap gap-2">
                {assignments.map((a: any) => (
                  <Badge key={a.id} variant="secondary" className="py-2 px-4 bg-gradient-to-r from-purple-100 to-brand-100 dark:from-purple-900/30 dark:to-primary/20 text-purple-700 dark:text-purple-300 border-0">
                    Dr. {a.doctorProfile?.name || "Unknown"} — {a.doctorInfo?.specialty || "Specialist"}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: "Pending Payments", value: pendingPayments?.length || 0, icon: CreditCard, color: "from-yellow-500 to-orange-500" },
              { label: "Today's Appointments", value: appointments?.filter(a => a.appointment_date === format(new Date(), "yyyy-MM-dd")).length || 0, icon: Calendar, color: "from-blue-500 to-blue-600" },
              { label: "Blocked Slots", value: blockedSlots?.length || 0, icon: CalendarX, color: "from-red-500 to-red-600" },
              { label: "Doctors Assigned", value: assignments?.length || 0, icon: Users, color: "from-purple-500 to-purple-600" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card variant="glass" className="border-border/50 dark:border-border/30 hover:shadow-lg transition-all dark:bg-card/50">
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
            <Tabs defaultValue="payments" className="space-y-6">
              <TabsList className="bg-muted/80 dark:bg-muted/50 backdrop-blur-sm border border-border/50 p-1.5 rounded-xl shadow-sm flex-wrap h-auto gap-1">
                <TabsTrigger value="payments" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <CreditCard className="w-4 h-4 mr-1 sm:mr-2" />
                  Payments
                  {pendingPayments && pendingPayments.length > 0 && (
                    <Badge variant="destructive" className="ml-1 sm:ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {pendingPayments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <History className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Payment History</span>
                  <span className="sm:hidden">History</span>
                </TabsTrigger>
                <TabsTrigger value="appointments" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Appointments</span>
                  <span className="sm:hidden">Appts</span>
                </TabsTrigger>
                <TabsTrigger value="vitals" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Activity className="w-4 h-4 mr-1 sm:mr-2" />
                  Vitals
                </TabsTrigger>
                <TabsTrigger value="slots" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <CalendarX className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Blocked Slots</span>
                  <span className="sm:hidden">Slots</span>
                </TabsTrigger>
              </TabsList>

              {/* Pending Payments */}
              <TabsContent value="payments">
                <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-900/10 dark:to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                      Payment Management
                    </CardTitle>
                    <CardDescription>Review pending payments and daily completed transactions</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* Sub-tabs for Pending / Completed Today */}
                    <Tabs defaultValue="pending" className="space-y-4">
                      <TabsList className="bg-muted/60 dark:bg-muted/30 p-1 rounded-lg">
                        <TabsTrigger value="pending" className="rounded-md text-sm data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
                          Pending
                          {pendingPayments && pendingPayments.length > 0 && (
                            <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                              {pendingPayments.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="completed-today" className="rounded-md text-sm data-[state=active]:bg-green-500 data-[state=active]:text-white">
                          Completed Today
                          {completedPaymentsToday && completedPaymentsToday.length > 0 && (
                            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                              {completedPaymentsToday.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                      </TabsList>

                      {/* Pending Payments Sub-Tab */}
                      <TabsContent value="pending" className="space-y-4 mt-4">
                        {/* Filters for pending */}
                        <div className="flex flex-col md:flex-row gap-3 p-4 rounded-xl bg-muted/30 border border-border/30">
                          <div className="flex items-center gap-2 flex-1">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by name or token ID..."
                              value={pendingSearchTerm}
                              onChange={(e) => setPendingSearchTerm(e.target.value)}
                              className="flex-1 border-border/50"
                            />
                          </div>
                          <Select value={pendingPaymentFilter} onValueChange={setPendingPaymentFilter}>
                            <SelectTrigger className="w-[140px] border-border/50">
                              <SelectValue placeholder="Payment Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {loadingPayments ? (
                          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
                        ) : (() => {
                          // Filter pending payments
                          const filtered = (pendingPayments || []).filter((payment) => {
                            // Payment type filter
                            if (pendingPaymentFilter === "online" && payment.payment_method !== "Online") return false;
                            if (pendingPaymentFilter === "cash" && payment.payment_method !== "Cash") return false;
                            
                            // Search filter (by name, token, or ID)
                            if (pendingSearchTerm) {
                              const term = pendingSearchTerm.toLowerCase();
                              const nameMatch = payment.patient_full_name?.toLowerCase().includes(term);
                              const tokenMatch = `#${payment.token_number}`.includes(term) || payment.token_number.toString().includes(term);
                              const idMatch = payment.id.toLowerCase().includes(term);
                              if (!nameMatch && !tokenMatch && !idMatch) return false;
                            }
                            
                            return true;
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="text-center py-12">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center mb-4">
                                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <p className="text-muted-foreground font-medium">
                                  {pendingSearchTerm || pendingPaymentFilter !== "all" 
                                    ? "No payments match your filters" 
                                    : "No pending payments"}
                                </p>
                                {(pendingSearchTerm || pendingPaymentFilter !== "all") && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="mt-2"
                                    onClick={() => {
                                      setPendingSearchTerm("");
                                      setPendingPaymentFilter("all");
                                    }}
                                  >
                                    Clear Filters
                                  </Button>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              <p className="text-sm text-muted-foreground">
                                Showing {filtered.length} of {pendingPayments?.length || 0} pending payments
                              </p>
                              {filtered.map((payment) => (
                                <motion.div 
                                  key={payment.id} 
                                  whileHover={{ scale: 1.01 }}
                                  className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 dark:bg-card/30 hover:shadow-md transition-all"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                      payment.payment_method === "Online" 
                                        ? "bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30"
                                        : "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30"
                                    }`}>
                                      <CreditCard className={`w-6 h-6 ${
                                        payment.payment_method === "Online" 
                                          ? "text-yellow-600 dark:text-yellow-500" 
                                          : "text-blue-600 dark:text-blue-500"
                                      }`} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold">{payment.patient_full_name}</p>
                                        <Badge variant="outline" className={`text-xs ${
                                          payment.payment_method === "Online"
                                            ? "border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
                                            : "border-blue-500/50 text-blue-600 dark:text-blue-400"
                                        }`}>
                                          {payment.payment_method}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {format(new Date(payment.appointment_date), "MMM d, yyyy")} • Token #{payment.token_number}
                                      </p>
                                      <p className="text-xs text-muted-foreground/70 font-mono">
                                        ID: {payment.id.slice(0, 8)}...
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {payment.receipt_path && (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => loadReceipt(payment.receipt_path!)}
                                        className="hover:bg-brand-50"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="hero"
                                      onClick={() => openConfirmDialog(payment)}
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-1" />
                                      Confirm
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      onClick={() => openRejectDialog(payment)}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          );
                        })()}
                      </TabsContent>

                      {/* Completed Today Sub-Tab */}
                      <TabsContent value="completed-today" className="space-y-4 mt-4">
                        {completedPaymentsToday && completedPaymentsToday.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              {completedPaymentsToday.length} completed payments today
                            </p>
                            {completedPaymentsToday.map((payment) => (
                              <motion.div 
                                key={payment.id} 
                                whileHover={{ scale: 1.005 }}
                                className="flex items-center justify-between p-4 rounded-xl border border-green-500/30 bg-green-50/50 dark:bg-green-900/10 hover:shadow-md transition-all"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold">{payment.patient_full_name}</p>
                                      <Badge className="status-completed text-xs">Completed</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Token #{payment.token_number} • {payment.payment_method}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                    {payment.payment_status === "Confirmed" ? "Paid" : payment.payment_status}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(payment.updated_at), "h:mm a")}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
                              <Calendar className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground font-medium">No completed payments today</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment History */}
              <TabsContent value="history">
                <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-900/10 dark:to-transparent">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <History className="w-5 h-5 text-green-600 dark:text-green-400" />
                          Payment History
                        </CardTitle>
                        <CardDescription>Recent payment confirmations and rejections with notes</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => paymentHistory && exportPaymentHistoryCSV(paymentHistory)}
                          disabled={!paymentHistory || paymentHistory.length === 0}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => paymentHistory && exportPaymentHistoryPDF(paymentHistory)}
                          disabled={!paymentHistory || paymentHistory.length === 0}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 rounded-xl bg-muted/30 border border-border/30">
                      <div className="flex items-center gap-2 flex-1">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by patient name..."
                          value={historySearchTerm}
                          onChange={(e) => setHistorySearchTerm(e.target.value)}
                          className="flex-1 border-border/50"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                          <SelectTrigger className="w-[140px] border-border/50">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={historyDateRange} onValueChange={setHistoryDateRange}>
                          <SelectTrigger className="w-[140px] border-border/50">
                            <SelectValue placeholder="Date Range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="7days">Last 7 Days</SelectItem>
                            <SelectItem value="30days">Last 30 Days</SelectItem>
                            <SelectItem value="90days">Last 90 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {paymentHistory && paymentHistory.length > 0 ? (
                      (() => {
                        // Apply filters
                        const filteredHistory = paymentHistory.filter((payment) => {
                          const isConfirmed = payment.status !== "Cancelled";
                          
                          // Status filter
                          if (historyStatusFilter === "confirmed" && !isConfirmed) return false;
                          if (historyStatusFilter === "rejected" && isConfirmed) return false;
                          
                          // Date range filter
                          const paymentDate = new Date(payment.updated_at);
                          const now = new Date();
                          if (historyDateRange === "7days" && isBefore(paymentDate, subDays(now, 7))) return false;
                          if (historyDateRange === "30days" && isBefore(paymentDate, subDays(now, 30))) return false;
                          if (historyDateRange === "90days" && isBefore(paymentDate, subDays(now, 90))) return false;
                          
                          // Search filter
                          if (historySearchTerm && !payment.patient_full_name?.toLowerCase().includes(historySearchTerm.toLowerCase())) {
                            return false;
                          }
                          
                          return true;
                        });
                        
                        if (filteredHistory.length === 0) {
                          return (
                            <div className="text-center py-12">
                              <Filter className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                              <p className="text-muted-foreground">No payments match your filters</p>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-2"
                                onClick={() => {
                                  setHistoryStatusFilter("all");
                                  setHistoryDateRange("all");
                                  setHistorySearchTerm("");
                                }}
                              >
                                Clear Filters
                              </Button>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground mb-2">
                              Showing {filteredHistory.length} of {paymentHistory.length} payments
                            </p>
                            {filteredHistory.map((payment) => {
                              const isConfirmed = payment.status !== "Cancelled";
                              const note = payment.doctor_comments?.replace(/^Payment (confirmed|rejected): /, "") || "";
                              return (
                                <motion.div 
                                  key={payment.id} 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="p-4 rounded-xl border border-border/50 bg-card dark:bg-card/50"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        isConfirmed 
                                          ? "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30" 
                                          : "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30"
                                      }`}>
                                        {isConfirmed ? (
                                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        ) : (
                                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-semibold">{payment.patient_full_name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {format(new Date(payment.appointment_date), "MMM d, yyyy")} • Token #{payment.token_number}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {payment.receipt_path && (
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => downloadReceiptAsPDF(payment.receipt_path!, payment.patient_full_name || "patient")}
                                          disabled={downloadingReceipt}
                                          className="h-8 w-8"
                                          title="Download receipt"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </Button>
                                      )}
                                      <Badge className={isConfirmed ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"}>
                                        {isConfirmed ? "Confirmed" : "Rejected"}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(payment.updated_at), "MMM d, h:mm a")}
                                      </span>
                                    </div>
                                  </div>
                                  {note && (
                                    <div className="mt-3 p-3 rounded-lg bg-muted/30 dark:bg-muted/20 border border-border/30">
                                      <p className="text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground">Note:</span> {note}
                                      </p>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-16">
                        <History className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No payment history yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appointments">
                <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      All Appointments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {appointments && appointments.length > 0 ? (
                      <div className="space-y-3">
                        {appointments.slice(0, 20).map((apt) => (
                          <motion.div 
                            key={apt.id} 
                            whileHover={{ scale: 1.01 }}
                            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 dark:bg-card/30 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/30 dark:from-primary/10 dark:to-primary/20 flex items-center justify-center">
                                <span className="font-bold text-primary">#{apt.token_number}</span>
                              </div>
                              <div>
                                <p className="font-semibold">{apt.patient_full_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(apt.appointment_date), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Payment Status Indicator */}
                              {apt.payment_method === "Online" && (
                                <Badge 
                                  variant={apt.payment_status === "Confirmed" ? "default" : "outline"}
                                  className={
                                    apt.payment_status === "Confirmed" 
                                      ? "bg-green-100 text-green-700 border-green-200" 
                                      : apt.payment_status === "Pending"
                                      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                      : "bg-muted text-muted-foreground"
                                  }
                                >
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  {apt.payment_status}
                                </Badge>
                              )}
                              {apt.payment_method === "Cash" && (
                                <Badge variant="outline" className="bg-muted/50 text-muted-foreground">
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  Cash
                                </Badge>
                              )}
                              <Badge className={
                                apt.status === "Completed" ? "status-completed" :
                                apt.status === "Upcoming" ? "status-upcoming" :
                                apt.status === "Cancelled" ? "status-cancelled" : "status-pending"
                              }>
                                {apt.status}
                              </Badge>
                              {apt.status === "Pending" && (
                                <Button size="sm" variant="destructive" onClick={() => cancelAppointment.mutate(apt.id)}>
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No appointments</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Vitals Entry Tab */}
              <TabsContent value="vitals">
                <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-pink-50/50 to-transparent dark:from-pink-900/10 dark:to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                      Patient Vitals Entry
                    </CardTitle>
                    <CardDescription>Record vitals for patients before their consultation</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {(() => {
                      const todayStr = format(new Date(), "yyyy-MM-dd");
                      // Show today's appointments that are ready for vitals
                      // Include: Upcoming status OR any Cash payment today
                      const todayAppts = appointments?.filter(
                        (a) => a.appointment_date === todayStr && 
                               (a.status === "Upcoming" || 
                                (a.status === "Pending" && a.payment_method === "Cash"))
                      ) || [];
                      
                      if (todayAppts.length === 0) {
                        return (
                          <div className="text-center py-16">
                            <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No patients waiting for vitals today</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">
                              Patients with confirmed appointments will appear here
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-3">
                          {todayAppts.map((apt) => {
                            const hasVitals = apt.vitals_bp || apt.vitals_heart_rate || apt.vitals_temperature || apt.vitals_weight;
                            return (
                              <motion.div 
                                key={apt.id}
                                whileHover={{ scale: 1.01 }}
                                className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 dark:bg-card/30 hover:shadow-md transition-all"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    hasVitals 
                                      ? "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30" 
                                      : "bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30"
                                  }`}>
                                    <span className="font-bold text-foreground">#{apt.token_number}</span>
                                  </div>
                                  <div>
                                    <p className="font-semibold">{apt.patient_full_name}</p>
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                      {hasVitals ? (
                                        <>
                                          {apt.vitals_bp && <Badge variant="outline" className="text-xs">BP: {apt.vitals_bp}</Badge>}
                                          {apt.vitals_heart_rate && <Badge variant="outline" className="text-xs">HR: {apt.vitals_heart_rate}</Badge>}
                                          {apt.vitals_temperature && <Badge variant="outline" className="text-xs">Temp: {apt.vitals_temperature}°F</Badge>}
                                          {apt.vitals_weight && <Badge variant="outline" className="text-xs">Wt: {apt.vitals_weight}kg</Badge>}
                                        </>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">No vitals recorded</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant={hasVitals ? "outline" : "default"}
                                  onClick={() => {
                                    setSelectedVitalsAppointment(apt);
                                    setVitalsDialogOpen(true);
                                  }}
                                >
                                  <Activity className="w-4 h-4 mr-2" />
                                  {hasVitals ? "Update" : "Record"} Vitals
                                </Button>
                              </motion.div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Blocked Slots */}
              <TabsContent value="slots">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10 dark:to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <CalendarX className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Block a Date
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <CalendarComponent
                        mode="single"
                        selected={blockDate}
                        onSelect={setBlockDate}
                        className="rounded-xl border border-border/50 bg-card/50 dark:bg-card/30 mb-4"
                      />
                      {blockDate && assignments && assignments.length > 0 && (
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
                              className="mt-2 border-border/50"
                            />
                          </div>
                          <div className="space-y-2">
                            {assignments.map((a: any) => (
                              <Button
                                key={a.id}
                                onClick={() => blockSlot.mutate(a.doctor_user_id)}
                                variant="outline"
                                className="w-full justify-start hover:bg-purple-50 dark:hover:bg-purple-900/20"
                              >
                                Block for Dr. {a.doctorProfile?.name}
                              </Button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-900/10 dark:to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <CalendarX className="w-5 h-5 text-red-500 dark:text-red-400" />
                        Current Blocked Dates
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
            </Tabs>
          </motion.div>
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => { setSelectedReceipt(null); setReceiptUrl(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl bg-muted/30 overflow-hidden min-h-[200px] flex items-center justify-center">
            {loadingReceipt ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading receipt...</p>
              </div>
            ) : receiptUrl ? (
              <img 
                src={receiptUrl}
                alt="Payment Receipt"
                className="w-full h-auto max-h-[70vh] object-contain"
                onError={() => setReceiptUrl(null)}
              />
            ) : (
              <div className="p-8 text-center">
                <XCircle className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Unable to load receipt image</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Payment Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Confirm Payment
            </DialogTitle>
            <DialogDescription>
              Confirm payment for {selectedPayment?.patient_full_name}'s appointment on{" "}
              {selectedPayment && format(new Date(selectedPayment.appointment_date), "MMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="confirm-note">Add a note (optional)</Label>
              <Textarea
                id="confirm-note"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g., Payment verified via EasyPaisa transaction #..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="hero" 
              onClick={() => selectedPayment && confirmPayment.mutate({ appointment: selectedPayment, note: paymentNote })}
              disabled={confirmPayment.isPending}
            >
              {confirmPayment.isPending ? "Confirming..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Reject Payment
            </DialogTitle>
            <DialogDescription>
              Reject payment and cancel appointment for {selectedPayment?.patient_full_name} on{" "}
              {selectedPayment && format(new Date(selectedPayment.appointment_date), "MMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reject-note">Reason for rejection</Label>
              <Textarea
                id="reject-note"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g., Receipt not clear, incorrect amount, etc."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedPayment && rejectPayment.mutate({ appointment: selectedPayment, note: paymentNote })}
              disabled={rejectPayment.isPending}
            >
              {rejectPayment.isPending ? "Rejecting..." : "Reject & Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vitals Entry Dialog */}
      {selectedVitalsAppointment && (
        <VitalsEntryDialog
          open={vitalsDialogOpen}
          onOpenChange={setVitalsDialogOpen}
          appointment={selectedVitalsAppointment}
        />
      )}
    </Layout>
  );
}