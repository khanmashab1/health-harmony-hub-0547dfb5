import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area } from "recharts";
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Activity } from "lucide-react";

interface DoctorWithPlan {
  user_id: string;
  specialty: string;
  fee: number;
  created_at: string;
  selected_plan_id: string | null;
  plan?: {
    id: string;
    name: string;
    price: number;
    billing_period: string;
  };
}

interface SubscriptionAnalyticsChartsProps {
  doctors: DoctorWithPlan[];
  plans: Array<{
    id: string;
    name: string;
    price: number;
    billing_period: string;
  }>;
}

const CHART_COLORS = {
  enterprise: "hsl(var(--chart-1))",
  professional: "hsl(var(--chart-2))",
  basic: "hsl(var(--chart-3))",
  free: "hsl(var(--chart-4))",
  revenue: "hsl(var(--chart-5))",
};

export function SubscriptionAnalyticsCharts({ doctors, plans }: SubscriptionAnalyticsChartsProps) {
  // Revenue by plan chart data
  const revenueByPlan = useMemo(() => {
    const planRevenue = plans.map(plan => {
      const subscribedDoctors = doctors.filter(d => d.selected_plan_id === plan.id);
      const monthlyRevenue = subscribedDoctors.reduce((sum, d) => {
        const monthlyPrice = plan.billing_period === "yearly" ? plan.price / 12 : plan.price;
        return sum + monthlyPrice;
      }, 0);
      return {
        name: plan.name,
        revenue: monthlyRevenue,
        doctors: subscribedDoctors.length,
        fill: plan.name.toLowerCase().includes("enterprise") 
          ? CHART_COLORS.enterprise 
          : plan.name.toLowerCase().includes("professional") 
            ? CHART_COLORS.professional 
            : CHART_COLORS.basic,
      };
    });

    // Add free tier
    const freeDoctors = doctors.filter(d => !d.selected_plan_id);
    planRevenue.push({
      name: "Free",
      revenue: 0,
      doctors: freeDoctors.length,
      fill: CHART_COLORS.free,
    });

    return planRevenue;
  }, [doctors, plans]);

  // Plan distribution for pie chart
  const planDistribution = useMemo(() => {
    return revenueByPlan.map(item => ({
      name: item.name,
      value: item.doctors,
      fill: item.fill,
    }));
  }, [revenueByPlan]);

  // Monthly growth simulation (last 6 months trend based on created_at)
  const monthlyGrowth = useMemo(() => {
    const now = new Date();
    const months: { month: string; doctors: number; revenue: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Count doctors who joined by this month
      const doctorsByMonth = doctors.filter(d => {
        const joinDate = new Date(d.created_at);
        return joinDate <= new Date(date.getFullYear(), date.getMonth() + 1, 0);
      });
      
      // Calculate revenue for those doctors
      const revenue = doctorsByMonth.reduce((sum, d) => {
        if (!d.plan) return sum;
        const monthlyPrice = d.plan.billing_period === "yearly" ? d.plan.price / 12 : d.plan.price;
        return sum + monthlyPrice;
      }, 0);
      
      months.push({
        month: monthName,
        doctors: doctorsByMonth.length,
        revenue: revenue,
      });
    }
    
    return months;
  }, [doctors]);

  // Revenue trend for area chart
  const revenueTrend = useMemo(() => {
    return monthlyGrowth.map(item => ({
      month: item.month,
      revenue: item.revenue,
    }));
  }, [monthlyGrowth]);

  const chartConfig = {
    revenue: { label: "Revenue (Rs.)", color: CHART_COLORS.revenue },
    doctors: { label: "Doctors", color: CHART_COLORS.professional },
    enterprise: { label: "Enterprise", color: CHART_COLORS.enterprise },
    professional: { label: "Professional", color: CHART_COLORS.professional },
    basic: { label: "Basic", color: CHART_COLORS.basic },
    free: { label: "Free", color: CHART_COLORS.free },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue by Plan Bar Chart */}
      <Card variant="glass" className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-chart-1" />
            Revenue by Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={revenueByPlan} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, "Monthly Revenue"]}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Plan Distribution Pie Chart */}
      <Card variant="glass" className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-chart-2" />
            Plan Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {planDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Revenue Trend Area Chart */}
      <Card variant="glass" className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-chart-5" />
            Revenue Trend (6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <AreaChart data={revenueTrend} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, "Revenue"]}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke={CHART_COLORS.revenue} 
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Doctor Growth Line Chart */}
      <Card variant="glass" className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-chart-2" />
            Doctor Growth (6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart data={monthlyGrowth} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => [value, "Total Doctors"]}
              />
              <Line 
                type="monotone" 
                dataKey="doctors" 
                stroke={CHART_COLORS.professional} 
                strokeWidth={2}
                dot={{ fill: CHART_COLORS.professional, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
