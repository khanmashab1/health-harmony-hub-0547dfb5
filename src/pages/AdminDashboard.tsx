import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Users,
  Stethoscope,
  UserCog,
  Star,
  Shield,
  Plus,
  Search,
  MoreHorizontal,
  Check,
  X,
  UserPlus,
  Calendar,
  TrendingUp,
  LogOut,
  Mail,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Layout } from "@/components/layout/Layout";
import { useRequireAuth, useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PROVINCES, CITIES, SPECIALTIES } from "@/lib/constants";
import { useNavigate } from "react-router-dom";
import { EmailLogsPanel } from "@/components/admin/EmailLogsPanel";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
import { DoctorPerformancePanel } from "@/components/admin/DoctorPerformancePanel";
import { CreateDoctorForm } from "@/components/admin/CreateDoctorForm";
import { CreatePAForm } from "@/components/admin/CreatePAForm";
import { AssignPAForm } from "@/components/admin/AssignPAForm";
import { DoctorCard } from "@/components/admin/DoctorCard";

export default function AdminDashboard() {
  const { user, profile, loading } = useRequireAuth(["admin"]);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createDoctorOpen, setCreateDoctorOpen] = useState(false);
  const [createPAOpen, setCreatePAOpen] = useState(false);
  const [assignPAOpen, setAssignPAOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profilesRes, doctorsRes, appointmentsRes, reviewsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("doctors").select("user_id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "Pending"),
      ]);
      return {
        users: profilesRes.count || 0,
        doctors: doctorsRes.count || 0,
        appointments: appointmentsRes.count || 0,
        pendingReviews: reviewsRes.count || 0,
      };
    },
  });

  // Fetch users
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users", userSearch],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (userSearch) {
        query = query.or(`name.ilike.%${userSearch}%,phone.ilike.%${userSearch}%`);
      }
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch doctors
  const { data: doctors, isLoading: loadingDoctors } = useQuery({
    queryKey: ["admin-doctors"],
    queryFn: async () => {
      const { data: doctorData, error } = await supabase.from("doctors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = doctorData?.map(d => d.user_id) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, name, phone, status").in("id", userIds);
        return doctorData?.map(doc => ({ ...doc, profile: profiles?.find(p => p.id === doc.user_id) }));
      }
      return doctorData;
    },
  });

  // Fetch PAs
  const { data: pas } = useQuery({
    queryKey: ["admin-pas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("role", "pa");
      if (error) throw error;
      return data;
    },
  });

  // Fetch PA assignments
  const { data: paAssignments } = useQuery({
    queryKey: ["admin-pa-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pa_assignments").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch reviews
  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User status updated" });
    },
  });

  const updateReviewStatus = useMutation({
    mutationFn: async ({ reviewId, status }: { reviewId: string; status: string }) => {
      const { error } = await supabase.from("reviews").update({ status }).eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Review status updated" });
    },
  });

  const createAssignment = useMutation({
    mutationFn: async ({ paId, doctorId }: { paId: string; doctorId: string }) => {
      const { error } = await supabase.from("pa_assignments").insert({ pa_user_id: paId, doctor_user_id: doctorId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pa-assignments"] });
      setAssignPAOpen(false);
      toast({ title: "PA assigned to doctor" });
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("pa_assignments").delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pa-assignments"] });
      toast({ title: "Assignment removed" });
    },
  });

  const deleteDoctor = useMutation({
    mutationFn: async (userId: string) => {
      // Delete doctor record first
      const { error: doctorError } = await supabase.from("doctors").delete().eq("user_id", userId);
      if (doctorError) throw doctorError;
      // Update profile status to inactive (we don't delete the profile/user as they may have appointments)
      const { error: profileError } = await supabase.from("profiles").update({ status: "Deleted" }).eq("id", userId);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Doctor deleted successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete doctor", description: error.message });
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-brand-50/20">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-brand-50/20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground font-medium">Manage your platform</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Users", value: stats?.users || 0, icon: Users, color: "from-blue-500 to-blue-600" },
              { label: "Doctors", value: stats?.doctors || 0, icon: Stethoscope, color: "from-green-500 to-green-600" },
              { label: "Appointments", value: stats?.appointments || 0, icon: Calendar, color: "from-purple-500 to-purple-600" },
              { label: "Pending Reviews", value: stats?.pendingReviews || 0, icon: Star, color: "from-yellow-500 to-orange-500" },
            ].map((stat, index) => (
              <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + index * 0.05 }}>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Tabs defaultValue="analytics" className="space-y-6">
              <TabsList className="bg-white/80 backdrop-blur-sm border border-border/50 p-1.5 rounded-xl shadow-sm flex-wrap h-auto">
                <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-700 data-[state=active]:to-slate-900 data-[state=active]:text-white">
                  <TrendingUp className="w-4 h-4 mr-2" />Analytics
                </TabsTrigger>
                <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-700 data-[state=active]:to-slate-900 data-[state=active]:text-white">
                  <BarChart3 className="w-4 h-4 mr-2" />Performance
                </TabsTrigger>
                <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-700 data-[state=active]:to-slate-900 data-[state=active]:text-white">Users</TabsTrigger>
                <TabsTrigger value="doctors" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-700 data-[state=active]:to-slate-900 data-[state=active]:text-white">Doctors</TabsTrigger>
                <TabsTrigger value="pas" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-700 data-[state=active]:to-slate-900 data-[state=active]:text-white">PAs</TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-700 data-[state=active]:to-slate-900 data-[state=active]:text-white">Reviews</TabsTrigger>
                <TabsTrigger value="emails" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-700 data-[state=active]:to-slate-900 data-[state=active]:text-white">
                  <Mail className="w-4 h-4 mr-2" />Emails
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics"><AnalyticsPanel /></TabsContent>
              <TabsContent value="performance"><DoctorPerformancePanel /></TabsContent>

              {/* Users Tab */}
              <TabsContent value="users">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-blue-50/50 to-transparent">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />User Management</CardTitle>
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9 border-border/50" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {loadingUsers ? (
                      <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
                    ) : users && users.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead><tr className="border-b"><th className="text-left py-3 px-4 font-medium">Name</th><th className="text-left py-3 px-4 font-medium">Role</th><th className="text-left py-3 px-4 font-medium">Phone</th><th className="text-left py-3 px-4 font-medium">Status</th><th className="text-left py-3 px-4 font-medium">Actions</th></tr></thead>
                          <tbody>
                            {users.map((u) => (
                              <tr key={u.id} className="border-b hover:bg-muted/50">
                                <td className="py-3 px-4 font-medium">{u.name || "-"}</td>
                                <td className="py-3 px-4"><Badge variant="outline" className="capitalize">{u.role}</Badge></td>
                                <td className="py-3 px-4 text-muted-foreground">{u.phone || "-"}</td>
                                <td className="py-3 px-4"><Badge className={u.status === "Active" ? "status-completed" : "status-pending"}>{u.status}</Badge></td>
                                <td className="py-3 px-4">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent><DropdownMenuItem onClick={() => updateUserStatus.mutate({ userId: u.id, status: u.status === "Active" ? "Inactive" : "Active" })}>{u.status === "Active" ? "Deactivate" : "Activate"}</DropdownMenuItem></DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (<p className="text-center py-8 text-muted-foreground">No users found</p>)}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Doctors Tab */}
              <TabsContent value="doctors">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-green-50/50 to-transparent">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2"><Stethoscope className="w-5 h-5 text-green-600" />Doctor Management</CardTitle>
                      <Dialog open={createDoctorOpen} onOpenChange={setCreateDoctorOpen}>
                        <DialogTrigger asChild><Button variant="hero"><Plus className="w-4 h-4 mr-2" />Add Doctor</Button></DialogTrigger>
                        <DialogContent className="max-w-lg"><CreateDoctorForm onSuccess={() => { setCreateDoctorOpen(false); queryClient.invalidateQueries({ queryKey: ["admin-doctors"] }); }} /></DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {loadingDoctors ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                      </div>
                    ) : doctors && doctors.length > 0 ? (
                      <div className="grid gap-4">
                        {doctors.map((doc: any) => (
                          <DoctorCard
                            key={doc.user_id}
                            doctor={doc}
                            onEdit={() => queryClient.invalidateQueries({ queryKey: ["admin-doctors"] })}
                            onDelete={(userId) => deleteDoctor.mutate(userId)}
                            isDeleting={deleteDoctor.isPending}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">No doctors found</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PAs Tab */}
              <TabsContent value="pas">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card variant="glass" className="border-white/50">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-purple-50/50 to-transparent">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2"><UserCog className="w-5 h-5 text-purple-600" />PA Accounts</CardTitle>
                        <Dialog open={createPAOpen} onOpenChange={setCreatePAOpen}>
                          <DialogTrigger asChild><Button size="sm" variant="hero"><UserPlus className="w-4 h-4 mr-2" />Create PA</Button></DialogTrigger>
                          <DialogContent><CreatePAForm onSuccess={() => { setCreatePAOpen(false); queryClient.invalidateQueries({ queryKey: ["admin-pas"] }); }} /></DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {pas && pas.length > 0 ? (
                        <div className="space-y-3">{pas.map((pa) => (
                          <div key={pa.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/50">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center"><UserCog className="w-5 h-5 text-purple-600" /></div><div><p className="font-medium">{pa.name || "Unnamed PA"}</p><p className="text-xs text-muted-foreground">{pa.phone || "No phone"}</p></div></div>
                            <Badge className={pa.status === "Active" ? "status-completed" : "status-pending"}>{pa.status}</Badge>
                          </div>
                        ))}</div>
                      ) : (<p className="text-center py-8 text-muted-foreground">No PAs found</p>)}
                    </CardContent>
                  </Card>
                  <Card variant="glass" className="border-white/50">
                    <CardHeader className="border-b border-border/30 bg-gradient-to-r from-brand-50/50 to-transparent">
                      <div className="flex items-center justify-between">
                        <CardTitle>PA Assignments</CardTitle>
                        <Dialog open={assignPAOpen} onOpenChange={setAssignPAOpen}>
                          <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" />Assign PA</Button></DialogTrigger>
                          <DialogContent><AssignPAForm pas={pas || []} doctors={doctors || []} onSubmit={(paId, doctorId) => createAssignment.mutate({ paId, doctorId })} /></DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {paAssignments && paAssignments.length > 0 ? (
                        <div className="space-y-3">{paAssignments.map((assignment) => { const pa = pas?.find(p => p.id === assignment.pa_user_id); const doc = doctors?.find((d: any) => d.user_id === assignment.doctor_user_id); return (
                          <div key={assignment.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/50">
                            <div className="text-sm"><span className="font-medium">{pa?.name || "PA"}</span><span className="text-muted-foreground"> → </span><span className="font-medium">Dr. {(doc as any)?.profile?.name || "Doctor"}</span></div>
                            <Button variant="ghost" size="sm" onClick={() => deleteAssignment.mutate(assignment.id)} className="text-destructive hover:bg-destructive/10"><X className="w-4 h-4" /></Button>
                          </div>
                        ); })}</div>
                      ) : (<p className="text-center py-8 text-muted-foreground">No assignments</p>)}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews">
                <Card variant="glass" className="border-white/50">
                  <CardHeader className="border-b border-border/30 bg-gradient-to-r from-yellow-50/50 to-transparent">
                    <CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-600" />Review Moderation</CardTitle>
                    <CardDescription>Approve or reject patient reviews</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {loadingReviews ? (<div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>) : reviews && reviews.length > 0 ? (
                      <div className="space-y-4">{reviews.map((review) => (
                        <motion.div key={review.id} whileHover={{ scale: 1.01 }} className="p-4 rounded-xl border border-border/50 bg-white/50 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-medium">{review.display_name}</p>
                                <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => (<Star key={i} className={`w-4 h-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />))}</div>
                                <Badge className={review.status === "Approved" ? "status-completed" : review.status === "Pending" ? "status-pending" : "status-cancelled"}>{review.status}</Badge>
                              </div>
                              <p className="text-muted-foreground text-sm">{review.comment || "No comment"}</p>
                              <p className="text-xs text-muted-foreground mt-2">{format(new Date(review.created_at), "MMM d, yyyy")}</p>
                            </div>
                            {review.status === "Pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="hero" onClick={() => updateReviewStatus.mutate({ reviewId: review.id, status: "Approved" })}><Check className="w-4 h-4" /></Button>
                                <Button size="sm" variant="destructive" onClick={() => updateReviewStatus.mutate({ reviewId: review.id, status: "Rejected" })}><X className="w-4 h-4" /></Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}</div>
                    ) : (<p className="text-center py-8 text-muted-foreground">No reviews to moderate</p>)}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emails"><EmailLogsPanel /></TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}