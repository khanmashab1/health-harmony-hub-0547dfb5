import { useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  User,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface DoctorDashboardViewProps {
  doctorUserId: string;
  doctorName: string;
  open: boolean;
  onClose: () => void;
}

export function DoctorDashboardView({ 
  doctorUserId, 
  doctorName, 
  open, 
  onClose 
}: DoctorDashboardViewProps) {
  // Fetch doctor details
  const { data: doctor, isLoading: loadingDoctor } = useQuery({
    queryKey: ["view-doctor", doctorUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select(`
          *,
          profile:profiles!doctors_user_id_fkey(name, phone, avatar_path, status, city)
        `)
        .eq("user_id", doctorUserId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch doctor's appointments
  const { data: appointments, isLoading: loadingAppts } = useQuery({
    queryKey: ["view-doctor-appointments", doctorUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_user_id", doctorUserId)
        .order("appointment_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch doctor's schedules
  const { data: schedules } = useQuery({
    queryKey: ["view-doctor-schedules", doctorUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_schedules")
        .select("*")
        .eq("doctor_user_id", doctorUserId)
        .order("day_of_week");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = appointments?.filter(a => a.appointment_date === todayStr) || [];
  const completedAppointments = appointments?.filter(a => a.status === "Completed") || [];
  const totalRevenue = completedAppointments.length * (doctor?.fee || 0);

  // Weekly stats for chart
  const getWeeklyData = () => {
    if (!appointments) return [];
    
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayAppts = appointments.filter(a => a.appointment_date === dateStr);
      
      last7Days.push({
        day: format(date, "EEE"),
        appointments: dayAppts.length,
        completed: dayAppts.filter(a => a.status === "Completed").length,
      });
    }
    return last7Days;
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-primary" />
            View Doctor Dashboard: Dr. {doctorName}
          </DialogTitle>
        </DialogHeader>

        {loadingDoctor ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Doctor Profile Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={doctor?.image_path || doctor?.profile?.avatar_path} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {doctor?.profile?.name?.[0] || "D"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">Dr. {doctor?.profile?.name}</h3>
                    <p className="text-muted-foreground">{doctor?.specialty}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <Badge variant="outline">{doctor?.degree || "MBBS"}</Badge>
                      <Badge variant="secondary">{doctor?.experience_years || 0} years exp.</Badge>
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                        {doctor?.profile?.status || "Active"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">PKR {doctor?.fee?.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">per consultation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Today's Patients", value: todayAppointments.length, icon: Calendar, color: "text-blue-500" },
                { label: "Total Completed", value: completedAppointments.length, icon: CheckCircle2, color: "text-green-500" },
                { label: "Total Revenue", value: `PKR ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-amber-500" },
                { label: "Avg. Duration", value: `${doctor?.consultation_duration || 15} min`, icon: Clock, color: "text-purple-500" },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <stat.icon className={`w-8 h-8 ${stat.color}`} />
                      <div>
                        <p className="text-lg font-bold">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="performance">
              <TabsList>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="recent">Recent Patients</TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Weekly Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={getWeeklyData()}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="day" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="appointments" fill="hsl(var(--primary))" name="Appointments" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completed" fill="hsl(var(--chart-2))" name="Completed" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Weekly Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map((day, index) => {
                        const schedule = schedules?.find(s => s.day_of_week === index);
                        const isAvailable = schedule?.is_available !== false;
                        
                        return (
                          <div
                            key={day}
                            className={`p-3 rounded-lg text-center ${
                              isAvailable
                                ? "bg-green-500/10 border border-green-500/30"
                                : "bg-muted border border-border"
                            }`}
                          >
                            <p className="font-medium text-sm">{day}</p>
                            {schedule && isAvailable ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">Off</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recent" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Appointments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingAppts ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
                      </div>
                    ) : appointments && appointments.length > 0 ? (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {appointments.slice(0, 10).map((apt) => (
                          <div
                            key={apt.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {apt.patient_full_name || "Patient"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Token #{apt.token_number} • {format(new Date(apt.appointment_date), "MMM dd, yyyy")}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                apt.status === "Completed"
                                  ? "default"
                                  : apt.status === "Cancelled"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {apt.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No appointments yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
