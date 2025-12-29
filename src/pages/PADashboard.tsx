import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
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
  Users
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
import { Textarea } from "@/components/ui/textarea";
import { Layout } from "@/components/layout/Layout";
import { useRequireAuth, useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

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

  // Fetch pending payments
  const { data: pendingPayments, isLoading: loadingPayments } = useQuery({
    queryKey: ["pa-pending-payments", assignedDoctorIds],
    queryFn: async () => {
      if (assignedDoctorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .in("doctor_user_id", assignedDoctorIds)
        .eq("payment_status", "Pending")
        .eq("payment_method", "Online")
        .order("created_at", { ascending: false });
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-background to-brand-50/20">
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
            <Button variant="outline" onClick={handleSignOut} className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
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
                  <Badge key={a.id} variant="secondary" className="py-2 px-4 bg-gradient-to-r from-purple-100 to-brand-100 text-purple-700 border-0">
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
                <Card variant="glass" className="border-white/50 hover:shadow-lg transition-all">
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
              <TabsList className="bg-white/80 backdrop-blur-sm border border-border/50 p-1.5 rounded-xl shadow-sm">
                <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payments
                </TabsTrigger>
                <TabsTrigger value="appointments" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                  <Calendar className="w-4 h-4 mr-2" />
                  Appointments
                </TabsTrigger>
                <TabsTrigger value="slots" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                  <CalendarX className="w-4 h-4 mr-2" />
                  Blocked Slots
                </TabsTrigger>
              </TabsList>

              {/* Pending Payments */}
              <TabsContent value="payments">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-yellow-50/50 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-yellow-600" />
                      Pending Payment Confirmations
                    </CardTitle>
                    <CardDescription>Review and confirm online payments</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {loadingPayments ? (
                      <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
                    ) : pendingPayments && pendingPayments.length > 0 ? (
                      <div className="space-y-4">
                        {pendingPayments.map((payment) => (
                          <motion.div 
                            key={payment.id} 
                            whileHover={{ scale: 1.01 }}
                            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/50 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
                                <CreditCard className="w-6 h-6 text-yellow-600" />
                              </div>
                              <div>
                                <p className="font-semibold">{payment.patient_full_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(payment.appointment_date), "MMM d, yyyy")} • Token #{payment.token_number}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {payment.receipt_path && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setSelectedReceipt(payment.receipt_path)}
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
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mb-4">
                          <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <p className="text-muted-foreground font-medium">No pending payments</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appointments */}
              <TabsContent value="appointments">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-blue-50/50 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
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
                            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/50 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                                <span className="font-bold text-brand-600">#{apt.token_number}</span>
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

              {/* Blocked Slots */}
              <TabsContent value="slots">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card variant="glass" className="border-white/50">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-purple-50/50 to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <CalendarX className="w-5 h-5 text-purple-600" />
                        Block a Date
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <CalendarComponent
                        mode="single"
                        selected={blockDate}
                        onSelect={setBlockDate}
                        className="rounded-xl border border-border/50 bg-white/50 mb-4"
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
                                className="w-full justify-start hover:bg-purple-50"
                              >
                                Block for Dr. {a.doctorProfile?.name}
                              </Button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="glass" className="border-white/50">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-red-50/50 to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <CalendarX className="w-5 h-5 text-red-500" />
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
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl bg-muted/30 overflow-hidden">
            {selectedReceipt && (
              <img 
                src={supabase.storage.from("receipts").getPublicUrl(selectedReceipt).data.publicUrl}
                alt="Payment Receipt"
                className="w-full h-auto max-h-[70vh] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            )}
            <div className="hidden p-8 text-center">
              <p className="text-muted-foreground">Unable to load receipt image</p>
            </div>
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
    </Layout>
  );
}