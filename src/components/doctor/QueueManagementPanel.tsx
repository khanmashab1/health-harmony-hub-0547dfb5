import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { 
  Users, Play, CheckCircle2, SkipForward, XCircle, 
  Radio, ChevronRight, Clock, Phone, User, Mail, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface QueueManagementPanelProps {
  doctorId: string;
}

export function QueueManagementPanel({ doctorId }: QueueManagementPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), "yyyy-MM-dd");

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

  const currentlyServing = queueData?.find(apt => apt.status === "In Progress");
  const waitingQueue = queueData?.filter(apt => apt.status === "Upcoming") || [];
  const completedToday = queueData?.filter(apt => apt.status === "Completed") || [];

  const handleCallNext = () => {
    if (waitingQueue.length === 0) {
      toast({ title: "Queue Empty", description: "No more patients waiting" });
      return;
    }
    
    const nextPatient = waitingQueue[0];
    updateStatus.mutate({ appointmentId: nextPatient.id, status: "In Progress" });
  };

  const handleComplete = (appointmentId: string) => {
    updateStatus.mutate({ appointmentId, status: "Completed" });
  };

  const handleSkip = (appointmentId: string) => {
    // Move to end of queue by setting status back to Upcoming
    updateStatus.mutate({ appointmentId, status: "Upcoming" });
  };

  const handleNoShow = (appointmentId: string) => {
    updateStatus.mutate({ appointmentId, status: "No Show" });
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
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {currentlyServing ? (
              <motion.div
                key={currentlyServing.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-white">#{currentlyServing.token_number}</span>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{currentlyServing.patient_full_name || "Patient"}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {currentlyServing.patient_phone || "No phone"}
                      </span>
                    </div>
                    {currentlyServing.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: {currentlyServing.reason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSkip(currentlyServing.id)}
                    disabled={updateStatus.isPending}
                    className="hover:bg-yellow-500/10 hover:text-yellow-600 hover:border-yellow-500"
                  >
                    <SkipForward className="w-4 h-4 mr-1" />
                    Skip
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNoShow(currentlyServing.id)}
                    disabled={updateStatus.isPending}
                    className="hover:bg-red-500/10 hover:text-red-600 hover:border-red-500"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    No Show
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleComplete(currentlyServing.id)}
                    disabled={updateStatus.isPending}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Complete
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
                      onClick={() => handleNoShow(apt.id)}
                      disabled={updateStatus.isPending}
                      className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500"
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
    </div>
  );
}
