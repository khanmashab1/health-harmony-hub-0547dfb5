import { useEffect } from "react";
import { format, differenceInYears } from "date-fns";
import { useNavigate } from "react-router-dom";
import { 
  Stethoscope, 
  Calendar, 
  Pill, 
  TestTube, 
  Activity, 
  User,
  Phone,
  MapPin,
  Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function MedicalHistoryPrint() {
  const { user, profile, loading } = useRequireAuth(["patient"]);
  const navigate = useNavigate();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["medical-history-print", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          department,
          reason,
          diagnosis,
          medicines,
          lab_tests,
          doctor_comments,
          allergies,
          vitals_bp,
          vitals_temperature,
          vitals_weight,
          vitals_heart_rate,
          token_number,
          doctor_user_id
        `)
        .eq("patient_user_id", user!.id)
        .in("status", ["Completed", "Upcoming", "Pending"])
        .order("appointment_date", { ascending: false });

      if (error) throw error;

      // Fetch doctor names
      const doctorIds = [...new Set(data?.map((a) => a.doctor_user_id) || [])];
      let doctorProfiles: { id: string; name: string | null }[] = [];
      
      if (doctorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", doctorIds);
        doctorProfiles = profiles || [];
      }

      return data?.map((apt) => ({
        ...apt,
        doctor: doctorProfiles.find((p) => p.id === apt.doctor_user_id),
      }));
    },
    enabled: !!user,
  });

  const handlePrint = () => {
    window.print();
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const completedAppointments = appointments?.filter(a => a.status === "Completed") || [];
  const totalVisits = appointments?.length || 0;
  const diagnosesCount = appointments?.filter(a => a.diagnosis).length || 0;
  const prescriptionsCount = appointments?.filter(a => a.medicines).length || 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Print Button - Hidden on print */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Print
        </Button>
        <Button variant="outline" onClick={() => navigate("/profile")}>
          Back to Dashboard
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-4">
        {/* Header */}
        <header className="flex items-center justify-between border-b-2 border-primary pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">MediCare+</h1>
              <p className="text-sm text-muted-foreground">Complete Medical History Report</p>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Generated: {format(new Date(), "MMMM d, yyyy")}</p>
            <p>at {format(new Date(), "h:mm a")}</p>
          </div>
        </header>

        {/* Patient Info */}
        <section className="bg-muted/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Patient Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{profile?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Age</p>
              <p className="font-medium">{profile?.date_of_birth 
                ? `${differenceInYears(new Date(), new Date(profile.date_of_birth))} years` 
                : "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium">{profile?.gender || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Blood Type</p>
              <p className="font-medium">{profile?.blood_type || "N/A"}</p>
            </div>
            {profile?.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {profile.phone}
                </p>
              </div>
            )}
            {profile?.city && profile?.province && (
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile.city}, {profile.province}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Summary Stats */}
        <section className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Visits", value: totalVisits, icon: Calendar, color: "bg-blue-50 text-blue-600" },
            { label: "Completed", value: completedAppointments.length, icon: Activity, color: "bg-green-50 text-green-600" },
            { label: "Diagnoses", value: diagnosesCount, icon: Stethoscope, color: "bg-purple-50 text-purple-600" },
            { label: "Prescriptions", value: prescriptionsCount, icon: Pill, color: "bg-amber-50 text-amber-600" },
          ].map((stat) => (
            <div key={stat.label} className={`p-4 rounded-xl ${stat.color} bg-opacity-50`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="w-4 h-4" />
                <span className="text-sm">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </section>

        {/* Appointment History */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Appointment History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 text-sm font-semibold border-b">Date</th>
                  <th className="text-left p-3 text-sm font-semibold border-b">Doctor</th>
                  <th className="text-left p-3 text-sm font-semibold border-b">Department</th>
                  <th className="text-left p-3 text-sm font-semibold border-b">Status</th>
                  <th className="text-left p-3 text-sm font-semibold border-b">Diagnosis</th>
                </tr>
              </thead>
              <tbody>
                {appointments?.map((apt) => (
                  <tr key={apt.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 text-sm">
                      {format(new Date(apt.appointment_date), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 text-sm">Dr. {apt.doctor?.name || "Unknown"}</td>
                    <td className="p-3 text-sm">{apt.department || "-"}</td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        apt.status === "Completed" ? "bg-green-100 text-green-700" :
                        apt.status === "Upcoming" ? "bg-blue-100 text-blue-700" :
                        apt.status === "Pending" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm max-w-xs truncate">{apt.diagnosis || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Records */}
        {completedAppointments.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Detailed Medical Records
            </h2>
            <div className="space-y-6">
              {completedAppointments.map((apt, index) => (
                <div key={apt.id} className="border rounded-xl p-6 break-inside-avoid">
                  {/* Visit Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b">
                    <div>
                      <h3 className="font-semibold">
                        Visit #{index + 1} - {format(new Date(apt.appointment_date), "MMMM d, yyyy")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Dr. {apt.doctor?.name || "Unknown"} • {apt.department}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">Token #{apt.token_number}</span>
                  </div>

                  {/* Vitals */}
                  {(apt.vitals_bp || apt.vitals_temperature || apt.vitals_weight || apt.vitals_heart_rate) && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Vitals</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {apt.vitals_bp && (
                          <div className="bg-muted/50 p-2 rounded text-sm">
                            <span className="text-muted-foreground">BP:</span> {apt.vitals_bp}
                          </div>
                        )}
                        {apt.vitals_temperature && (
                          <div className="bg-muted/50 p-2 rounded text-sm">
                            <span className="text-muted-foreground">Temp:</span> {apt.vitals_temperature}
                          </div>
                        )}
                        {apt.vitals_weight && (
                          <div className="bg-muted/50 p-2 rounded text-sm">
                            <span className="text-muted-foreground">Weight:</span> {apt.vitals_weight}
                          </div>
                        )}
                        {apt.vitals_heart_rate && (
                          <div className="bg-muted/50 p-2 rounded text-sm">
                            <span className="text-muted-foreground">HR:</span> {apt.vitals_heart_rate}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reason */}
                  {apt.reason && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Reason for Visit</h4>
                      <p className="text-sm">{apt.reason}</p>
                    </div>
                  )}

                  {/* Diagnosis */}
                  {apt.diagnosis && (
                    <div className="mb-4 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
                      <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                        <Stethoscope className="w-4 h-4" />
                        Diagnosis
                      </h4>
                      <p className="text-sm">{apt.diagnosis}</p>
                    </div>
                  )}

                  {/* Prescription */}
                  {apt.medicines && (
                    <div className="mb-4 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-100 dark:border-green-900">
                      <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                        <Pill className="w-4 h-4" />
                        Prescription
                      </h4>
                      <p className="text-sm whitespace-pre-line">{apt.medicines}</p>
                    </div>
                  )}

                  {/* Lab Tests */}
                  {apt.lab_tests && (
                    <div className="mb-4 bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-100 dark:border-purple-900">
                      <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1 flex items-center gap-1">
                        <TestTube className="w-4 h-4" />
                        Lab Tests
                      </h4>
                      <p className="text-sm">{apt.lab_tests}</p>
                    </div>
                  )}

                  {/* Doctor Notes */}
                  {apt.doctor_comments && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-100 dark:border-amber-900">
                      <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">Doctor's Notes</h4>
                      <p className="text-sm">{apt.doctor_comments}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>This document is confidential and intended for the patient's personal records.</p>
          <p className="mt-1">© {new Date().getFullYear()} MediCare+. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
