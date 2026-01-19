import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { Printer, ArrowLeft, Stethoscope, Phone, Mail, MapPin, Pill, FlaskConical, FileText, Activity, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  formatMedicinesForPrescription,
  frequencyLabels,
  timingLabels,
  durationLabels,
} from "@/components/doctor/MedicineEntry";

export default function PrescriptionPrint() {
  const { appointmentId } = useParams();
  const { siteName } = useSiteSettings();
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
        .select("specialty, degree, qualifications, city, province, fee")
        .eq("user_id", data.doctor_user_id)
        .single();

      const { data: doctorProfile } = await supabase
        .from("profiles")
        .select("name, phone")
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="w-full max-w-4xl bg-white p-8 shadow-lg">
          <Skeleton className="h-8 w-48 mx-auto mb-6" />
          <Skeleton className="h-6 w-full mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="bg-white p-8 text-center shadow-lg rounded-lg">
          <h2 className="text-xl font-bold mb-4">Prescription Not Found</h2>
          <Link to="/profile">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const medicines = formatMedicinesForPrescription(appointment.medicines || "");
  const clinicName = siteName;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Action Buttons - Hidden on print */}
      <div className="fixed top-4 left-4 right-4 flex justify-between z-50 no-print">
        <Link to="/profile">
          <Button variant="outline" size="sm" className="bg-white shadow-md">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <Button onClick={handlePrint} size="sm" className="shadow-md">
          <Printer className="w-4 h-4 mr-2" />
          Print Prescription
        </Button>
      </div>

      {/* Prescription Page */}
      <div className="max-w-4xl mx-auto py-16 px-4 print:py-0 print:px-0">
        <div className="bg-white shadow-2xl print:shadow-none min-h-[297mm] relative overflow-hidden">
          {/* Decorative Border */}
          <div className="absolute inset-0 border-[3px] border-primary/20 m-2 pointer-events-none print:border-primary/30" />
          
          {/* Header */}
          <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-8 py-6 print:bg-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <Stethoscope className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{clinicName}</h1>
                  <p className="text-primary-foreground/80 text-sm mt-0.5">Healthcare Excellence</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">Prescription #{appointment.token_number}</p>
                <p className="text-primary-foreground/80">{format(new Date(appointment.appointment_date), "MMMM d, yyyy")}</p>
              </div>
            </div>
          </header>

          <div className="px-8 py-6">
            {/* Doctor & Patient Details Row */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Doctor Info */}
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Prescribing Physician</h3>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-foreground">Dr. {appointment.doctorProfile?.name}</p>
                  <p className="text-sm text-muted-foreground">{appointment.doctor?.specialty}</p>
                  {appointment.doctor?.degree && (
                    <p className="text-xs text-muted-foreground">{appointment.doctor.degree}</p>
                  )}
                  {appointment.doctor?.qualifications && (
                    <p className="text-xs text-muted-foreground">{appointment.doctor.qualifications}</p>
                  )}
                  {(appointment.doctor?.city || appointment.doctor?.province) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <MapPin className="w-3 h-3" />
                      {[appointment.doctor.city, appointment.doctor.province].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Patient Info */}
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Patient Details</h3>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-foreground">{appointment.patient_full_name}</p>
                  {appointment.patient_phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {appointment.patient_phone}
                    </p>
                  )}
                  {appointment.patient_email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {appointment.patient_email}
                    </p>
                  )}
                  {appointment.allergies && (
                    <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Allergies: {appointment.allergies}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Vitals */}
            {(appointment.vitals_weight || appointment.vitals_bp || appointment.vitals_temperature || appointment.vitals_heart_rate) && (
              <div className="mb-6 p-4 rounded-xl border border-border/50 bg-muted/30">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recorded Vitals
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {appointment.vitals_bp && (
                    <div className="text-center p-3 bg-white rounded-lg border border-border/30">
                      <p className="text-xl font-bold text-primary">{appointment.vitals_bp}</p>
                      <p className="text-xs text-muted-foreground">Blood Pressure (mmHg)</p>
                    </div>
                  )}
                  {appointment.vitals_heart_rate && (
                    <div className="text-center p-3 bg-white rounded-lg border border-border/30">
                      <p className="text-xl font-bold text-primary">{appointment.vitals_heart_rate}</p>
                      <p className="text-xs text-muted-foreground">Heart Rate (bpm)</p>
                    </div>
                  )}
                  {appointment.vitals_temperature && (
                    <div className="text-center p-3 bg-white rounded-lg border border-border/30">
                      <p className="text-xl font-bold text-primary">{appointment.vitals_temperature}°F</p>
                      <p className="text-xs text-muted-foreground">Temperature</p>
                    </div>
                  )}
                  {appointment.vitals_weight && (
                    <div className="text-center p-3 bg-white rounded-lg border border-border/30">
                      <p className="text-xl font-bold text-primary">{appointment.vitals_weight} kg</p>
                      <p className="text-xs text-muted-foreground">Weight</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Diagnosis */}
            {appointment.diagnosis && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2 border-b border-border/50 pb-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Diagnosis
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap pl-6">{appointment.diagnosis}</p>
              </div>
            )}

            {/* Prescription Symbol */}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl font-serif text-primary font-bold">℞</div>
              <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
            </div>

            {/* Medicines Table */}
            {medicines.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-primary" />
                  Prescribed Medications
                </h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-primary/10">
                      <tr>
                        <th className="text-left p-3 font-semibold text-foreground">#</th>
                        <th className="text-left p-3 font-semibold text-foreground">Medicine</th>
                        <th className="text-left p-3 font-semibold text-foreground">Dosage</th>
                        <th className="text-left p-3 font-semibold text-foreground">Frequency</th>
                        <th className="text-left p-3 font-semibold text-foreground">Duration</th>
                        <th className="text-left p-3 font-semibold text-foreground">Timing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((med, idx) => (
                        <tr key={idx} className="border-t border-border/30">
                          <td className="p-3 font-medium text-muted-foreground">{idx + 1}.</td>
                          <td className="p-3">
                            <span className="font-medium text-foreground">{med.name}</span>
                            {med.instructions && (
                              <p className="text-xs text-muted-foreground mt-0.5">{med.instructions}</p>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">{med.dosage || "-"}</td>
                          <td className="p-3 text-muted-foreground">{frequencyLabels[med.frequency] || med.frequency}</td>
                          <td className="p-3 text-muted-foreground">{durationLabels[med.duration] || med.duration}</td>
                          <td className="p-3 text-muted-foreground">{timingLabels[med.timing] || med.timing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : appointment.medicines ? (
              // Fallback for old text-based medicines
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-primary" />
                  Prescribed Medications
                </h3>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                  <p className="whitespace-pre-wrap text-muted-foreground">{appointment.medicines}</p>
                </div>
              </div>
            ) : null}

            {/* Lab Tests */}
            {appointment.lab_tests && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2 border-b border-border/50 pb-2">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  Recommended Lab Tests
                </h3>
                <div className="pl-6">
                  {appointment.lab_tests.split('\n').filter(Boolean).map((test: string, idx: number) => (
                    <p key={idx} className="flex items-center gap-2 text-muted-foreground py-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {test}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor Comments */}
            {appointment.doctor_comments && !appointment.doctor_comments.startsWith("Payment") && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-2 border-b border-border/50 pb-2">
                  Additional Notes
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap pl-6">{appointment.doctor_comments}</p>
              </div>
            )}

            {/* Signature Section */}
            <div className="flex justify-end mt-12 pt-6">
              <div className="text-center">
                <div className="w-48 border-t-2 border-foreground pt-2 mb-1" />
                <p className="font-semibold text-foreground">Dr. {appointment.doctorProfile?.name}</p>
                <p className="text-xs text-muted-foreground">{appointment.doctor?.specialty}</p>
                {appointment.doctor?.degree && (
                  <p className="text-xs text-muted-foreground">{appointment.doctor.degree}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="absolute bottom-0 left-0 right-0 bg-muted/50 px-8 py-4 border-t border-border/50">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <div>
                <p>This prescription is valid for 30 days from the date of issue.</p>
                <p className="mt-1">For medical emergencies, please contact your healthcare provider immediately.</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">{clinicName}</p>
                <p>Generated on {format(new Date(), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
