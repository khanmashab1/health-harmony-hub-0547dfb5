import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CreditCard, 
  Search, 
  TrendingUp, 
  Users, 
  DollarSign,
  Crown,
  ChevronLeft,
  ChevronRight,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface DoctorWithPlan {
  user_id: string;
  specialty: string;
  fee: number;
  created_at: string;
  selected_plan_id: string | null;
  profile?: {
    name: string | null;
    phone: string | null;
    status: string;
  };
  plan?: {
    id: string;
    name: string;
    price: number;
    billing_period: string;
  };
}

export function SubscriptionsPanel() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Fetch all payment plans
  const { data: plans } = useQuery({
    queryKey: ["admin-payment-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_payment_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch doctors with their plans
  const { data: doctorsData, isLoading } = useQuery({
    queryKey: ["admin-doctors-subscriptions", planFilter],
    queryFn: async () => {
      let query = supabase
        .from("doctors")
        .select("user_id, specialty, fee, created_at, selected_plan_id")
        .order("created_at", { ascending: false });

      if (planFilter && planFilter !== "all") {
        if (planFilter === "none") {
          query = query.is("selected_plan_id", null);
        } else {
          query = query.eq("selected_plan_id", planFilter);
        }
      }

      const { data: doctors, error } = await query;
      if (error) throw error;

      // Get profiles for doctors
      const userIds = doctors?.map(d => d.user_id) || [];
      const planIds = doctors?.map(d => d.selected_plan_id).filter(Boolean) || [];

      const [profilesRes, plansRes] = await Promise.all([
        userIds.length > 0 
          ? supabase.from("profiles").select("id, name, phone, status").in("id", userIds)
          : Promise.resolve({ data: [] }),
        planIds.length > 0
          ? supabase.from("doctor_payment_plans").select("id, name, price, billing_period").in("id", planIds)
          : Promise.resolve({ data: [] }),
      ]);

      return doctors?.map(doc => ({
        ...doc,
        profile: profilesRes.data?.find(p => p.id === doc.user_id),
        plan: plansRes.data?.find(p => p.id === doc.selected_plan_id),
      })) as DoctorWithPlan[];
    },
  });

  // Calculate revenue metrics
  const metrics = {
    totalDoctors: doctorsData?.length || 0,
    subscribedDoctors: doctorsData?.filter(d => d.plan && d.plan.price > 0).length || 0,
    freePlanDoctors: doctorsData?.filter(d => !d.plan || d.plan.price === 0).length || 0,
    monthlyRevenue: doctorsData?.reduce((sum, d) => {
      if (!d.plan) return sum;
      const monthlyPrice = d.plan.billing_period === "yearly" 
        ? d.plan.price / 12 
        : d.plan.price;
      return sum + monthlyPrice;
    }, 0) || 0,
    yearlyRevenue: doctorsData?.reduce((sum, d) => {
      if (!d.plan) return sum;
      const yearlyPrice = d.plan.billing_period === "monthly" 
        ? d.plan.price * 12 
        : d.plan.price;
      return sum + yearlyPrice;
    }, 0) || 0,
  };

  // Filter by search
  const filteredDoctors = doctorsData?.filter(doc => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      doc.profile?.name?.toLowerCase().includes(searchLower) ||
      doc.specialty.toLowerCase().includes(searchLower) ||
      doc.plan?.name.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredDoctors.length / perPage);
  const paginatedDoctors = filteredDoctors.slice((page - 1) * perPage, page * perPage);

  const getPlanBadgeVariant = (plan: DoctorWithPlan["plan"]) => {
    if (!plan) return "secondary";
    if (plan.price === 0) return "secondary";
    if (plan.name.toLowerCase().includes("enterprise")) return "default";
    if (plan.name.toLowerCase().includes("professional")) return "default";
    return "outline";
  };

  const getPlanIcon = (plan: DoctorWithPlan["plan"]) => {
    if (!plan || plan.price === 0) return null;
    if (plan.name.toLowerCase().includes("enterprise")) return <Crown className="w-3 h-3 text-primary" />;
    if (plan.name.toLowerCase().includes("professional")) return <Star className="w-3 h-3 text-primary" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Revenue Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalDoctors}</p>
                <p className="text-xs text-muted-foreground">Total Doctors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.subscribedDoctors}</p>
                <p className="text-xs text-muted-foreground">Paid Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">Rs. {metrics.monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">Rs. {metrics.yearlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Projected Yearly</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card variant="glass" className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Plan Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {plans?.map(plan => {
              const count = doctorsData?.filter(d => d.selected_plan_id === plan.id).length || 0;
              const percentage = metrics.totalDoctors > 0 
                ? Math.round((count / metrics.totalDoctors) * 100) 
                : 0;
              
              return (
                <div key={plan.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <span className="font-medium">{plan.name}</span>
                  <Badge variant="secondary">{count}</Badge>
                  <span className="text-xs text-muted-foreground">({percentage}%)</span>
                </div>
              );
            })}
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <span className="font-medium">No Plan</span>
              <Badge variant="secondary">
                {doctorsData?.filter(d => !d.selected_plan_id).length || 0}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Doctors Table */}
      <Card variant="glass" className="border-border/50">
        <CardHeader className="border-b border-border/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Doctor Subscriptions
              </CardTitle>
              <CardDescription>View and manage doctor subscription statuses</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctors..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="none">No Plan</SelectItem>
                  {plans?.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : paginatedDoctors.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDoctors.map(doc => (
                    <TableRow key={doc.user_id}>
                      <TableCell className="font-medium">
                        {doc.profile?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.specialty}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getPlanIcon(doc.plan)}
                          <Badge variant={getPlanBadgeVariant(doc.plan)}>
                            {doc.plan?.name || "Free"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.plan ? (
                          <span className="text-sm">
                            Rs. {doc.plan.price.toLocaleString()}
                            <span className="text-muted-foreground text-xs">
                              /{doc.plan.billing_period === "yearly" ? "yr" : "mo"}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(doc.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={doc.profile?.status === "Active" ? "status-completed" : "status-pending"}
                        >
                          {doc.profile?.status || "Unknown"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filteredDoctors.length)} of {filteredDoctors.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No doctors found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
