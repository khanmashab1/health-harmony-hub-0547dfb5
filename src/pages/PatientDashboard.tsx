import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  User, Calendar, Activity, FileText, Star, Upload, 
  ChevronRight, Clock, MapPin, Loader2, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { useRequireAuth, useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientDashboard() {
  const { user, profile, loading } = useRequireAuth(["patient"]);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ["patient-appointments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_user_id", user!.id)
        .order("appointment_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </Layout>
    );
  }

  const upcomingAppointments = appointments?.filter(a => a.status === "Upcoming" || a.status === "Pending") || [];
  const completedAppointments = appointments?.filter(a => a.status === "Completed") || [];

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome, {profile?.name || "Patient"}
              </h1>
              <p className="text-muted-foreground">Manage your health journey</p>
            </div>
            <div className="flex gap-3">
              <Link to="/booking">
                <Button variant="hero">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Upcoming", value: upcomingAppointments.length, icon: Calendar, color: "text-blue-600" },
              { label: "Completed", value: completedAppointments.length, icon: Activity, color: "text-green-600" },
              { label: "Total Visits", value: appointments?.length || 0, icon: FileText, color: "text-purple-600" },
              { label: "Reviews", value: 0, icon: Star, color: "text-yellow-600" },
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
          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments">
              <Card>
                <CardHeader>
                  <CardTitle>Your Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAppointments ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24" />
                      ))}
                    </div>
                  ) : appointments && appointments.length > 0 ? (
                    <div className="space-y-4">
                      {appointments.map((apt) => (
                        <motion.div
                          key={apt.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary">#{apt.token_number}</span>
                            </div>
                            <div>
                              <p className="font-medium">{apt.department}</p>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(apt.appointment_date), "MMM d, yyyy")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={
                              apt.status === "Completed" ? "default" :
                              apt.status === "Upcoming" ? "secondary" :
                              apt.status === "Pending" ? "outline" : "destructive"
                            }>
                              {apt.status}
                            </Badge>
                            <Link to={apt.status === "Completed" ? `/prescription/${apt.id}` : `/token/${apt.id}`}>
                              <Button variant="ghost" size="sm">
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No appointments yet</p>
                      <Link to="/booking">
                        <Button variant="hero">Book Your First Appointment</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{profile?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{profile?.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Age</p>
                        <p className="font-medium">{profile?.age || "-"}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium">{profile?.gender || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Blood Type</p>
                        <p className="font-medium">{profile?.blood_type || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">
                          {profile?.city && profile?.province 
                            ? `${profile.city}, ${profile.province}` 
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health">
              <Card>
                <CardHeader>
                  <CardTitle>Health Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Track your health metrics here</p>
                    <p className="text-sm text-muted-foreground mt-2">Coming soon!</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="records">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Your medical records will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
