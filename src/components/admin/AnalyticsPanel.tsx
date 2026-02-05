import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths, isWithinInterval, parseISO } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar as CalendarIcon, 
  DollarSign,
  Activity,
  UserPlus,
  Stethoscope,
  Download,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"];

type DateRange = {
  from: Date;
  to: Date;
};

const presetRanges = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This Month", days: -1 },
  { label: "Last 6 Months", days: -6 },
];

export function AnalyticsPanel() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePresetClick = (days: number) => {
    const now = new Date();
    if (days === -1) {
      // This month
      setDateRange({ from: startOfMonth(now), to: now });
    } else if (days === -6) {
      // Last 6 months
      setDateRange({ from: subMonths(now, 6), to: now });
    } else {
      setDateRange({ from: subDays(now, days), to: now });
    }
  };

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

  // Filter data by date range
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter((a) => {
      const date = new Date(a.appointment_date);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [appointments, dateRange]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const date = new Date(u.created_at);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [users, dateRange]);

  // Calculate appointment trends
  const appointmentTrends = useMemo(() => {
    if (!filteredAppointments.length) return [];
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    return days.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const count = filteredAppointments.filter(
        (a) => format(new Date(a.appointment_date), "yyyy-MM-dd") === dateStr
      ).length;
      return {
        date: format(date, "MMM d"),
        appointments: count,
      };
    });
  }, [filteredAppointments, dateRange]);

  // Calculate monthly revenue
  const revenueData = useMemo(() => {
    if (!filteredAppointments.length || !doctors) return [];
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthAppointments = filteredAppointments.filter((a) => {
        const date = new Date(a.appointment_date);
        return date >= monthStart && date <= monthEnd && a.status !== "Cancelled";
      });

      const revenue = monthAppointments.reduce((sum, a) => {
        const doctor = doctors.find((d) => d.user_id === a.doctor_user_id);
        return sum + (doctor?.fee || 500);
      }, 0);

      return {
        month: format(month, "MMM yyyy"),
        revenue: revenue,
        appointments: monthAppointments.length,
      };
    });
  }, [filteredAppointments, doctors, dateRange]);

  // Calculate user growth
  const userGrowth = useMemo(() => {
    if (!users) return [];
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });

    return months.map((month) => {
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
  }, [users, dateRange]);

  // Appointment status distribution
  const statusDistribution = useMemo(() => {
    if (!filteredAppointments.length) return [];
    const statusCounts: Record<string, number> = {};
    filteredAppointments.forEach((a) => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [filteredAppointments]);

  // Specialty distribution
  const specialtyDistribution = useMemo(() => {
    if (!doctors || !filteredAppointments.length) return [];
    const specialtyCounts: Record<string, number> = {};
    filteredAppointments.forEach((a) => {
      const doctor = doctors.find((d) => d.user_id === a.doctor_user_id);
      if (doctor) {
        specialtyCounts[doctor.specialty] = (specialtyCounts[doctor.specialty] || 0) + 1;
      }
    });
    return Object.entries(specialtyCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredAppointments, doctors]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (!filteredAppointments.length || !doctors) {
      return {
        totalAppointments: 0,
        totalRevenue: 0,
        newUsers: filteredUsers.length,
        avgPerDay: 0,
      };
    }

    const totalRevenue = filteredAppointments
      .filter((a) => a.status !== "Cancelled")
      .reduce((sum, a) => {
        const doctor = doctors.find((d) => d.user_id === a.doctor_user_id);
        return sum + (doctor?.fee || 500);
      }, 0);

    const daysDiff = Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      totalAppointments: filteredAppointments.length,
      totalRevenue,
      newUsers: filteredUsers.length,
      avgPerDay: Math.round(filteredAppointments.length / daysDiff * 10) / 10,
    };
  }, [filteredAppointments, filteredUsers, doctors, dateRange]);

  // Export functions
  const exportToCSV = () => {
    const headers = ["Date", "Appointments", "Revenue"];
    const rows = revenueData.map((r) => [r.month, r.appointments, r.revenue]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "CSV exported successfully" });
  };

  const exportToPDF = () => {
    // Create a printable report
    const reportContent = `
      ANALYTICS REPORT
      ================
      Period: ${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}
      
      KEY METRICS
      -----------
      Total Appointments: ${metrics.totalAppointments}
      Total Revenue: Rs. ${metrics.totalRevenue.toLocaleString()}
      New Users: ${metrics.newUsers}
      Avg. Appointments/Day: ${metrics.avgPerDay}
      
      MONTHLY BREAKDOWN
      -----------------
      ${revenueData.map((r) => `${r.month}: ${r.appointments} appointments, Rs. ${r.revenue.toLocaleString()}`).join("\n      ")}
      
      APPOINTMENT STATUS
      ------------------
      ${statusDistribution.map((s) => `${s.name}: ${s.value}`).join("\n      ")}
      
      TOP SPECIALTIES
      ---------------
      ${specialtyDistribution.map((s) => `${s.name}: ${s.value} appointments`).join("\n      ")}
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Analytics Report</title>
            <style>
              body { font-family: monospace; padding: 40px; white-space: pre-wrap; }
              @media print { body { padding: 20px; } }
            </style>
          </head>
          <body>${reportContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

    toast({ title: "PDF report opened for printing" });
  };

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
      {/* Date Range Filter & Export */}
      <div className="flex flex-col gap-4">
        {/* Preset buttons - grid on mobile for better touch targets */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {presetRanges.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick(preset.days)}
              className="text-xs justify-center"
            >
              {preset.label}
            </Button>
          ))}
        </div>
        
        {/* Calendar picker and export - always visible */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs flex-1 sm:flex-none justify-start">
                <CalendarIcon className="w-3 h-3 mr-1" />
                {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                    setCalendarOpen(false);
                  }
                }}
                numberOfMonths={1}
                className="sm:hidden"
              />
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                    setCalendarOpen(false);
                  }
                }}
                numberOfMonths={2}
                className="hidden sm:block"
              />
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-lg sm:text-2xl font-bold truncate">Rs. {metrics.totalRevenue.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">In selected period</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Appointments</p>
                <p className="text-lg sm:text-2xl font-bold">{metrics.totalAppointments}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">In selected period</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">New Users</p>
                <p className="text-lg sm:text-2xl font-bold">{metrics.newUsers}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">In selected period</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Avg/Day</p>
                <p className="text-lg sm:text-2xl font-bold">{metrics.avgPerDay}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Appointments</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Appointment Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Activity className="w-5 h-5 text-primary" />
              Appointment Trends
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Daily appointments in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {appointmentTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={appointmentTrends}>
                    <defs>
                      <linearGradient id="appointmentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 12 }} />
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
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data for selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
              Revenue by Month
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Monthly revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
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
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data for selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="w-5 h-5 text-purple-600" />
              User Growth
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Total and new users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {userGrowth.length > 0 ? (
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
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data for selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distribution Charts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Stethoscope className="w-5 h-5 text-primary" />
              Top Specialties
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Most booked specialties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
              {specialtyDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={specialtyDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name.substring(0, 10)}... ${(percent * 100).toFixed(0)}%`}
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
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data for selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Appointment Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {statusDistribution.length > 0 ? (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4">
              {statusDistribution.map((status, index) => (
                <div key={status.name} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/50">
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
          ) : (
            <p className="text-center py-8 text-muted-foreground">No appointments in selected period</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
