import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  User, Calendar, Activity, FileText, Star, 
  Edit, History, Heart, Pencil, PenSquare
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
import { PrescriptionHistory } from "@/components/patient/PrescriptionHistory";
import { AppointmentsSection } from "@/components/patient/AppointmentsSection";
import { PatientSwitcher } from "@/components/patient/PatientSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export default function PatientDashboard() {
  const { user, profile, loading, refreshProfile } = useRequireAuth(["patient"]);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [writeReviewOpen, setWriteReviewOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<{ id: string; rating: number; comment: string | null } | null>(null);
  const [reviewDoctorId, setReviewDoctorId] = useState<string | null>(null);
  const [selectedManagedPatientId, setSelectedManagedPatientId] = useState<string | null>(null);
  const [selectedManagedPatientName, setSelectedManagedPatientName] = useState<string | null>(null);

  // Fetch managed patients first to get all patient IDs
  const { data: managedPatients } = useQuery({
    queryKey: ["managed-patients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("managed_patients")
        .select("*")
        .eq("manager_user_id", user!.id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch appointments for self AND all managed patients
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ["patient-appointments", user?.id, managedPatients],
    queryFn: async () => {
      // Get managed patient names for filtering
      const managedPatientNames = managedPatients?.map(p => p.patient_name) || [];
      
      // Fetch appointments for the logged-in user
      const { data: selfAppointments, error: selfError } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_user_id", user!.id)
        .order("appointment_date", { ascending: false });
      
      if (selfError) throw selfError;

      // Also fetch appointments made with managed patient names
      let managedAppointments: any[] = [];
      if (managedPatientNames.length > 0) {
        const { data: managed, error: managedError } = await supabase
          .from("appointments")
          .select("*")
          .in("patient_full_name", managedPatientNames)
          .order("appointment_date", { ascending: false });
        
        if (managedError) throw managedError;
        managedAppointments = managed || [];
      }

      // Combine and deduplicate by id
      const allAppointments = [...(selfAppointments || []), ...managedAppointments];
      const uniqueAppointments = allAppointments.filter((apt, index, self) =>
        index === self.findIndex((a) => a.id === apt.id)
      );

      return uniqueAppointments.sort((a, b) => 
        new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
      );
    },
    enabled: !!user,
  });

  // Subscribe to realtime appointment updates for self AND managed patients
  useEffect(() => {
    if (!user) return;

    // Get managed patient names for realtime filtering
    const managedPatientNames = managedPatients?.map(p => p.patient_name) || [];

    // Subscribe to own appointments
    const selfChannel = supabase
      .channel('patient-appointments-self')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime own appointment update:', payload);
          queryClient.invalidateQueries({ queryKey: ["patient-appointments", user.id, managedPatients] });
          
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const newStatus = (payload.new as any).status;
            const oldStatus = (payload.old as any).status;
            const patientName = (payload.new as any).patient_full_name;
            
            if (newStatus !== oldStatus) {
              toast({
                title: "Appointment Updated",
                description: `${patientName ? `${patientName}'s` : 'Your'} appointment status changed to ${newStatus}`,
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to all appointments (we'll filter by patient name in the handler)
    const allChannel = supabase
      .channel('patient-appointments-managed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          const patientName = (payload.new as any)?.patient_full_name;
          
          // Check if this is a managed patient's appointment
          if (patientName && managedPatientNames.includes(patientName)) {
            console.log('Realtime managed patient appointment update:', payload);
            queryClient.invalidateQueries({ queryKey: ["patient-appointments", user.id, managedPatients] });
            
            if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
              const newStatus = (payload.new as any).status;
              const oldStatus = (payload.old as any).status;
              
              if (newStatus !== oldStatus) {
                toast({
                  title: "Managed Patient Update",
                  description: `${patientName}'s appointment status changed to ${newStatus}`,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(selfChannel);
      supabase.removeChannel(allChannel);
    };
  }, [user, managedPatients, queryClient, toast]);

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

  // Filter appointments based on selected patient for stats
  const getFilteredAppointments = () => {
    if (!appointments) return [];
    if (!selectedManagedPatientId) {
      // Self - filter by patient_user_id or patient_full_name matching profile name
      return appointments.filter(a => 
        a.patient_user_id === user?.id || 
        a.patient_full_name === profile?.name
      );
    }
    // Managed patient - filter by patient_full_name
    return appointments.filter(a => a.patient_full_name === selectedManagedPatientName);
  };

  const filteredAppointments = getFilteredAppointments();
  const upcomingAppointments = filteredAppointments.filter(a => a.status === "Upcoming" || a.status === "Pending") || [];
  const completedAppointments = filteredAppointments.filter(a => a.status === "Completed") || [];

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-background to-medical-light/20 dark:from-background dark:via-background dark:to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 mb-6 sm:mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25 flex-shrink-0">
                  <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">
                    Welcome, {selectedManagedPatientName || profile?.name || "Patient"}
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">Manage your health journey</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* Patient Switcher */}
                {user && (
                  <PatientSwitcher
                    currentUserId={user.id}
                    currentUserName={profile?.name || null}
                    selectedPatientId={selectedManagedPatientId}
                    onPatientChange={(patientId, patientName) => {
                      setSelectedManagedPatientId(patientId);
                      setSelectedManagedPatientName(patientName);
                    }}
                  />
                )}
                <Link to="/booking">
                  <Button variant="hero" size="sm" className="sm:size-default">
                    <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Book Appointment</span>
                    <span className="sm:hidden">Book</span>
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8"
          >
            {[
              { label: "Upcoming", value: upcomingAppointments.length, icon: Calendar, color: "from-blue-500 to-blue-600" },
              { label: "Completed", value: completedAppointments.length, icon: Activity, color: "from-green-500 to-green-600" },
              { label: "Total Visits", value: filteredAppointments.length, icon: FileText, color: "from-purple-500 to-purple-600" },
              { label: "Reviews", value: selectedManagedPatientId ? 0 : (myReviews?.length || 0), icon: Star, color: "from-yellow-500 to-orange-500" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card variant="glass" className="border-white/50 hover:shadow-lg transition-all">
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xl sm:text-3xl font-bold truncate">{stat.value}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{stat.label}</p>
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
              <TabsList className="bg-muted/80 dark:bg-muted/50 backdrop-blur-sm border border-border/50 p-1.5 rounded-xl shadow-sm flex-wrap h-auto gap-1">
                <TabsTrigger value="appointments" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Appointments</span>
                  <span className="sm:hidden">Appts</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <History className="w-4 h-4 mr-1 sm:mr-2" />
                  History
                </TabsTrigger>
                <TabsTrigger value="profile" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <User className="w-4 h-4 mr-1 sm:mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="health" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Activity className="w-4 h-4 mr-1 sm:mr-2" />
                  Health
                </TabsTrigger>
                <TabsTrigger value="records" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <FileText className="w-4 h-4 mr-1 sm:mr-2" />
                  Records
                </TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Star className="w-4 h-4 mr-1 sm:mr-2" />
                  Reviews
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appointments">
                <AppointmentsSection
                  appointments={appointments}
                  isLoading={loadingAppointments}
                  onWriteReview={(doctorId) => {
                    setReviewDoctorId(doctorId);
                    setEditingReview(null);
                    setWriteReviewOpen(true);
                  }}
                  currentUserId={user?.id}
                  currentUserName={profile?.name}
                  selectedManagedPatientId={selectedManagedPatientId}
                  selectedManagedPatientName={selectedManagedPatientName}
                />
              </TabsContent>

              <TabsContent value="history">
                <MedicalHistoryTimeline 
                  selectedPatientName={selectedManagedPatientName}
                  selectedPatientId={selectedManagedPatientId}
                />
              </TabsContent>

              <TabsContent value="profile">
                <Card variant="glass" className="border-border/30 dark:border-border/20">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Profile Information
                    </CardTitle>
                    {!isEditingProfile && (
                      <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)} className="hover:bg-primary/10">
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
                          <Avatar className="w-28 h-28 border-4 border-border/20 shadow-xl dark:border-border/30">
                            <AvatarImage src={profile?.avatar_path || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-3xl font-bold text-primary">
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
                            <div key={item.label} className="p-4 rounded-xl border border-border/50 bg-card dark:bg-card/80">
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
                <Card variant="glass" className="border-border/30 dark:border-border/20">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-green-100/50 to-transparent dark:from-green-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                      Health Metrics {selectedManagedPatientName && `- ${selectedManagedPatientName}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    {user && (
                      <HealthMetrics 
                        userId={user.id} 
                        selectedPatientName={selectedManagedPatientName}
                        isViewingManagedPatient={!!selectedManagedPatientId}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="records">
                <Card variant="glass" className="border-border/30 dark:border-border/20">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-purple-100/50 to-transparent dark:from-purple-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      Prescription History {selectedManagedPatientName && `- ${selectedManagedPatientName}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    {user && (
                      <PrescriptionHistory 
                        userId={user.id}
                        selectedPatientName={selectedManagedPatientName}
                        selectedPatientId={selectedManagedPatientId}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews">
                <Card variant="glass" className="border-border/30 dark:border-border/20">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-amber-100/50 to-transparent dark:from-amber-900/20 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
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
                            className="p-4 rounded-xl border border-border/50 bg-card dark:bg-card/80"
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
                              {review.status === "Pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingReview({
                                      id: review.id,
                                      rating: review.rating,
                                      comment: review.comment,
                                    });
                                    setWriteReviewOpen(true);
                                  }}
                                  className="hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300"
                                >
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                              )}
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
              onOpenChange={(open) => {
                setWriteReviewOpen(open);
                if (!open) {
                  setEditingReview(null);
                  setReviewDoctorId(null);
                }
              }}
              userId={user.id}
              userName={profile.name || "Anonymous"}
              doctorId={reviewDoctorId}
              editReview={editingReview}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}