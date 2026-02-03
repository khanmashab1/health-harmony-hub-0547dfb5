import { useState } from "react";
import { format, isPast, isFuture, isToday, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { 
  FileText, Calendar, Clock, Bell, ChevronRight, 
  Stethoscope, Pill, AlertCircle, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { MedicinesList, parseMedicines } from "@/components/shared/MedicinesList";

interface PrescriptionHistoryProps {
  userId: string;
  selectedPatientName?: string | null;
  selectedPatientId?: string | null;
}

export function PrescriptionHistory({ userId, selectedPatientName, selectedPatientId }: PrescriptionHistoryProps) {
  const [activeTab, setActiveTab] = useState("all");
  
  // Determine if viewing managed patient
  const isViewingManagedPatient = !!selectedPatientId;

  // Fetch completed appointments with prescriptions
  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ["patient-prescriptions", userId, selectedPatientId, selectedPatientName],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select(`
          *,
          doctor:doctor_user_id (
            id,
            name
          )
        `)
        .eq("status", "Completed")
        .not("diagnosis", "is", null)
        .order("appointment_date", { ascending: false });

      // Filter by patient - either by patient_user_id or patient_full_name for managed patients
      if (isViewingManagedPatient && selectedPatientName) {
        query = query.eq("patient_full_name", selectedPatientName);
      } else {
        query = query.eq("patient_user_id", userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch doctor names from profiles
      const doctorIds = [...new Set(data?.map(d => d.doctor_user_id) || [])];
      if (doctorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", doctorIds);

        const { data: doctors } = await supabase
          .from("doctors")
          .select("user_id, specialty")
          .in("user_id", doctorIds);

        return data?.map(apt => ({
          ...apt,
          doctorName: profiles?.find(p => p.id === apt.doctor_user_id)?.name || "Doctor",
          doctorSpecialty: doctors?.find(d => d.user_id === apt.doctor_user_id)?.specialty || "",
        }));
      }

      return data;
    },
  });

  const today = new Date();
  
  // Filter prescriptions based on follow-up status
  const upcomingFollowUps = prescriptions?.filter(p => 
    p.follow_up_date && isFuture(new Date(p.follow_up_date))
  ) || [];
  
  const overdueFollowUps = prescriptions?.filter(p => 
    p.follow_up_date && isPast(new Date(p.follow_up_date)) && !isToday(new Date(p.follow_up_date))
  ) || [];
  
  const todayFollowUps = prescriptions?.filter(p => 
    p.follow_up_date && isToday(new Date(p.follow_up_date))
  ) || [];

  // Use shared parseMedicines from MedicinesList component

  const getFollowUpBadge = (followUpDate: string | null) => {
    if (!followUpDate) return null;
    
    const date = new Date(followUpDate);
    if (isToday(date)) {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          <Bell className="w-3 h-3 mr-1" />
          Today
        </Badge>
      );
    }
    if (isPast(date)) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Overdue
        </Badge>
      );
    }
    if (isFuture(date)) {
      const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 7) {
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            In {daysUntil} day{daysUntil > 1 ? "s" : ""}
          </Badge>
        );
      }
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Follow-up Reminders Alert */}
      {(todayFollowUps.length > 0 || overdueFollowUps.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-800 dark:text-amber-200">Follow-up Reminders</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {todayFollowUps.length > 0 && `${todayFollowUps.length} follow-up${todayFollowUps.length > 1 ? "s" : ""} due today. `}
                {overdueFollowUps.length > 0 && `${overdueFollowUps.length} overdue follow-up${overdueFollowUps.length > 1 ? "s" : ""}.`}
              </p>
              <Link to="/booking" className="mt-2 inline-block">
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Follow-up
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 border border-border/50">
          <TabsTrigger value="all">
            All ({prescriptions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming Follow-ups ({upcomingFollowUps.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="text-red-600">
            Overdue ({overdueFollowUps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <PrescriptionList prescriptions={prescriptions || []} parseMedicines={parseMedicines} getFollowUpBadge={getFollowUpBadge} />
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <PrescriptionList prescriptions={upcomingFollowUps} parseMedicines={parseMedicines} getFollowUpBadge={getFollowUpBadge} />
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <PrescriptionList prescriptions={overdueFollowUps} parseMedicines={parseMedicines} getFollowUpBadge={getFollowUpBadge} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PrescriptionList({ prescriptions, parseMedicines, getFollowUpBadge }: { 
  prescriptions: any[]; 
  parseMedicines: (json: string | null) => any[];
  getFollowUpBadge: (date: string | null) => React.ReactNode;
}) {
  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No prescriptions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prescriptions.map((prescription, index) => {
        const medicines = parseMedicines(prescription.medicines);
        
        return (
          <motion.div
            key={prescription.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Left Section - Date */}
                <div className="w-full md:w-24 bg-gradient-to-br from-primary/10 to-primary/5 p-4 flex md:flex-col items-center justify-center gap-2 md:gap-0">
                  <span className="text-3xl font-bold text-primary">
                    {format(new Date(prescription.appointment_date), "dd")}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {format(new Date(prescription.appointment_date), "MMM yyyy")}
                  </span>
                </div>

                {/* Right Section - Details */}
                <div className="flex-1 p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="flex-1">
                      {/* Doctor Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <Stethoscope className="w-4 h-4 text-brand-500" />
                        <span className="font-semibold">Dr. {prescription.doctorName}</span>
                        {prescription.doctorSpecialty && (
                          <Badge variant="outline" className="text-xs">
                            {prescription.doctorSpecialty}
                          </Badge>
                        )}
                      </div>

                      {/* Diagnosis */}
                      {prescription.diagnosis && (
                        <p className="text-sm text-muted-foreground mb-3">
                          <span className="font-medium text-foreground">Diagnosis:</span> {prescription.diagnosis}
                        </p>
                      )}

                      {/* Medicines Preview */}
                      {medicines.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {medicines.slice(0, 3).map((med: any, i: number) => (
                            <Badge key={i} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              <Pill className="w-3 h-3 mr-1" />
                              {med.name}
                            </Badge>
                          ))}
                          {medicines.length > 3 && (
                            <Badge variant="secondary">+{medicines.length - 3} more</Badge>
                          )}
                        </div>
                      )}

                      {/* Follow-up */}
                      {prescription.follow_up_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Follow-up: {format(new Date(prescription.follow_up_date), "MMM d, yyyy")}
                          </span>
                          {getFollowUpBadge(prescription.follow_up_date)}
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <Link to={`/prescription/${prescription.id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        View Prescription
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
