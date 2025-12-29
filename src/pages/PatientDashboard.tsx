import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  User, Calendar, Activity, FileText, Star, 
  ChevronRight, LogOut, Edit, History, Heart, PenSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { useRequireAuth, useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileEditForm } from "@/components/patient/ProfileEditForm";
import { HealthMetrics } from "@/components/patient/HealthMetrics";
import { MedicalHistoryTimeline } from "@/components/patient/MedicalHistoryTimeline";
import { WriteReviewDialog } from "@/components/patient/WriteReviewDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function PatientDashboard() {
  const { user, profile, loading, refreshProfile } = useRequireAuth(["patient"]);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [writeReviewOpen, setWriteReviewOpen] = useState(false);

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

  // Fetch patient's reviews
  const { data: myReviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["patient-reviews", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("patient_user_id", user!.id)
        .order("created_at", { ascending: false });
      
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
        <div className="min-h-screen bg-gradient-to-br from-brand-50 via-background to-medical-light/20">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-12 w-48 mb-8" />
            <div className="grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const upcomingAppointments = appointments?.filter(a => a.status === "Upcoming" || a.status === "Pending") || [];
  const completedAppointments = appointments?.filter(a => a.status === "Completed") || [];

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-background to-medical-light/20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  Welcome, {profile?.name || "Patient"}
                </h1>
                <p className="text-muted-foreground font-medium">Manage your health journey</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/booking">
                <Button variant="hero">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut} className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: "Upcoming", value: upcomingAppointments.length, icon: Calendar, color: "from-blue-500 to-blue-600" },
              { label: "Completed", value: completedAppointments.length, icon: Activity, color: "from-green-500 to-green-600" },
              { label: "Total Visits", value: appointments?.length || 0, icon: FileText, color: "from-purple-500 to-purple-600" },
              { label: "Reviews", value: myReviews?.length || 0, icon: Star, color: "from-yellow-500 to-orange-500" },
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
            <Tabs defaultValue="appointments" className="space-y-6">
              <TabsList className="bg-white/80 backdrop-blur-sm border border-border/50 p-1.5 rounded-xl shadow-sm">
                <TabsTrigger value="appointments" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-500 data-[state=active]:to-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                  <Calendar className="w-4 h-4 mr-2" />
                  Appointments
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-500 data-[state=active]:to-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                  <History className="w-4 h-4 mr-2" />
                  History
                </TabsTrigger>
                <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-500 data-[state=active]:to-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="health" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-500 data-[state=active]:to-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                  <Activity className="w-4 h-4 mr-2" />
                  Health
                </TabsTrigger>
                <TabsTrigger value="records" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-500 data-[state=active]:to-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                  <FileText className="w-4 h-4 mr-2" />
                  Records
                </TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-500 data-[state=active]:to-brand-600 data-[state=active]:text-white data-[state=active]:shadow-md">
                  <Star className="w-4 h-4 mr-2" />
                  Reviews
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appointments">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-brand-50/50 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-brand-500" />
                      Your Appointments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {loadingAppointments ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-24" />
                        ))}
                      </div>
                    ) : appointments && appointments.length > 0 ? (
                      <div className="space-y-4">
                        {appointments.map((apt, index) => (
                          <motion.div
                            key={apt.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.01 }}
                            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/50 hover:bg-white hover:shadow-md transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                                <span className="text-xl font-bold text-brand-600">#{apt.token_number}</span>
                              </div>
                              <div>
                                <p className="font-semibold">{apt.department}</p>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(apt.appointment_date), "MMM d, yyyy")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={
                                apt.status === "Completed" ? "status-completed" :
                                apt.status === "Upcoming" ? "status-upcoming" :
                                apt.status === "Pending" ? "status-pending" : "status-cancelled"
                              }>
                                {apt.status}
                              </Badge>
                              <Link to={apt.status === "Completed" ? `/prescription/${apt.id}` : `/token/${apt.id}`}>
                                <Button variant="ghost" size="icon" className="hover:bg-brand-50">
                                  <ChevronRight className="w-5 h-5" />
                                </Button>
                              </Link>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
                          <Calendar className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground mb-4">No appointments yet</p>
                        <Link to="/booking">
                          <Button variant="hero">Book Your First Appointment</Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <MedicalHistoryTimeline />
              </TabsContent>

              <TabsContent value="profile">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-brand-50/50 to-transparent flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-brand-500" />
                      Profile Information
                    </CardTitle>
                    {!isEditingProfile && (
                      <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)} className="hover:bg-brand-50">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-6">
                    {isEditingProfile && profile ? (
                      <ProfileEditForm
                        profile={profile}
                        onSuccess={() => {
                          setIsEditingProfile(false);
                          refreshProfile();
                        }}
                        onCancel={() => setIsEditingProfile(false)}
                      />
                    ) : (
                      <div className="flex flex-col md:flex-row gap-8">
                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-3">
                          <Avatar className="w-28 h-28 border-4 border-white shadow-xl">
                            <AvatarImage src={profile?.avatar_path || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-brand-100 to-brand-200 text-3xl font-bold text-brand-600">
                              {profile?.name?.charAt(0)?.toUpperCase() || <User className="w-12 h-12" />}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        
                        {/* Info Grid */}
                        <div className="flex-1 grid md:grid-cols-2 gap-6">
                          {[
                            { label: "Full Name", value: profile?.name },
                            { label: "Phone", value: profile?.phone },
                            { label: "Age", value: profile?.age },
                            { label: "Gender", value: profile?.gender },
                            { label: "Blood Type", value: profile?.blood_type },
                            { label: "Location", value: profile?.city && profile?.province ? `${profile.city}, ${profile.province}` : null },
                          ].map((item) => (
                            <div key={item.label} className="p-4 rounded-xl border border-border/50 bg-white/50">
                              <p className="text-sm text-muted-foreground font-medium">{item.label}</p>
                              <p className="font-semibold text-lg">{item.value || "-"}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="health">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-green-50/50 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-600" />
                      Health Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {user && <HealthMetrics userId={user.id} />}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="records">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-purple-50/50 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      Medical Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
                        <FileText className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Your medical records will appear here</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-amber-50/50 to-transparent flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-600" />
                      My Reviews
                    </CardTitle>
                    <Button variant="hero" size="sm" onClick={() => setWriteReviewOpen(true)}>
                      <PenSquare className="w-4 h-4 mr-2" />
                      Write a Review
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6">
                    {loadingReviews ? (
                      <div className="space-y-4">
                        {[1, 2].map((i) => (
                          <Skeleton key={i} className="h-24" />
                        ))}
                      </div>
                    ) : myReviews && myReviews.length > 0 ? (
                      <div className="space-y-4">
                        {myReviews.map((review, index) => (
                          <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 rounded-xl border border-border/50 bg-white/50"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < review.rating
                                            ? "text-amber-500 fill-amber-500"
                                            : "text-gray-200"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <Badge className={
                                    review.status === "Approved" ? "status-completed" :
                                    review.status === "Pending" ? "status-pending" : "status-cancelled"
                                  }>
                                    {review.status}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground text-sm mb-2">
                                  {review.comment || "No comment provided."}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(review.created_at), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center mb-4">
                          <Star className="w-10 h-10 text-amber-500" />
                        </div>
                        <p className="text-muted-foreground mb-4">You haven't written any reviews yet</p>
                        <Button variant="hero" onClick={() => setWriteReviewOpen(true)}>
                          Write Your First Review
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Write Review Dialog */}
          {user && profile && (
            <WriteReviewDialog
              open={writeReviewOpen}
              onOpenChange={setWriteReviewOpen}
              userId={user.id}
              userName={profile.name || "Anonymous"}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}