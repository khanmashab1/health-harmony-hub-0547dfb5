import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { Printer, ArrowLeft, Stethoscope, User, Calendar, Pill, FlaskConical, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function PrescriptionPrint() {
  const { appointmentId } = useParams();

  const { data: appointment, isLoading } = useQuery({
    queryKey: ["prescription", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .single();
      
      if (error) throw error;

      const { data: doctor } = await supabase
        .from("doctors")
        .select("specialty")
        .eq("user_id", data.doctor_user_id)
        .single();

      const { data: doctorProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", data.doctor_user_id)
        .single();

      return { ...data, doctor, doctorProfile };
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8">
          <Skeleton className="h-8 w-48 mx-auto mb-6" />
          <Skeleton className="h-6 w-full mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Prescription Not Found</h2>
          <Link to="/profile">
            <Button>Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Action Buttons */}
        <div className="flex justify-between mb-6 no-print">
          <Link to="/profile">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Button onClick={handlePrint} size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        <Card className="overflow-hidden">
          {/* Header */}
          <div className="gradient-bg text-primary-foreground p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">MediCare+</h1>
                  <p className="text-sm opacity-80">Medical Prescription</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p>Date: {format(new Date(appointment.appointment_date), "dd/MM/yyyy")}</p>
                <p>Token: #{appointment.token_number}</p>
              </div>
            </div>
          </div>

          {/* Doctor & Patient Info */}
          <div className="grid md:grid-cols-2 gap-6 p-6 border-b">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Doctor</h3>
              <p className="font-semibold">Dr. {appointment.doctorProfile?.name}</p>
              <p className="text-sm text-muted-foreground">{appointment.doctor?.specialty}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Patient</h3>
              <p className="font-semibold">{appointment.patient_full_name}</p>
              <p className="text-sm text-muted-foreground">{appointment.patient_phone}</p>
            </div>
          </div>

          {/* Vitals */}
          {(appointment.vitals_weight || appointment.vitals_bp || appointment.vitals_temperature || appointment.vitals_heart_rate) && (
            <div className="p-6 border-b bg-muted/30">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Vitals
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {appointment.vitals_weight && (
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-2xl font-bold text-primary">{appointment.vitals_weight}</p>
                    <p className="text-xs text-muted-foreground">Weight (kg)</p>
                  </div>
                )}
                {appointment.vitals_bp && (
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-2xl font-bold text-primary">{appointment.vitals_bp}</p>
                    <p className="text-xs text-muted-foreground">Blood Pressure</p>
                  </div>
                )}
                {appointment.vitals_temperature && (
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-2xl font-bold text-primary">{appointment.vitals_temperature}</p>
                    <p className="text-xs text-muted-foreground">Temperature (°F)</p>
                  </div>
                )}
                {appointment.vitals_heart_rate && (
                  <div className="text-center p-3 bg-background rounded-lg">
                    <p className="text-2xl font-bold text-primary">{appointment.vitals_heart_rate}</p>
                    <p className="text-xs text-muted-foreground">Heart Rate (bpm)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnosis */}
          {appointment.diagnosis && (
            <div className="p-6 border-b">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Diagnosis
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{appointment.diagnosis}</p>
            </div>
          )}

          {/* Medicines */}
          {appointment.medicines && (
            <div className="p-6 border-b">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Prescribed Medicines
              </h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{appointment.medicines}</p>
              </div>
            </div>
          )}

          {/* Lab Tests */}
          {appointment.lab_tests && (
            <div className="p-6 border-b">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                Lab Tests Recommended
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{appointment.lab_tests}</p>
            </div>
          )}

          {/* Doctor Comments */}
          {appointment.doctor_comments && (
            <div className="p-6 border-b">
              <h3 className="font-semibold mb-3">Additional Notes</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{appointment.doctor_comments}</p>
            </div>
          )}

          {/* Footer */}
          <div className="p-6 bg-muted/30 flex items-end justify-between">
            <div className="text-xs text-muted-foreground">
              <p>This is a computer-generated prescription.</p>
              <p>Valid for 30 days from date of issue.</p>
            </div>
            <div className="text-right">
              <div className="w-32 border-t-2 border-foreground pt-2">
                <p className="text-sm font-medium">Doctor's Signature</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
