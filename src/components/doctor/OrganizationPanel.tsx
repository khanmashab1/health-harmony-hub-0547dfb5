import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Building2,
  Users,
  Plus,
  Stethoscope,
  Calendar,
  CheckCircle2,
  Crown,
  Search,
  Trash2,
  DollarSign,
  BarChart3,
  ExternalLink,
  MoreVertical,
  Eye,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import { CreateDoctorDialog } from "@/components/organization/CreateDoctorDialog";
import { DoctorDashboardView } from "@/components/organization/DoctorDashboardView";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

interface OrganizationPanelProps {
  userId: string;
  userEmail?: string;
  userName?: string;
}

export function OrganizationPanel({ userId, userEmail, userName }: OrganizationPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [viewingDoctor, setViewingDoctor] = useState<{ id: string; name: string } | null>(null);

  // Fetch organization for current user
  const { data: organization, isLoading: loadingOrg } = useQuery({
    queryKey: ["my-organization", userId],
    queryFn: async () => {
      // First check if user owns an organization
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("*, subscription_plan:doctor_payment_plans(*)")
        .eq("owner_user_id", userId)
        .single();
      
      if (ownedOrg) return { ...ownedOrg, role: "owner" };

      // Check if user is a member of any organization
      const { data: membership } = await supabase
        .from("organization_members")
        .select("*, organization:organizations(*, subscription_plan:doctor_payment_plans(*))")
        .eq("user_id", userId)
        .single();

      if (membership?.organization) {
        return { ...membership.organization, role: membership.role };
      }
      
      return null;
    },
    enabled: !!userId,
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

  // Create organization mutation
  const createOrganization = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("organizations")
        .insert({
          name,
          owner_user_id: userId,
          email: userEmail,
          max_doctors: 10,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Add self as organization member
      await supabase.from("organization_members").insert({
        organization_id: data.id,
        user_id: userId,
        role: "owner",
      });

      // Update doctor's organization_id
      await supabase
        .from("doctors")
        .update({ organization_id: data.id })
        .eq("user_id", userId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-organization"] });
      toast({ title: "Organization created successfully!" });
      setIsCreateOrgOpen(false);
      setNewOrgName("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
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
      toast({ title: "Doctor removed from organization" });
    },
  });

  // Resend credentials mutation
  const resendCredentials = useMutation({
    mutationFn: async (doctorUserId: string) => {
      const response = await supabase.functions.invoke("resend-doctor-credentials", {
        body: {
          doctorUserId,
          organizationId: organization!.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to resend credentials");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast({ 
        title: "Credentials Sent", 
        description: data.message || "New login credentials have been emailed to the doctor." 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Calculate stats
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = allAppointments?.filter(a => a.appointment_date === todayStr) || [];
  const completedAppointments = allAppointments?.filter(a => a.status === "Completed") || [];
  const totalRevenue = completedAppointments.reduce((sum, apt) => {
    const doctor = orgDoctors?.find(d => d.user_id === apt.doctor_user_id);
    return sum + (doctor?.fee || 0);
  }, 0);

  // Chart data
  const doctorPerformanceData = orgDoctors?.map(doctor => ({
    name: doctor.profile?.name?.split(" ")[0] || "Doctor",
    appointments: allAppointments?.filter(a => a.doctor_user_id === doctor.user_id).length || 0,
    completed: allAppointments?.filter(a => a.doctor_user_id === doctor.user_id && a.status === "Completed").length || 0,
  })) || [];

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

  if (loadingOrg) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // No organization - show create option
  if (!organization) {
    return (
      <Card variant="glass" className="border-border/50">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-6">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Create Your Organization</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            As an Enterprise subscriber, you can create an organization to manage multiple doctors, view unified analytics, and streamline billing.
          </p>
          <Dialog open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Your Organization</DialogTitle>
                <DialogDescription>
                  Enter a name for your clinic or organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input
                    placeholder="e.g., City Medical Center"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={() => createOrganization.mutate(newOrgName)}
                  disabled={createOrganization.isPending || !newOrgName.trim()}
                >
                  {createOrganization.isPending ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <Card variant="glass" className="border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <Building2 className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{organization.name}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                    <Crown className="w-3 h-3" />
                    {organization.subscription_plan?.name || "Enterprise"}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    {orgDoctors?.length || 0} / {organization.max_doctors} Doctors
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {organization?.id && (
                <CreateDoctorDialog organizationId={organization.id} />
              )}
              <Button variant="outline" asChild>
                <Link to="/organization">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Full Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Doctors", value: orgDoctors?.length || 0, icon: Stethoscope, color: "from-blue-500 to-blue-600" },
          { label: "Today's Appointments", value: todayAppointments.length, icon: Calendar, color: "from-purple-500 to-purple-600" },
          { label: "Total Completed", value: completedAppointments.length, icon: CheckCircle2, color: "from-green-500 to-green-600" },
          { label: "Total Revenue", value: `PKR ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "from-amber-500 to-amber-600" },
        ].map((stat) => (
          <Card key={stat.label} variant="glass" className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Doctors List */}
      <Card variant="glass" className="border-border/50">
        <CardHeader className="border-b border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Organization Doctors</CardTitle>
              <CardDescription>Manage doctors in your organization</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
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
                    className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={doctor.image_path?.replace('zfibmvdqnagcajgehqni', 'zikbiesawrowlkhvrbmz') || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {doctor.profile?.name?.[0] || "D"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">Dr. {doctor.profile?.name}</p>
                        <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center hidden sm:block">
                        <p className="text-lg font-bold">{todayCount}</p>
                        <p className="text-xs text-muted-foreground">Today</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-lg font-bold text-green-600">{completedCount}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <Badge variant={doctor.profile?.status === "Active" ? "default" : "secondary"}>
                        {doctor.profile?.status || "Active"}
                      </Badge>
                      {organization.role === "owner" && (
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
                            {doctor.user_id !== userId && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => resendCredentials.mutate(doctor.user_id)}
                                  disabled={resendCredentials.isPending}
                                >
                                  <Mail className="w-4 h-4 mr-2" />
                                  Resend Credentials
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => removeDoctor.mutate(doctor.user_id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove from Organization
                                </DropdownMenuItem>
                              </>
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
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No doctors in organization yet</p>
              {organization?.id && (
                <div className="mt-4">
                  <CreateDoctorDialog 
                    organizationId={organization.id}
                    trigger={
                      <Button variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Doctor
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Chart */}
      {doctorPerformanceData.length > 0 && (
        <Card variant="glass" className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Doctor Performance
            </CardTitle>
            <CardDescription>Appointments by doctor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={doctorPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="appointments" fill="hsl(var(--muted-foreground))" name="Total" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doctor Dashboard View Modal */}
      {viewingDoctor && (
        <DoctorDashboardView
          doctorUserId={viewingDoctor.id}
          doctorName={viewingDoctor.name}
          open={!!viewingDoctor}
          onClose={() => setViewingDoctor(null)}
        />
      )}
    </div>
  );
}