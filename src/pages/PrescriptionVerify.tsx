import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { 
  Stethoscope, 
  Phone, 
  MapPin, 
  Pill, 
  FlaskConical, 
  FileText, 
  Activity, 
  CheckCircle, 
  User, 
  CalendarDays,
  ShieldCheck,
  Printer
} from "lucide-react";
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

export default function PrescriptionVerify() {
  const { appointmentId } = useParams();
  const { siteName, stampUrl } = useSiteSettings();

  const { data: appointment, isLoading, error } = useQuery({
    queryKey: ["prescription-verify", appointmentId],
    queryFn: async () => {
      // Fetch appointment data - this is now publicly accessible
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .single();
      
      if (error) throw error;

      // Fetch doctor info - doctors table is publicly readable
      const { data: doctor } = await supabase
        .from("doctors")
        .select("specialty, degree, qualifications, city, province, fee")
        .eq("user_id", data.doctor_user_id)
        .single();

      // Fetch doctor profile - doctor profiles are publicly readable
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-4xl bg-card p-8 shadow-lg rounded-xl border border-border">
          <Skeleton className="h-8 w-48 mx-auto mb-6" />
          <Skeleton className="h-6 w-full mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="bg-card p-8 text-center shadow-lg rounded-xl border border-border max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">Prescription Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The prescription you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const medicines = formatMedicinesForPrescription(appointment.medicines || "");
  const clinicName = siteName;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Verification Banner */}
      <div className="bg-green-600 text-white py-3 px-4 no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          <span className="font-medium">Verified Prescription</span>
          <span className="text-green-200">•</span>
          <span className="text-sm text-green-100">This prescription is authentic and issued by {clinicName}</span>
        </div>
      </div>

      {/* Action Buttons - Hidden on print */}
      <div className="fixed top-16 right-4 z-50 no-print">
        <Button onClick={handlePrint} size="sm" className="shadow-md">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Prescription Page */}
      <div className="max-w-4xl mx-auto py-8 px-4 print:py-0 print:px-0">
        <div className="bg-card shadow-2xl print:shadow-none prescription-page relative overflow-hidden rounded-xl border border-border">
          {/* Decorative Border */}
          <div className="absolute inset-0 border-[2px] border-primary/20 m-1.5 pointer-events-none print:border-primary/30 rounded-lg" />
          
          {/* Header - Compact */}
          <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-4 print:bg-primary print:py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center print:w-10 print:h-10">
                  <Stethoscope className="w-6 h-6 print:w-5 print:h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight print:text-lg">{clinicName}</h1>
                  <p className="text-primary-foreground/80 text-xs">Healthcare Excellence</p>
                </div>
              </div>
              <div className="text-right text-xs">
                <p className="font-medium">Prescription #{appointment.token_number}</p>
                <p className="text-primary-foreground/80">{format(new Date(appointment.appointment_date), "MMM d, yyyy")}</p>
              </div>
            </div>
          </header>

          <div className="px-5 py-4 print:px-4 print:py-3">
            {/* Doctor & Patient Details Row - Compact */}
            <div className="grid md:grid-cols-2 gap-4 mb-4 print:gap-3 print:mb-3">
              {/* Doctor Info */}
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10 print:p-2">
                <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2 print:mb-1">Prescribing Physician</h3>
                <div className="space-y-0.5">
                  <p className="text-base font-bold text-foreground print:text-sm">Dr. {appointment.doctorProfile?.name}</p>
                  <p className="text-xs text-muted-foreground">{appointment.doctor?.specialty}</p>
                  {appointment.doctor?.degree && (
                    <p className="text-[10px] text-muted-foreground">{appointment.doctor.degree}</p>
                  )}
                  {appointment.doctor?.qualifications && (
                    <p className="text-[10px] text-muted-foreground">{appointment.doctor.qualifications}</p>
                  )}
                  {(appointment.doctor?.city || appointment.doctor?.province) && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-2.5 h-2.5" />
                      {[appointment.doctor.city, appointment.doctor.province].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Patient Info */}
              <div className="bg-muted/50 rounded-lg p-3 border border-border/50 print:p-2">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 print:mb-1">Patient Details</h3>
                <div className="space-y-0.5">
                  <p className="text-base font-bold text-foreground print:text-sm">{appointment.patient_full_name}</p>
                  {appointment.patient_phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      {appointment.patient_phone}
                    </p>
                  )}
                  {appointment.allergies && (
                    <p className="text-[10px] text-red-600 mt-1 font-medium">⚠️ Allergies: {appointment.allergies}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Vitals - Compact */}
            {(appointment.vitals_weight || appointment.vitals_bp || appointment.vitals_temperature || appointment.vitals_heart_rate) && (
              <div className="mb-4 p-3 rounded-lg border border-border/50 bg-muted/30 print:p-2 print:mb-3">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1 print:mb-1">
                  <Activity className="w-3 h-3" />
                  Recorded Vitals
                </h3>
                <div className="grid grid-cols-4 gap-2 print:gap-1">
                  {appointment.vitals_bp && (
                    <div className="text-center p-2 bg-card rounded border border-border print:p-1 print:bg-white">
                      <p className="text-base font-bold text-primary print:text-sm">{appointment.vitals_bp}</p>
                      <p className="text-[9px] text-muted-foreground">BP (mmHg)</p>
                    </div>
                  )}
                  {appointment.vitals_heart_rate && (
                    <div className="text-center p-2 bg-card rounded border border-border print:p-1 print:bg-white">
                      <p className="text-base font-bold text-primary print:text-sm">{appointment.vitals_heart_rate}</p>
                      <p className="text-[9px] text-muted-foreground">HR (bpm)</p>
                    </div>
                  )}
                  {appointment.vitals_temperature && (
                    <div className="text-center p-2 bg-card rounded border border-border print:p-1 print:bg-white">
                      <p className="text-base font-bold text-primary print:text-sm">{appointment.vitals_temperature}°F</p>
                      <p className="text-[9px] text-muted-foreground">Temp</p>
                    </div>
                  )}
                  {appointment.vitals_weight && (
                    <div className="text-center p-2 bg-card rounded border border-border print:p-1 print:bg-white">
                      <p className="text-base font-bold text-primary print:text-sm">{appointment.vitals_weight} kg</p>
                      <p className="text-[9px] text-muted-foreground">Weight</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Diagnosis - Compact */}
            {appointment.diagnosis && (
              <div className="mb-4 print:mb-3">
                <h3 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5 border-b border-border/50 pb-1">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Diagnosis
                </h3>
                <p className="text-sm text-foreground leading-relaxed pl-5 print:text-xs">{appointment.diagnosis}</p>
              </div>
            )}

            {/* Medicines Table */}
            {medicines.length > 0 && (
              <div className="mb-4 print:mb-3">
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5 border-b border-border/50 pb-1">
                  <Pill className="w-3.5 h-3.5 text-primary" />
                  ℞ Prescribed Medications
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/50 print:bg-gray-100">
                        <th className="text-left py-2 px-2 font-semibold text-muted-foreground border-b border-border print:py-1">#</th>
                        <th className="text-left py-2 px-2 font-semibold text-muted-foreground border-b border-border print:py-1">Medicine</th>
                        <th className="text-left py-2 px-2 font-semibold text-muted-foreground border-b border-border print:py-1">Dose</th>
                        <th className="text-left py-2 px-2 font-semibold text-muted-foreground border-b border-border print:py-1">Frequency</th>
                        <th className="text-left py-2 px-2 font-semibold text-muted-foreground border-b border-border print:py-1">Timing</th>
                        <th className="text-left py-2 px-2 font-semibold text-muted-foreground border-b border-border print:py-1">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((med, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-2 text-muted-foreground print:py-1">{idx + 1}</td>
                          <td className="py-2 px-2 print:py-1">
                            <span className="font-medium text-foreground">{med.name}</span>
                            {med.instructions && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 italic">{med.instructions}</p>
                            )}
                          </td>
                          <td className="py-2 px-2 text-foreground print:py-1">{med.dosage || "-"}</td>
                          <td className="py-2 px-2 text-foreground print:py-1">{frequencyLabels[med.frequency] || med.frequency}</td>
                          <td className="py-2 px-2 text-foreground print:py-1">{timingLabels[med.timing] || med.timing}</td>
                          <td className="py-2 px-2 text-foreground print:py-1">{durationLabels[med.duration] || med.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Lab Tests */}
            {appointment.lab_tests && (
              <div className="mb-4 print:mb-3">
                <h3 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5 border-b border-border/50 pb-1">
                  <FlaskConical className="w-3.5 h-3.5 text-primary" />
                  Recommended Lab Tests
                </h3>
                <p className="text-sm text-foreground leading-relaxed pl-5 print:text-xs whitespace-pre-line">{appointment.lab_tests}</p>
              </div>
            )}

            {/* Doctor Comments */}
            {appointment.doctor_comments && !appointment.doctor_comments.startsWith("Payment") && (
              <div className="mb-4 print:mb-3">
                <h3 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5 border-b border-border/50 pb-1">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Doctor's Notes
                </h3>
                <p className="text-sm text-foreground leading-relaxed pl-5 print:text-xs">{appointment.doctor_comments}</p>
              </div>
            )}

            {/* Footer with Signature & Stamp */}
            <div className="mt-6 pt-3 border-t border-dashed border-border print:mt-4 print:pt-2">
              <div className="flex justify-between items-end">
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span className="text-green-600 font-medium">Verified Prescription</span>
                  </p>
                  <p>This prescription is valid for 30 days from date of issue</p>
                  <p>For refills, please consult your physician</p>
                </div>

                {/* Signature with Stamp overlay */}
                <div className="relative text-right">
                  {/* Stamp positioned overlapping signature */}
                  <img 
                    src={stampUrl}
                    alt="Official Stamp" 
                    className="absolute -top-16 -left-8 w-32 h-32 object-contain opacity-70 rotate-[-12deg] print:w-28 print:h-28 print:opacity-60 print:-top-14 print:-left-6 pointer-events-none"
                  />
                  <div className="border-t border-foreground/50 pt-1 px-4 inline-block">
                    <p className="text-xs font-medium text-foreground">Dr. {appointment.doctorProfile?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{appointment.doctor?.specialty}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Info Box */}
        <div className="mt-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 no-print">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">Prescription Verified</h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                This prescription was issued by <strong>Dr. {appointment.doctorProfile?.name}</strong> on{" "}
                <strong>{format(new Date(appointment.appointment_date), "MMMM d, yyyy")}</strong> through {clinicName}.
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Prescription ID: {appointment.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
