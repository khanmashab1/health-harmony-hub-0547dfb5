import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  DollarSign,
  Activity,
  UserPlus,
  Stethoscope
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"];

export function AnalyticsPanel() {
  // Fetch appointments for trends
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ["analytics-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, status, payment_method, payment_status, created_at, doctor_user_id")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch doctors with fees
  const { data: doctors } = useQuery({
    queryKey: ["analytics-doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("user_id, fee, specialty");
      if (error) throw error;
      return data;
    },
  });

  // Fetch user growth data
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["analytics-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Calculate appointment trends (last 30 days)
  const appointmentTrends = (() => {
    if (!appointments) return [];
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    return last30Days.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const count = appointments.filter(
        (a) => format(new Date(a.appointment_date), "yyyy-MM-dd") === dateStr
      ).length;
      return {
        date: format(date, "MMM d"),
        appointments: count,
      };
    });
  })();

  // Calculate monthly revenue
  const revenueData = (() => {
    if (!appointments || !doctors) return [];
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return last6Months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthAppointments = appointments.filter((a) => {
        const date = new Date(a.appointment_date);
        return date >= monthStart && date <= monthEnd && a.status !== "Cancelled";
      });

      const revenue = monthAppointments.reduce((sum, a) => {
        const doctor = doctors.find((d) => d.user_id === a.doctor_user_id);
        return sum + (doctor?.fee || 500);
      }, 0);

      return {
        month: format(month, "MMM"),
        revenue: revenue,
        appointments: monthAppointments.length,
      };
    });
  })();

  // Calculate user growth
  const userGrowth = (() => {
    if (!users) return [];
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return last6Months.map((month) => {
      const monthEnd = endOfMonth(month);
      const totalUsers = users.filter(
        (u) => new Date(u.created_at) <= monthEnd
      ).length;
      const newUsers = users.filter((u) => {
        const date = new Date(u.created_at);
        return date >= startOfMonth(month) && date <= monthEnd;
      }).length;

      return {
        month: format(month, "MMM"),
        total: totalUsers,
        new: newUsers,
      };
    });
  })();

  // Appointment status distribution
  const statusDistribution = (() => {
    if (!appointments) return [];
    const statusCounts: Record<string, number> = {};
    appointments.forEach((a) => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  })();

  // Specialty distribution
  const specialtyDistribution = (() => {
    if (!doctors || !appointments) return [];
    const specialtyCounts: Record<string, number> = {};
    appointments.forEach((a) => {
      const doctor = doctors.find((d) => d.user_id === a.doctor_user_id);
      if (doctor) {
        specialtyCounts[doctor.specialty] = (specialtyCounts[doctor.specialty] || 0) + 1;
      }
    });
    return Object.entries(specialtyCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  })();

  // Calculate key metrics
  const metrics = (() => {
    if (!appointments || !users || !doctors) {
      return {
        totalAppointments: 0,
        thisMonthAppointments: 0,
        appointmentGrowth: 0,
        totalRevenue: 0,
        thisMonthRevenue: 0,
        revenueGrowth: 0,
        totalUsers: 0,
        newUsersThisMonth: 0,
        userGrowth: 0,
        avgAppointmentsPerDay: 0,
      };
    }

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthAppointments = appointments.filter(
      (a) => new Date(a.appointment_date) >= thisMonthStart
    );
    const lastMonthAppointments = appointments.filter((a) => {
      const date = new Date(a.appointment_date);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });

    const calcRevenue = (apps: typeof appointments) =>
      apps.reduce((sum, a) => {
        if (a.status === "Cancelled") return sum;
        const doctor = doctors.find((d) => d.user_id === a.doctor_user_id);
        return sum + (doctor?.fee || 500);
      }, 0);

    const thisMonthRevenue = calcRevenue(thisMonthAppointments);
    const lastMonthRevenue = calcRevenue(lastMonthAppointments);

    const newUsersThisMonth = users.filter(
      (u) => new Date(u.created_at) >= thisMonthStart
    ).length;
    const newUsersLastMonth = users.filter((u) => {
      const date = new Date(u.created_at);
      return date >= lastMonthStart && date <= lastMonthEnd;
    }).length;

    return {
      totalAppointments: appointments.length,
      thisMonthAppointments: thisMonthAppointments.length,
      appointmentGrowth: lastMonthAppointments.length
        ? ((thisMonthAppointments.length - lastMonthAppointments.length) / lastMonthAppointments.length) * 100
        : 100,
      totalRevenue: calcRevenue(appointments),
      thisMonthRevenue,
      revenueGrowth: lastMonthRevenue
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 100,
      totalUsers: users.length,
      newUsersThisMonth,
      userGrowth: newUsersLastMonth
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
        : 100,
      avgAppointmentsPerDay: Math.round(appointments.length / 30),
    };
  })();

  if (loadingAppointments || loadingUsers) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">Rs. {metrics.totalRevenue.toLocaleString()}</p>
                <div className={`flex items-center gap-1 text-xs ${metrics.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {metrics.revenueGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(metrics.revenueGrowth).toFixed(1)}% from last month
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Appointments</p>
                <p className="text-2xl font-bold">{metrics.totalAppointments}</p>
                <div className={`flex items-center gap-1 text-xs ${metrics.appointmentGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {metrics.appointmentGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(metrics.appointmentGrowth).toFixed(1)}% from last month
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{metrics.totalUsers}</p>
                <div className={`flex items-center gap-1 text-xs ${metrics.userGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {metrics.userGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(metrics.userGrowth).toFixed(1)}% from last month
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Users</p>
                <p className="text-2xl font-bold">{metrics.newUsersThisMonth}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Appointment Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Appointment Trends
            </CardTitle>
            <CardDescription>Daily appointments over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={appointmentTrends}>
                  <defs>
                    <linearGradient id="appointmentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Area
                    type="monotone"
                    dataKey="appointments"
                    stroke="#0d9488"
                    strokeWidth={2}
                    fill="url(#appointmentGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Monthly Revenue
            </CardTitle>
            <CardDescription>Revenue trends over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, "Revenue"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              User Growth
            </CardTitle>
            <CardDescription>Total and new users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6" }}
                    name="Total Users"
                  />
                  <Line
                    type="monotone"
                    dataKey="new"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: "#f59e0b" }}
                    name="New Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Charts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Top Specialties
            </CardTitle>
            <CardDescription>Most booked specialties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {specialtyDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {statusDistribution.map((status, index) => (
              <div key={status.name} className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div>
                  <p className="font-medium">{status.name}</p>
                  <p className="text-sm text-muted-foreground">{status.value} appointments</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
