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
  Edit,
  Trash2,
  UserPlus,
  Activity,
  Calendar,
  TrendingUp,
  LogOut
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

export default function AdminDashboard() {
  const { user, profile, loading } = useRequireAuth(["admin"]);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialogs
  const [createDoctorOpen, setCreateDoctorOpen] = useState(false);
  const [createPAOpen, setCreatePAOpen] = useState(false);
  const [assignPAOpen, setAssignPAOpen] = useState(false);

  // Search
  const [userSearch, setUserSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");

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

  // Fetch doctors with profiles
  const { data: doctors, isLoading: loadingDoctors } = useQuery({
    queryKey: ["admin-doctors", doctorSearch],
    queryFn: async () => {
      const { data: doctorData, error } = await supabase
        .from("doctors")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const userIds = doctorData?.map(d => d.user_id) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, phone, status")
          .in("id", userIds);
        
        return doctorData?.map(doc => ({
          ...doc,
          profile: profiles?.find(p => p.id === doc.user_id)
        }));
      }
      return doctorData;
    },
  });

  // Fetch PAs
  const { data: pas } = useQuery({
    queryKey: ["admin-pas"],
    queryFn: async () => {
      const { data: paProfiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "pa");
      
      if (error) throw error;
      return paProfiles;
    },
  });

  // Fetch PA assignments
  const { data: paAssignments } = useQuery({
    queryKey: ["admin-pa-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pa_assignments")
        .select("*");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch reviews
  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Update user status
  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User status updated" });
    },
  });

  // Update review status
  const updateReviewStatus = useMutation({
    mutationFn: async ({ reviewId, status }: { reviewId: string; status: string }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ status })
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Review status updated" });
    },
  });

  // Create PA assignment
  const createAssignment = useMutation({
    mutationFn: async ({ paId, doctorId }: { paId: string; doctorId: string }) => {
      const { error } = await supabase
        .from("pa_assignments")
        .insert({ pa_user_id: paId, doctor_user_id: doctorId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pa-assignments"] });
      setAssignPAOpen(false);
      toast({ title: "PA assigned to doctor" });
    },
  });

  // Delete PA assignment
  const deleteAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("pa_assignments")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pa-assignments"] });
      toast({ title: "Assignment removed" });
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
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
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
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage your platform</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Users", value: stats?.users || 0, icon: Users, color: "text-blue-600" },
              { label: "Doctors", value: stats?.doctors || 0, icon: Stethoscope, color: "text-green-600" },
              { label: "Appointments", value: stats?.appointments || 0, icon: Calendar, color: "text-purple-600" },
              { label: "Pending Reviews", value: stats?.pendingReviews || 0, icon: Star, color: "text-yellow-600" },
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
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="doctors">Doctors</TabsTrigger>
              <TabsTrigger value="pas">PAs</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle>User Management</CardTitle>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
                    </div>
                  ) : users && users.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium">Name</th>
                            <th className="text-left py-3 px-4 font-medium">Role</th>
                            <th className="text-left py-3 px-4 font-medium">Phone</th>
                            <th className="text-left py-3 px-4 font-medium">Status</th>
                            <th className="text-left py-3 px-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-4">{u.name || "-"}</td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="capitalize">{u.role}</Badge>
                              </td>
                              <td className="py-3 px-4">{u.phone || "-"}</td>
                              <td className="py-3 px-4">
                                <Badge variant={u.status === "Active" ? "default" : "secondary"}>
                                  {u.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem
                                      onClick={() => updateUserStatus.mutate({
                                        userId: u.id,
                                        status: u.status === "Active" ? "Inactive" : "Active"
                                      })}
                                    >
                                      {u.status === "Active" ? "Deactivate" : "Activate"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No users found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Doctors Tab */}
            <TabsContent value="doctors">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle>Doctor Management</CardTitle>
                    <Dialog open={createDoctorOpen} onOpenChange={setCreateDoctorOpen}>
                      <DialogTrigger asChild>
                        <Button variant="hero">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Doctor
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <CreateDoctorForm onSuccess={() => {
                          setCreateDoctorOpen(false);
                          queryClient.invalidateQueries({ queryKey: ["admin-doctors"] });
                        }} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingDoctors ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                    </div>
                  ) : doctors && doctors.length > 0 ? (
                    <div className="grid gap-4">
                      {doctors.map((doc: any) => (
                        <div key={doc.user_id} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Stethoscope className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">Dr. {doc.profile?.name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">{doc.specialty}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span>Rs. {doc.fee}</span>
                                <span>•</span>
                                <span>{doc.city}, {doc.province}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  {doc.rating || 4.0}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge variant={doc.profile?.status === "Active" ? "default" : "secondary"}>
                            {doc.profile?.status || "Active"}
                          </Badge>
                        </div>
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
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>PA Accounts</CardTitle>
                      <Dialog open={createPAOpen} onOpenChange={setCreatePAOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Create PA
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <CreatePAForm onSuccess={() => {
                            setCreatePAOpen(false);
                            queryClient.invalidateQueries({ queryKey: ["admin-pas"] });
                          }} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {pas && pas.length > 0 ? (
                      <div className="space-y-3">
                        {pas.map((pa) => (
                          <div key={pa.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <UserCog className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-medium">{pa.name || "Unnamed PA"}</p>
                                <p className="text-xs text-muted-foreground">{pa.phone || "No phone"}</p>
                              </div>
                            </div>
                            <Badge variant={pa.status === "Active" ? "default" : "secondary"}>
                              {pa.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">No PAs found</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>PA Assignments</CardTitle>
                      <Dialog open={assignPAOpen} onOpenChange={setAssignPAOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Assign PA
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <AssignPAForm
                            pas={pas || []}
                            doctors={doctors || []}
                            onSubmit={(paId, doctorId) => createAssignment.mutate({ paId, doctorId })}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {paAssignments && paAssignments.length > 0 ? (
                      <div className="space-y-3">
                        {paAssignments.map((assignment) => {
                          const pa = pas?.find(p => p.id === assignment.pa_user_id);
                          const doc = doctors?.find((d: any) => d.user_id === assignment.doctor_user_id);
                          return (
                            <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border">
                              <div className="text-sm">
                                <span className="font-medium">{pa?.name || "PA"}</span>
                                <span className="text-muted-foreground"> → </span>
                                <span className="font-medium">Dr. {(doc as any)?.profile?.name || "Doctor"}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAssignment.mutate(assignment.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground">No assignments</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <CardTitle>Review Moderation</CardTitle>
                  <CardDescription>Approve or reject patient reviews</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingReviews ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
                    </div>
                  ) : reviews && reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="p-4 rounded-xl border bg-card">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-medium">{review.display_name}</p>
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                                    />
                                  ))}
                                </div>
                                <Badge variant={
                                  review.status === "Approved" ? "default" :
                                  review.status === "Pending" ? "secondary" : "destructive"
                                }>
                                  {review.status}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-sm">{review.comment || "No comment"}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(review.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                            {review.status === "Pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateReviewStatus.mutate({ reviewId: review.id, status: "Approved" })}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateReviewStatus.mutate({ reviewId: review.id, status: "Rejected" })}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No reviews to moderate</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

// Create Doctor Form Component
function CreateDoctorForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [fee, setFee] = useState("500");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [experience, setExperience] = useState("0");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create auth user with doctor role
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: "doctor" },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Wait a moment for the profile trigger to run
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update profile with phone
      await supabase.from("profiles").update({ phone, province, city }).eq("id", authData.user.id);

      // Create doctor record
      const { error: doctorError } = await supabase.from("doctors").insert({
        user_id: authData.user.id,
        specialty,
        fee: parseFloat(fee),
        province,
        city,
        experience_years: parseInt(experience),
        bio,
      });

      if (doctorError) throw doctorError;

      toast({ title: "Doctor created successfully" });
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to create doctor", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Add New Doctor</DialogTitle>
        <DialogDescription>Create a new doctor account</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Email *</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1" />
          </div>
          <div>
            <Label>Password *</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Specialty *</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map((s) => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fee (Rs.) *</Label>
            <Input value={fee} onChange={(e) => setFee(e.target.value)} type="number" className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Province</Label>
            <Select value={province} onValueChange={(v) => { setProvince(v); setCity(""); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>City</Label>
            <Select value={city} onValueChange={setCity} disabled={!province}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {(CITIES[province] || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Experience (years)</Label>
          <Input value={experience} onChange={(e) => setExperience(e.target.value)} type="number" className="mt-1" />
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1" />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Doctor"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Create PA Form Component
function CreatePAForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: "pa" },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      await new Promise(resolve => setTimeout(resolve, 1000));
      await supabase.from("profiles").update({ phone }).eq("id", authData.user.id);

      toast({ title: "PA created successfully" });
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to create PA", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create PA Account</DialogTitle>
        <DialogDescription>Create a new Personal Assistant account</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div>
          <Label>Email *</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1" />
        </div>
        <div>
          <Label>Password *</Label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1" />
        </div>
        <div>
          <Label>Full Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create PA"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Assign PA Form Component
function AssignPAForm({ pas, doctors, onSubmit }: { pas: any[]; doctors: any[]; onSubmit: (paId: string, doctorId: string) => void }) {
  const [paId, setPaId] = useState("");
  const [doctorId, setDoctorId] = useState("");

  return (
    <>
      <DialogHeader>
        <DialogTitle>Assign PA to Doctor</DialogTitle>
        <DialogDescription>Select a PA and doctor to create an assignment</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div>
          <Label>Select PA</Label>
          <Select value={paId} onValueChange={setPaId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose PA" /></SelectTrigger>
            <SelectContent>
              {pas.map((pa) => (
                <SelectItem key={pa.id} value={pa.id}>{pa.name || pa.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Select Doctor</Label>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose Doctor" /></SelectTrigger>
            <SelectContent>
              {doctors.map((doc: any) => (
                <SelectItem key={doc.user_id} value={doc.user_id}>
                  Dr. {doc.profile?.name || "Unknown"} - {doc.specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(paId, doctorId)} disabled={!paId || !doctorId}>
          Assign
        </Button>
      </DialogFooter>
    </>
  );
}
