import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  UserCog,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  Upload,
  CalendarX,
  Clock,
  LogOut,
  Eye
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

  // Fetch PA assignments
  const { data: assignments } = useQuery({
    queryKey: ["pa-assignments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pa_assignments")
        .select("*")
        .eq("pa_user_id", user!.id);
      if (error) throw error;

      // Get doctor profiles
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

  // Fetch all appointments for assigned doctors
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

  // Confirm payment mutation
  const confirmPayment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ payment_status: "Confirmed", status: "Upcoming" })
        .eq("id", appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["pa-appointments"] });
      toast({ title: "Payment confirmed" });
    },
  });

  // Cancel appointment mutation
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

  // Block slot mutation
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

  // Unblock slot mutation
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
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <UserCog className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{profile?.name || "PA Dashboard"}</h1>
                <p className="text-muted-foreground">Personal Assistant</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Assigned Doctors */}
          {assignments && assignments.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Assigned Doctors</h2>
              <div className="flex flex-wrap gap-3">
                {assignments.map((a: any) => (
                  <Badge key={a.id} variant="secondary" className="text-sm py-2 px-4">
                    Dr. {a.doctorProfile?.name || "Unknown"} - {a.doctorInfo?.specialty || "Specialist"}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Pending Payments", value: pendingPayments?.length || 0, icon: CreditCard, color: "text-yellow-600" },
              { label: "Today's Appointments", value: appointments?.filter(a => a.appointment_date === format(new Date(), "yyyy-MM-dd")).length || 0, icon: Calendar, color: "text-blue-600" },
              { label: "Blocked Slots", value: blockedSlots?.length || 0, icon: CalendarX, color: "text-red-600" },
              { label: "Doctors Assigned", value: assignments?.length || 0, icon: UserCog, color: "text-purple-600" },
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
          <Tabs defaultValue="payments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="slots">Blocked Slots</TabsTrigger>
            </TabsList>

            {/* Pending Payments */}
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Payment Confirmations</CardTitle>
                  <CardDescription>Review and confirm online payments</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingPayments ? (
                    <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
                  ) : pendingPayments && pendingPayments.length > 0 ? (
                    <div className="space-y-4">
                      {pendingPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                              <CreditCard className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                              <p className="font-medium">{payment.patient_full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(payment.appointment_date), "MMM d, yyyy")} • Token #{payment.token_number}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {payment.receipt_path && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedReceipt(payment.receipt_path)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => confirmPayment.mutate(payment.id)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => cancelAppointment.mutate(payment.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                      <p className="text-muted-foreground">No pending payments</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appointments */}
            <TabsContent value="appointments">
              <Card>
                <CardHeader>
                  <CardTitle>All Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments && appointments.length > 0 ? (
                    <div className="space-y-3">
                      {appointments.slice(0, 20).map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-bold text-primary">#{apt.token_number}</span>
                            </div>
                            <div>
                              <p className="font-medium">{apt.patient_full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(apt.appointment_date), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              apt.status === "Completed" ? "default" :
                              apt.status === "Upcoming" ? "secondary" :
                              apt.status === "Cancelled" ? "destructive" : "outline"
                            }>
                              {apt.status}
                            </Badge>
                            {apt.status === "Pending" && (
                              <Button size="sm" variant="destructive" onClick={() => cancelAppointment.mutate(apt.id)}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No appointments</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Blocked Slots */}
            <TabsContent value="slots">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Blocked Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Block a Date</h4>
                      <CalendarComponent
                        mode="single"
                        selected={blockDate}
                        onSelect={setBlockDate}
                        className="rounded-lg border mb-4"
                      />
                      {blockDate && assignments && assignments.length > 0 && (
                        <div className="space-y-3">
                          <div>
                            <Label>Reason</Label>
                            <Input
                              value={blockReason}
                              onChange={(e) => setBlockReason(e.target.value)}
                              placeholder="Optional"
                              className="mt-1"
                            />
                          </div>
                          <div className="space-y-2">
                            {assignments.map((a: any) => (
                              <Button
                                key={a.id}
                                onClick={() => blockSlot.mutate(a.doctor_user_id)}
                                variant="outline"
                                className="w-full justify-start"
                              >
                                Block for Dr. {a.doctorProfile?.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Current Blocked Dates</h4>
                      {blockedSlots && blockedSlots.length > 0 ? (
                        <div className="space-y-2">
                          {blockedSlots.map((slot) => (
                            <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <p className="font-medium text-sm">
                                  {format(new Date(slot.blocked_date), "MMM d, yyyy")}
                                </p>
                                {slot.reason && (
                                  <p className="text-xs text-muted-foreground">{slot.reason}</p>
                                )}
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => unblockSlot.mutate(slot.id)}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-8 text-muted-foreground">No blocked dates</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Receipt Preview Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Receipt preview coming soon</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
