import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { Printer, ArrowLeft, Stethoscope, FlaskConical, User, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function LabTestsPrint() {
  const { appointmentId } = useParams();
  const { siteName } = useSiteSettings();

  const { data: appointment, isLoading } = useQuery({
    queryKey: ["lab-tests", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .single();
      
      if (error) throw error;

      const { data: doctor } = await supabase
        .from("doctors")
        .select("specialty, degree, city, province")
        .eq("user_id", data.doctor_user_id)
        .single();

      const { data: doctorProfile } = await supabase
        .from("profiles")
        .select("name, phone")
        .eq("id", data.doctor_user_id)
        .single();

      // Get patient profile for patient_id
      let patientProfile = null;
      if (data.patient_user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("age, gender, patient_id")
          .eq("id", data.patient_user_id)
          .single();
        patientProfile = profile;
      }

      return { ...data, doctor, doctorProfile, patientProfile };
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-2xl bg-card p-8 shadow-lg rounded-xl border border-border">
          <Skeleton className="h-8 w-48 mx-auto mb-6" />
          <Skeleton className="h-6 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="bg-card p-8 text-center shadow-lg rounded-xl border border-border">
          <h2 className="text-xl font-bold mb-4 text-foreground">Appointment Not Found</h2>
          <Link to="/doctor">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const labTests = appointment.lab_tests?.split('\n').filter((t: string) => t.trim()) || [];

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Action Buttons - Hidden on print */}
      <div className="fixed top-4 left-4 right-4 flex justify-between z-50 no-print">
        <Link to="/doctor">
          <Button variant="outline" size="sm" className="bg-card shadow-md border-primary text-primary hover:bg-primary/5">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <Button onClick={handlePrint} size="sm" className="shadow-md">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Lab Tests Slip */}
      <div className="max-w-2xl mx-auto py-16 px-4 print:py-4 print:px-2">
        <div className="bg-card shadow-2xl print:shadow-none rounded-xl border border-border overflow-hidden">
          {/* Header */}
          <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-4 print:py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">{siteName}</h1>
                  <p className="text-primary-foreground/80 text-xs">Lab Test Recommendation</p>
                </div>
              </div>
              <div className="text-right text-xs">
                <p className="font-medium">Token #{appointment.token_number}</p>
                <p className="text-primary-foreground/80">{format(new Date(appointment.appointment_date), "MMM d, yyyy")}</p>
              </div>
            </div>
          </header>

          <div className="p-5 print:p-4">
            {/* Doctor & Patient Row */}
            <div className="grid grid-cols-2 gap-4 mb-5 print:gap-3 print:mb-4">
              {/* Doctor Info */}
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Referring Doctor</h3>
                <p className="text-sm font-bold text-foreground">Dr. {appointment.doctorProfile?.name}</p>
                <p className="text-xs text-muted-foreground">{appointment.doctor?.specialty}</p>
                {appointment.doctor?.degree && (
                  <p className="text-[10px] text-muted-foreground">{appointment.doctor.degree}</p>
                )}
              </div>

              {/* Patient Info */}
              <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Patient Details</h3>
                <p className="text-sm font-bold text-foreground">{appointment.patient_full_name}</p>
                
                {/* Patient ID - Prominent display */}
                {appointment.patientProfile?.patient_id && (
                  <div className="mt-2 p-2 rounded-md bg-primary/10 border border-primary/20">
                    <p className="text-[10px] font-medium text-primary uppercase tracking-wider">Patient ID</p>
                    <p className="text-sm font-mono font-bold text-primary">{appointment.patientProfile.patient_id}</p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {appointment.patientProfile?.age && (
                    <span className="text-xs text-muted-foreground">{appointment.patientProfile.age} yrs</span>
                  )}
                  {appointment.patientProfile?.gender && (
                    <span className="text-xs text-muted-foreground">• {appointment.patientProfile.gender}</span>
                  )}
                </div>
                {appointment.patient_phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="w-2.5 h-2.5" />
                    {appointment.patient_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Diagnosis if available */}
            {appointment.diagnosis && (
              <div className="mb-4 p-3 rounded-lg border border-border/50 bg-muted/30 print:mb-3">
                <h3 className="text-xs font-semibold text-foreground mb-1">Clinical Impression</h3>
                <p className="text-sm text-muted-foreground">{appointment.diagnosis}</p>
              </div>
            )}

            {/* Lab Tests - Main content */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 border-b border-border/50 pb-2">
                <FlaskConical className="w-4 h-4 text-primary" />
                Recommended Laboratory Tests
              </h3>
              
              {labTests.length > 0 ? (
                <div className="space-y-2">
                  {labTests.map((test: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 border border-border/30">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm text-foreground flex-1">{test.trim()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No lab tests specified</p>
              )}
            </div>

            {/* Status indicator */}
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Appointment Paused - Awaiting Lab Results
                </span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Please return with test results to continue consultation
              </p>
            </div>

            {/* Instructions */}
            <div className="text-xs text-muted-foreground border-t border-border/50 pt-3">
              <p>• This slip is valid for today's visit only</p>
              <p>• Return to the clinic with your test results</p>
              <p>• Keep this slip for reference</p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-muted px-5 py-3 text-center text-xs text-muted-foreground border-t border-border/50">
            <p>Issued: {format(new Date(), "MMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
