import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Radio, Users, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface LiveQueuePositionProps {
  doctorId: string;
  patientTokenNumber: number;
  appointmentDate: string;
  appointmentStatus: string;
}

export function LiveQueuePosition({ 
  doctorId, 
  patientTokenNumber, 
  appointmentDate,
  appointmentStatus 
}: LiveQueuePositionProps) {
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isToday = appointmentDate === todayStr;

  // Fetch queue data for the doctor
  const { data: queueData } = useQuery({
    queryKey: ["live-queue", doctorId, appointmentDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("token_number, status")
        .eq("doctor_user_id", doctorId)
        .eq("appointment_date", appointmentDate)
        .neq("status", "Cancelled")
        .order("token_number", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: isToday && (appointmentStatus === "Upcoming" || appointmentStatus === "In Progress"),
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isToday || (appointmentStatus !== "Upcoming" && appointmentStatus !== "In Progress")) return;

    const channel = supabase
      .channel(`queue-position-${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_user_id=eq.${doctorId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["live-queue", doctorId, appointmentDate] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, appointmentDate, isToday, appointmentStatus, queryClient]);

  // Calculate queue position
  const currentlyServing = queueData?.find(apt => apt.status === "In Progress")?.token_number || 0;
  const waitingCount = queueData?.filter(apt => 
    apt.status === "Upcoming" && apt.token_number < patientTokenNumber
  ).length || 0;
  
  const isBeingServed = appointmentStatus === "In Progress";
  const isNext = !isBeingServed && waitingCount === 0 && currentlyServing > 0;

  // Don't show if not today or already completed/cancelled
  if (!isToday || appointmentStatus === "Completed" || appointmentStatus === "Cancelled") {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3"
    >
      <Card className={`border-2 overflow-hidden ${
        isBeingServed 
          ? "border-green-500/50 bg-green-500/5 dark:bg-green-500/10" 
          : isNext
            ? "border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10"
            : "border-primary/30 bg-primary/5 dark:bg-primary/10"
      }`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left side - Status */}
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isBeingServed 
                  ? "bg-green-500 animate-pulse" 
                  : isNext 
                    ? "bg-blue-500 animate-pulse"
                    : "bg-primary/20"
              }`}>
                <Radio className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  isBeingServed || isNext ? "text-white" : "text-primary"
                }`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">
                    {isBeingServed ? "Your Turn!" : isNext ? "You're Next!" : "Queue Position"}
                  </span>
                  <Badge className={`text-[10px] sm:text-xs ${
                    isBeingServed 
                      ? "bg-green-500 text-white" 
                      : isNext 
                        ? "bg-blue-500 text-white animate-pulse"
                        : "bg-primary/20 text-primary"
                  }`}>
                    Live
                  </Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  {isBeingServed 
                    ? "Please proceed to the doctor's room" 
                    : isNext
                      ? "Get ready, you'll be called soon"
                      : `${waitingCount} patient${waitingCount !== 1 ? 's' : ''} ahead of you`
                  }
                </p>
              </div>
            </div>

            {/* Right side - Token info */}
            <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-4">
              {/* Currently Serving */}
              <div className="text-center px-3 py-1.5 sm:py-1 rounded-lg bg-background/50 dark:bg-background/30 flex-1 sm:flex-initial">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Serving</p>
                <p className="text-base sm:text-lg font-bold text-green-500">
                  {currentlyServing > 0 ? `#${currentlyServing}` : "—"}
                </p>
              </div>

              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

              {/* Your Token */}
              <div className={`text-center px-3 sm:px-4 py-1.5 sm:py-1 rounded-lg flex-1 sm:flex-initial ${
                isBeingServed 
                  ? "bg-green-500 text-white" 
                  : isNext 
                    ? "bg-blue-500 text-white"
                    : "bg-primary/20"
              }`}>
                <p className={`text-[10px] sm:text-xs ${isBeingServed || isNext ? "text-white/80" : "text-muted-foreground"}`}>
                  Your Token
                </p>
                <p className="text-base sm:text-lg font-bold">#{patientTokenNumber}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
