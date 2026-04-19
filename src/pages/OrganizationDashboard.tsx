import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Settings,
  BarChart3,
  Stethoscope,
  Calendar,
  CheckCircle2,
  Crown,
  Search,
  MoreVertical,
  Trash2,
  Eye,
  Plus,
  MessageSquare,
} from "lucide-react";
import { SupportChatPanel } from "@/components/shared/SupportChatPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CreateDoctorDialog } from "@/components/organization/CreateDoctorDialog";
import { DoctorDashboardView } from "@/components/organization/DoctorDashboardView";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function OrganizationDashboard() {
  const { user, profile, loading } = useRequireAuth(["doctor"]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingDoctor, setViewingDoctor] = useState<{ id: string; name: string } | null>(null);

  // Fetch organization for current user
  const { data: organization, isLoading: loadingOrg } = useQuery({
    queryKey: ["my-organization", user?.id],
    queryFn: async () => {
      // First check if user owns an organization
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("*, subscription_plan:doctor_payment_plans(*)")
        .eq("owner_user_id", user!.id)
        .single();
      
      if (ownedOrg) return { ...ownedOrg, role: "owner" };

      // Check if user is a member of any organization
      const { data: membership } = await supabase
        .from("organization_members")
        .select("*, organization:organizations(*, subscription_plan:doctor_payment_plans(*))")
        .eq("user_id", user!.id)
        .single();

      if (membership) return { ...membership.organization, role: membership.role };
      
      return null;
    },
    enabled: !!user,
  });

  // Fetch organization doctors
  const { data: orgDoctors, isLoading: loadingDoctors } = useQuery({
    queryKey: ["org-doctors", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select(`
          *,
          profile:profiles!doctors_user_id_fkey(name, phone, avatar_path, status)
        `)
        .eq("organization_id", organization!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });

  // Fetch unified appointments for all org doctors
  const { data: allAppointments } = useQuery({
    queryKey: ["org-appointments", organization?.id],
    queryFn: async () => {
      const doctorIds = orgDoctors?.map(d => d.user_id) || [];
      if (doctorIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .in("doctor_user_id", doctorIds)
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgDoctors && orgDoctors.length > 0,
  });

  // Remove doctor from organization
  const removeDoctor = useMutation({
    mutationFn: async (doctorUserId: string) => {
      await supabase
        .from("doctors")
        .update({ organization_id: null })
        .eq("user_id", doctorUserId);
      
      await supabase
        .from("organization_members")
        .delete()
        .eq("organization_id", organization!.id)
        .eq("user_id", doctorUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-doctors"] });
      queryClient.invalidateQueries({ queryKey: ["org-members"] });
      toast({ title: "Doctor removed from organization" });
    },
  });

  // Calculate unified stats
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = allAppointments?.filter(a => a.appointment_date === todayStr) || [];
  const completedAppointments = allAppointments?.filter(a => a.status === "Completed") || [];
  const totalRevenue = completedAppointments.reduce((sum, apt) => {
    const doctor = orgDoctors?.find(d => d.user_id === apt.doctor_user_id);
    return sum + (doctor?.fee || 0);
  }, 0);

  // Chart data - appointments per doctor
  const doctorPerformanceData = orgDoctors?.map(doctor => ({
    name: doctor.profile?.name?.split(" ")[0] || "Doctor",
    appointments: allAppointments?.filter(a => a.doctor_user_id === doctor.user_id).length || 0,
    completed: allAppointments?.filter(a => a.doctor_user_id === doctor.user_id && a.status === "Completed").length || 0,
  })) || [];

  // Specialty distribution
  const specialtyData = orgDoctors?.reduce((acc, doctor) => {
    const existing = acc.find(s => s.name === doctor.specialty);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: doctor.specialty, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]) || [];

  // Filter doctors by search
  const filteredDoctors = orgDoctors?.filter(doc =>
    doc.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading || loadingOrg) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen bg-gradient-to-br from-muted/50 via-background to-primary/5">
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

  if (!organization) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen bg-gradient-to-br from-muted/50 via-background to-primary/5 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle>No Organization Found</CardTitle>
              <CardDescription>
                You don't have access to an organization dashboard. This feature is available for Enterprise plan subscribers.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <a href="/doctor">Go to Doctor Dashboard</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const isOwnerOrAdmin = organization.role === "owner" || organization.role === "admin";

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                <Building2 className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {organization.name}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
                    <Crown className="w-3 h-3" />
                    {organization.subscription_plan?.name || "Enterprise"}
                  </Badge>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground text-sm">
                    {orgDoctors?.length || 0} / {organization.max_doctors} Doctors
                  </span>
                </div>
              </div>
            </div>
            {isOwnerOrAdmin && organization?.id && (
              <CreateDoctorDialog organizationId={organization.id} />
            )}
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: "Total Doctors", value: orgDoctors?.length || 0, icon: Stethoscope, color: "from-blue-500 to-blue-600" },
              { label: "Today's Appointments", value: todayAppointments.length, icon: Calendar, color: "from-purple-500 to-purple-600" },
              { label: "Total Completed", value: completedAppointments.length, icon: CheckCircle2, color: "from-green-500 to-green-600" },
              { label: "Total Revenue", value: `PKR ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "from-amber-500 to-amber-600" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Content */}
          <Tabs defaultValue="doctors" className="space-y-6">
            <TabsList className="bg-muted/50 p-1.5 rounded-xl">
              <TabsTrigger value="doctors" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="w-4 h-4 mr-2" />
                Doctors
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="support" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <MessageSquare className="w-4 h-4 mr-2" />
                Support
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="support">
              {user && organization && (
                <SupportChatPanel viewerRole="org_owner" userId={user.id} organizationId={organization.id} />
              )}
            </TabsContent>

            {/* Doctors Tab */}
            <TabsContent value="doctors">
              <Card className="border-border/50">
                <CardHeader className="border-b border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Organization Doctors</CardTitle>
                      <CardDescription>
                        Manage doctors in your organization
                      </CardDescription>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search doctors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {loadingDoctors ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                    </div>
                  ) : filteredDoctors.length > 0 ? (
                    <div className="grid gap-4">
                      {filteredDoctors.map((doctor) => {
                        const doctorAppts = allAppointments?.filter(a => a.doctor_user_id === doctor.user_id) || [];
                        const todayCount = doctorAppts.filter(a => a.appointment_date === todayStr).length;
                        const completedCount = doctorAppts.filter(a => a.status === "Completed").length;

                        return (
                          <motion.div
                            key={doctor.user_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 border-2 border-border">
                                <AvatarImage src={(doctor.image_path || doctor.profile?.avatar_path)?.replace('zfibmvdqnagcajgehqni', 'zikbiesawrowlkhvrbmz')} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                                  {doctor.profile?.name?.charAt(0) || "D"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold">
                                  Dr. {doctor.profile?.name}
                                </h4>
                                <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="hidden sm:flex items-center gap-6 text-sm">
                                <div className="text-center">
                                  <p className="font-semibold">{todayCount}</p>
                                  <p className="text-muted-foreground text-xs">Today</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-semibold text-green-600">{completedCount}</p>
                                  <p className="text-muted-foreground text-xs">Completed</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-semibold text-primary">PKR {doctor.fee?.toLocaleString()}</p>
                                  <p className="text-muted-foreground text-xs">Fee</p>
                                </div>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={doctor.profile?.status === "Active" 
                                  ? "border-green-500/50 text-green-600" 
                                  : "border-muted-foreground/50 text-muted-foreground"
                                }
                              >
                                {doctor.profile?.status || "Active"}
                              </Badge>
                              {isOwnerOrAdmin && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                      onClick={() => setViewingDoctor({ 
                                        id: doctor.user_id, 
                                        name: doctor.profile?.name || "Doctor" 
                                      })}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Dashboard
                                    </DropdownMenuItem>
                                    {doctor.user_id !== user?.id && (
                                      <DropdownMenuItem
                                        onClick={() => removeDoctor.mutate(doctor.user_id)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove from Org
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No doctors in your organization yet</p>
                      {isOwnerOrAdmin && organization?.id && (
                        <div className="mt-4">
                          <CreateDoctorDialog 
                            organizationId={organization.id}
                            trigger={
                              <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Add First Doctor
                              </Button>
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Doctor Performance Chart */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Doctor Performance
                    </CardTitle>
                    <CardDescription>
                      Appointments by doctor
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={doctorPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="appointments" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completed" fill="hsl(var(--chart-2))" name="Completed" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Specialty Distribution */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-primary" />
                      Specialty Distribution
                    </CardTitle>
                    <CardDescription>
                      Doctors by specialty
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={specialtyData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {specialtyData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Revenue Overview */}
                <Card className="md:col-span-2 border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      Revenue by Doctor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {orgDoctors?.map((doctor) => {
                        const doctorRevenue = allAppointments
                          ?.filter(a => a.doctor_user_id === doctor.user_id && a.status === "Completed")
                          .length * (doctor.fee || 0);
                        
                        return (
                          <div key={doctor.user_id} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                            <p className="text-sm text-muted-foreground truncate">Dr. {doctor.profile?.name}</p>
                            <p className="text-xl font-bold mt-1">
                              PKR {doctorRevenue.toLocaleString()}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Organization Settings</CardTitle>
                  <CardDescription>
                    Manage your organization profile and subscription
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground">Organization Name</Label>
                        <Input 
                          value={organization.name} 
                          className="mt-1"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <Input 
                          value={organization.email || ""} 
                          className="mt-1"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <Input 
                          value={organization.phone || ""} 
                          className="mt-1"
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="w-5 h-5 text-primary" />
                          <span className="font-semibold">Subscription</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          {organization.subscription_plan?.name || "Enterprise"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Up to {organization.max_doctors} doctors
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge 
                          className={organization.subscription_status === "active" 
                            ? "bg-green-500/20 text-green-600 border-green-500/30 mt-2" 
                            : "bg-destructive/20 text-destructive border-destructive/30 mt-2"
                          }
                        >
                          {organization.subscription_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Doctor Dashboard View Modal */}
      {viewingDoctor && (
        <DoctorDashboardView
          doctorUserId={viewingDoctor.id}
          doctorName={viewingDoctor.name}
          open={!!viewingDoctor}
          onClose={() => setViewingDoctor(null)}
        />
      )}
    </Layout>
  );
}
