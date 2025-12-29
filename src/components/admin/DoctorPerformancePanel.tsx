import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Stethoscope, 
  Star, 
  Users, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  ArrowUpDown,
  Calendar,
  Award,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DoctorPerformance {
  userId: string;
  name: string;
  specialty: string;
  fee: number;
  rating: number;
  totalPatients: number;
  totalRevenue: number;
  completedAppointments: number;
  cancelledAppointments: number;
  completionRate: number;
  avgPatientsPerMonth: number;
}

type SortField = "name" | "totalPatients" | "totalRevenue" | "rating" | "completionRate";
type SortOrder = "asc" | "desc";

export function DoctorPerformancePanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("totalRevenue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);

  // Fetch doctors
  const { data: doctors, isLoading: loadingDoctors } = useQuery({
    queryKey: ["performance-doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("user_id, specialty, fee, rating");
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for doctor names
  const { data: profiles } = useQuery({
    queryKey: ["performance-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("role", "doctor");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all appointments
  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ["performance-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, doctor_user_id, patient_user_id, status, appointment_date, created_at");
      if (error) throw error;
      return data;
    },
  });

  // Calculate performance metrics
  const doctorPerformance = useMemo((): DoctorPerformance[] => {
    if (!doctors || !profiles || !appointments) return [];

    const sixMonthsAgo = subMonths(new Date(), 6);

    return doctors.map((doctor) => {
      const profile = profiles.find((p) => p.id === doctor.user_id);
      const doctorAppointments = appointments.filter(
        (a) => a.doctor_user_id === doctor.user_id
      );

      const completedAppointments = doctorAppointments.filter(
        (a) => a.status === "Completed"
      ).length;
      const cancelledAppointments = doctorAppointments.filter(
        (a) => a.status === "Cancelled"
      ).length;
      const totalAppointments = doctorAppointments.length;

      // Unique patients
      const uniquePatients = new Set(
        doctorAppointments.map((a) => a.patient_user_id).filter(Boolean)
      ).size;

      // Revenue (only from non-cancelled appointments)
      const totalRevenue = doctorAppointments
        .filter((a) => a.status !== "Cancelled")
        .length * doctor.fee;

      // Monthly average (last 6 months)
      const recentAppointments = doctorAppointments.filter((a) => 
        new Date(a.appointment_date) >= sixMonthsAgo
      );
      const avgPatientsPerMonth = Math.round((recentAppointments.length / 6) * 10) / 10;

      return {
        userId: doctor.user_id,
        name: profile?.name || "Unknown Doctor",
        specialty: doctor.specialty,
        fee: doctor.fee,
        rating: doctor.rating || 4.0,
        totalPatients: uniquePatients,
        totalRevenue,
        completedAppointments,
        cancelledAppointments,
        completionRate: totalAppointments > 0 
          ? Math.round((completedAppointments / totalAppointments) * 100) 
          : 0,
        avgPatientsPerMonth,
      };
    });
  }, [doctors, profiles, appointments]);

  // Get unique specialties
  const specialties = useMemo(() => {
    const specs = new Set(doctorPerformance.map((d) => d.specialty));
    return Array.from(specs).sort();
  }, [doctorPerformance]);

  // Filter and sort
  const filteredDoctors = useMemo(() => {
    let result = [...doctorPerformance];

    // Search filter
    if (searchTerm) {
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Specialty filter
    if (specialtyFilter !== "all") {
      result = result.filter((d) => d.specialty === specialtyFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc" 
        ? (aVal as number) - (bVal as number) 
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [doctorPerformance, searchTerm, specialtyFilter, sortField, sortOrder]);

  // Top performers
  const topByRevenue = useMemo(() => 
    [...doctorPerformance].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5),
    [doctorPerformance]
  );

  const topByPatients = useMemo(() => 
    [...doctorPerformance].sort((a, b) => b.totalPatients - a.totalPatients).slice(0, 5),
    [doctorPerformance]
  );

  const topByRating = useMemo(() => 
    [...doctorPerformance].sort((a, b) => b.rating - a.rating).slice(0, 5),
    [doctorPerformance]
  );

  // Selected doctor details
  const selectedDoctorData = useMemo(() => {
    if (!selectedDoctor) return null;
    return doctorPerformance.find((d) => d.userId === selectedDoctor);
  }, [selectedDoctor, doctorPerformance]);

  // Radar chart data for selected doctor
  const radarData = useMemo(() => {
    if (!selectedDoctorData) return [];
    const maxRevenue = Math.max(...doctorPerformance.map((d) => d.totalRevenue)) || 1;
    const maxPatients = Math.max(...doctorPerformance.map((d) => d.totalPatients)) || 1;

    return [
      { metric: "Revenue", value: (selectedDoctorData.totalRevenue / maxRevenue) * 100, fullMark: 100 },
      { metric: "Patients", value: (selectedDoctorData.totalPatients / maxPatients) * 100, fullMark: 100 },
      { metric: "Rating", value: (selectedDoctorData.rating / 5) * 100, fullMark: 100 },
      { metric: "Completion", value: selectedDoctorData.completionRate, fullMark: 100 },
      { metric: "Avg/Month", value: Math.min((selectedDoctorData.avgPatientsPerMonth / 10) * 100, 100), fullMark: 100 },
    ];
  }, [selectedDoctorData, doctorPerformance]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!doctorPerformance.length) return { totalRevenue: 0, totalPatients: 0, avgRating: 0, avgCompletion: 0 };
    return {
      totalRevenue: doctorPerformance.reduce((sum, d) => sum + d.totalRevenue, 0),
      totalPatients: doctorPerformance.reduce((sum, d) => sum + d.totalPatients, 0),
      avgRating: Math.round((doctorPerformance.reduce((sum, d) => sum + d.rating, 0) / doctorPerformance.length) * 10) / 10,
      avgCompletion: Math.round(doctorPerformance.reduce((sum, d) => sum + d.completionRate, 0) / doctorPerformance.length),
    };
  }, [doctorPerformance]);

  if (loadingDoctors || loadingAppointments) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Rs. {summaryStats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats.totalPatients}</p>
                <p className="text-xs text-muted-foreground">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats.avgRating}</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats.avgCompletion}%</p>
                <p className="text-xs text-muted-foreground">Avg Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-green-600" />
              Top Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topByRevenue.map((doc, i) => (
              <div key={doc.userId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="truncate max-w-[120px]">{doc.name}</span>
                </div>
                <span className="font-medium text-green-600">Rs. {(doc.totalRevenue / 1000).toFixed(0)}k</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Most Patients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topByPatients.map((doc, i) => (
              <div key={doc.userId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="truncate max-w-[120px]">{doc.name}</span>
                </div>
                <span className="font-medium text-blue-600">{doc.totalPatients}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-600" />
              Highest Rated
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topByRating.map((doc, i) => (
              <div key={doc.userId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="truncate max-w-[120px]">{doc.name}</span>
                </div>
                <span className="font-medium text-yellow-600 flex items-center gap-1">
                  {doc.rating} <Star className="w-3 h-3 fill-yellow-500" />
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Doctor Details Modal */}
      {selectedDoctorData && (
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {selectedDoctorData.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>Dr. {selectedDoctorData.name}</CardTitle>
                  <CardDescription>{selectedDoctorData.specialty}</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDoctor(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-green-600">Rs. {selectedDoctorData.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Patients</p>
                    <p className="text-xl font-bold text-blue-600">{selectedDoctorData.totalPatients}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="text-xl font-bold text-yellow-600 flex items-center gap-1">
                      {selectedDoctorData.rating} <Star className="w-4 h-4 fill-yellow-500" />
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-xl font-bold text-purple-600">{selectedDoctorData.completionRate}%</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Completed</span>
                    <span className="text-sm font-medium text-green-600">{selectedDoctorData.completedAppointments}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Cancelled</span>
                    <span className="text-sm font-medium text-red-600">{selectedDoctorData.cancelledAppointments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg/Month</span>
                    <span className="text-sm font-medium">{selectedDoctorData.avgPatientsPerMonth}</span>
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Performance"
                      dataKey="value"
                      stroke="#0d9488"
                      fill="#0d9488"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doctor Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>All Doctors Performance</CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search doctors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {specialties.map((spec) => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => toggleSort("totalPatients")}
                    >
                      Patients
                      <ArrowUpDown className="ml-1 w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => toggleSort("totalRevenue")}
                    >
                      Revenue
                      <ArrowUpDown className="ml-1 w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => toggleSort("rating")}
                    >
                      Rating
                      <ArrowUpDown className="ml-1 w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => toggleSort("completionRate")}
                    >
                      Completion
                      <ArrowUpDown className="ml-1 w-3 h-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors.length > 0 ? (
                  filteredDoctors.map((doctor) => (
                    <TableRow key={doctor.userId} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {doctor.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">Dr. {doctor.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doctor.specialty}</Badge>
                      </TableCell>
                      <TableCell>{doctor.totalPatients}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        Rs. {doctor.totalRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {doctor.rating}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={doctor.completionRate >= 80 ? "default" : doctor.completionRate >= 50 ? "secondary" : "destructive"}>
                          {doctor.completionRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDoctor(doctor.userId)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No doctors found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
