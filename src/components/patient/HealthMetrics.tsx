import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  Plus, 
  Activity, 
  Heart, 
  Scale, 
  Droplet, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Loader2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const metricSchema = z.object({
  systolic: z.string().optional(),
  diastolic: z.string().optional(),
  sugar_level: z.string().optional(),
  weight: z.string().optional(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

type MetricFormValues = z.infer<typeof metricSchema>;

interface HealthMetricsProps {
  userId: string;
  selectedPatientName?: string | null;
  isViewingManagedPatient?: boolean;
}

export function HealthMetrics({ userId, selectedPatientName, isViewingManagedPatient }: HealthMetricsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<MetricFormValues>({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      systolic: "",
      diastolic: "",
      sugar_level: "",
      weight: "",
      notes: "",
    },
  });

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["health-metrics", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_metrics")
        .select("*")
        .eq("patient_user_id", userId)
        .order("metric_date", { ascending: true })
        .limit(30);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const addMetricMutation = useMutation({
    mutationFn: async (values: MetricFormValues) => {
      const { error } = await supabase.from("health_metrics").insert({
        patient_user_id: userId,
        systolic: values.systolic ? parseInt(values.systolic) : null,
        diastolic: values.diastolic ? parseInt(values.diastolic) : null,
        sugar_level: values.sugar_level ? parseFloat(values.sugar_level) : null,
        weight: values.weight ? parseFloat(values.weight) : null,
        notes: values.notes || null,
        metric_date: format(new Date(), "yyyy-MM-dd"),
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Health metrics recorded!");
      queryClient.invalidateQueries({ queryKey: ["health-metrics", userId] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to record metrics");
    },
  });

  const onSubmit = (values: MetricFormValues) => {
    if (!values.systolic && !values.diastolic && !values.sugar_level && !values.weight) {
      toast.error("Please enter at least one metric");
      return;
    }
    addMetricMutation.mutate(values);
  };

  // Prepare chart data
  const chartData = metrics?.map(m => ({
    date: format(new Date(m.metric_date), "MMM d"),
    systolic: m.systolic,
    diastolic: m.diastolic,
    sugar: m.sugar_level,
    weight: m.weight,
  })) || [];

  // Get latest metrics
  const latestMetrics = metrics?.[metrics.length - 1];
  const previousMetrics = metrics?.[metrics.length - 2];

  const getTrend = (current: number | null, previous: number | null) => {
    if (!current || !previous) return null;
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "same";
  };

  const MetricCard = ({ 
    title, 
    value, 
    unit, 
    icon: Icon, 
    trend, 
    color 
  }: { 
    title: string; 
    value: number | null | undefined; 
    unit: string; 
    icon: typeof Heart;
    trend?: "up" | "down" | "same" | null;
    color: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">
              {value !== null && value !== undefined ? value : "-"}
              <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
            </p>
          </div>
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            trend === "up" ? "text-red-500" : trend === "down" ? "text-green-500" : "text-gray-500"
          }`}>
            {trend === "up" ? <TrendingUp className="w-4 h-4" /> : 
             trend === "down" ? <TrendingDown className="w-4 h-4" /> : 
             <Minus className="w-4 h-4" />}
            <span>{trend === "up" ? "Increased" : trend === "down" ? "Decreased" : "No change"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // If viewing managed patient, show info message since they don't have health metrics
  if (isViewingManagedPatient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Health Metrics for {selectedPatientName}</h3>
            <p className="text-sm text-muted-foreground">Track health over time</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">Health metrics are only available for your own account</p>
            <p className="text-sm text-muted-foreground">Switch to "Myself" to view and record your personal health metrics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Health Metrics</h3>
          <p className="text-sm text-muted-foreground">Track your health over time</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Record Metrics
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>Record Health Metrics</DialogTitle>
              <DialogDescription>
                Enter your latest health measurements
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="systolic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Systolic (mmHg)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="120" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="diastolic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diastolic (mmHg)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sugar_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Sugar (mg/dL)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="70" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any observations..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={addMetricMutation.isPending}>
                  {addMetricMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Metrics"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Blood Pressure"
          value={latestMetrics?.systolic}
          unit={latestMetrics?.diastolic ? `/${latestMetrics.diastolic}` : "mmHg"}
          icon={Heart}
          trend={getTrend(latestMetrics?.systolic ?? null, previousMetrics?.systolic ?? null)}
          color="bg-red-500"
        />
        <MetricCard
          title="Blood Sugar"
          value={latestMetrics?.sugar_level}
          unit="mg/dL"
          icon={Droplet}
          trend={getTrend(latestMetrics?.sugar_level ?? null, previousMetrics?.sugar_level ?? null)}
          color="bg-blue-500"
        />
        <MetricCard
          title="Weight"
          value={latestMetrics?.weight}
          unit="kg"
          icon={Scale}
          trend={getTrend(latestMetrics?.weight ?? null, previousMetrics?.weight ?? null)}
          color="bg-green-500"
        />
        <MetricCard
          title="Last Recorded"
          value={null}
          unit={latestMetrics ? format(new Date(latestMetrics.metric_date), "MMM d") : "-"}
          icon={Calendar}
          color="bg-purple-500"
        />
      </div>

      {/* Charts */}
      {chartData.length > 0 ? (
        <div className="space-y-6">
          {/* Blood Pressure Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Blood Pressure Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="systolic" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: "#ef4444" }}
                      name="Systolic"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="diastolic" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      dot={{ fill: "#f97316" }}
                      name="Diastolic"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sugar & Weight Chart */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Blood Sugar Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sugar" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6" }}
                        name="Blood Sugar"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weight Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={{ fill: "#22c55e" }}
                        name="Weight"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No health metrics recorded yet</p>
            <p className="text-sm text-muted-foreground">Start tracking your blood pressure, sugar levels, and weight</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
