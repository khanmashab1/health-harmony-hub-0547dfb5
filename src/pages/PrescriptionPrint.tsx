import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format, differenceInYears } from "date-fns";
import { Printer, ArrowLeft, Stethoscope, Phone, Mail, MapPin, Pill, FlaskConical, FileText, Activity, CheckCircle, Send, Loader2, User, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  formatMedicinesForPrescription,
  frequencyLabels,
  timingLabels,
  durationLabels,
} from "@/components/doctor/MedicineEntry";

export default function PrescriptionPrint() {
  const { appointmentId } = useParams();
  const { siteName, siteUrl, stampUrl } = useSiteSettings();
  const { toast } = useToast();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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

      // Get patient profile for age, gender, and patient_id
      let patientProfile = null;
      if (data.patient_user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("date_of_birth, gender, patient_id")
          .eq("id", data.patient_user_id)
          .single();
        // Calculate age from date_of_birth
        if (profile) {
          patientProfile = {
            ...profile,
            age: profile.date_of_birth 
              ? differenceInYears(new Date(), new Date(profile.date_of_birth))
              : null
          };
        }
      }

      return { ...data, doctor, doctorProfile, patientProfile };
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const sendPrescriptionEmail = useMutation({
    mutationFn: async () => {
      if (!appointment?.patient_email) {
        throw new Error("No patient email found");
      }

      const medicines = formatMedicinesForPrescription(appointment.medicines || "");
      const medicinesHtml = medicines.length > 0 
        ? medicines.map((med, idx) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${med.name}</strong>${med.instructions ? `<br><small>${med.instructions}</small>` : ''}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${med.dosage || '-'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${frequencyLabels[med.frequency] || med.frequency}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${durationLabels[med.duration] || med.duration}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="5" style="padding: 16px; text-align: center;">${appointment.medicines || 'No medicines prescribed'}</td></tr>`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0EA5E9, #06B6D4); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">${siteName}</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Medical Prescription</p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <h3 style="margin: 0 0 5px; color: #374151;">Dr. ${appointment.doctorProfile?.name}</h3>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">${appointment.doctor?.specialty || ''}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 14px;"><strong>Date:</strong> ${format(new Date(appointment.appointment_date), "MMMM d, yyyy")}</p>
                <p style="margin: 5px 0 0; font-size: 14px;"><strong>Token:</strong> #${appointment.token_number}</p>
              </div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px; color: #374151;">Patient Information</h4>
              <p style="margin: 0;"><strong>${appointment.patient_full_name}</strong></p>
              ${appointment.patientProfile?.age ? `<p style="margin: 5px 0 0; font-size: 14px; color: #6b7280;">Age: ${appointment.patientProfile.age} years</p>` : ''}
              ${appointment.patientProfile?.gender ? `<p style="margin: 5px 0 0; font-size: 14px; color: #6b7280;">Gender: ${appointment.patientProfile.gender}</p>` : ''}
            </div>
            
            ${appointment.diagnosis ? `
              <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px; color: #374151;">Diagnosis</h4>
                <p style="margin: 0; color: #4b5563;">${appointment.diagnosis}</p>
              </div>
            ` : ''}
            
            <div style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px; color: #374151;">℞ Prescribed Medications</h4>
              <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left; font-size: 12px;">#</th>
                    <th style="padding: 10px; text-align: left; font-size: 12px;">Medicine</th>
                    <th style="padding: 10px; text-align: left; font-size: 12px;">Dosage</th>
                    <th style="padding: 10px; text-align: left; font-size: 12px;">Frequency</th>
                    <th style="padding: 10px; text-align: left; font-size: 12px;">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${medicinesHtml}
                </tbody>
              </table>
            </div>
            
            ${appointment.lab_tests ? `
              <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px; color: #374151;">Recommended Lab Tests</h4>
                <p style="margin: 0; color: #4b5563;">${appointment.lab_tests.replace(/\n/g, '<br>')}</p>
              </div>
            ` : ''}
            
            ${appointment.doctor_comments && !appointment.doctor_comments.startsWith("Payment") ? `
              <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px; color: #374151;">Doctor's Notes</h4>
                <p style="margin: 0; color: #4b5563;">${appointment.doctor_comments}</p>
              </div>
            ` : ''}
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">This prescription is valid for 30 days from the date of issue.</p>
            <p style="margin: 5px 0 0; font-size: 12px; color: #6b7280;">For emergencies, please contact your healthcare provider immediately.</p>
          </div>
        </div>
      `;

      await supabase.functions.invoke("send-email", {
        body: {
          to: appointment.patient_email,
          subject: `Your Prescription from Dr. ${appointment.doctorProfile?.name} - ${siteName}`,
          html,
        },
      });
    },
    onSuccess: () => {
      toast({ title: "Prescription sent!", description: "Email sent to patient successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to send", description: error.message });
    },
  });

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

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="bg-card p-8 text-center shadow-lg rounded-xl border border-border">
          <h2 className="text-xl font-bold mb-4 text-foreground">Prescription Not Found</h2>
          <Link to="/profile">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const medicines = formatMedicinesForPrescription(appointment.medicines || "");
  const clinicName = siteName;
  const baseUrl = siteUrl || window.location.origin;
  const prescriptionUrl = `${baseUrl}/verify/${appointmentId}`;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Action Buttons - Hidden on print */}
      <div className="fixed top-4 left-4 right-4 flex justify-between z-50 no-print">
        <Link to="/profile">
          <Button variant="outline" size="sm" className="bg-card shadow-md border-primary text-primary hover:bg-primary/5">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex gap-2">
          {appointment.patient_email && (
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-card shadow-md border-primary text-primary hover:bg-primary/5"
              onClick={() => sendPrescriptionEmail.mutate()}
              disabled={sendPrescriptionEmail.isPending}
            >
              {sendPrescriptionEmail.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Email to Patient
            </Button>
          )}
          <Button onClick={handlePrint} size="sm" className="shadow-md">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Prescription Page */}
      <div className="max-w-4xl mx-auto py-16 px-4 print:py-0 print:px-0">
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
                  
                  {/* Patient ID - Prominent display */}
                  {appointment.patientProfile?.patient_id && (
                    <div className="mt-2 p-2 rounded-md bg-primary/10 border border-primary/20">
                      <p className="text-[10px] font-medium text-primary uppercase tracking-wider">Patient ID</p>
                      <p className="text-sm font-mono font-bold text-primary">{appointment.patientProfile.patient_id}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {appointment.patientProfile?.age && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="w-2.5 h-2.5" />
                        {appointment.patientProfile.age} yrs
                      </span>
                    )}
                    {appointment.patientProfile?.gender && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        {appointment.patientProfile.gender}
                      </span>
                    )}
                  </div>
                  {appointment.patient_phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      {appointment.patient_phone}
                    </p>
                  )}
                  {appointment.allergies && (
                    <p className="text-[10px] text-destructive mt-1 font-medium">⚠️ Allergies: {appointment.allergies}</p>
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
                <p className="text-xs text-muted-foreground whitespace-pre-wrap pl-5 print:text-[11px]">{appointment.diagnosis}</p>
              </div>
            )}

            {/* Prescription Symbol */}
            <div className="flex items-center gap-2 mb-3 print:mb-2">
              <div className="text-2xl font-serif text-primary font-bold print:text-xl">℞</div>
              <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
            </div>

            {/* Medicines Table - Compact */}
            {medicines.length > 0 ? (
              <div className="mb-4 print:mb-3">
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5 print:mb-1">
                  <Pill className="w-3.5 h-3.5 text-primary" />
                  Prescribed Medications
                </h3>
                <div className="border rounded-lg overflow-hidden print:rounded">
                  <table className="w-full text-xs print:text-[10px]">
                    <thead className="bg-primary/10">
                      <tr>
                        <th className="text-left p-2 font-semibold text-foreground print:p-1">#</th>
                        <th className="text-left p-2 font-semibold text-foreground print:p-1">Medicine</th>
                        <th className="text-left p-2 font-semibold text-foreground print:p-1">Dosage</th>
                        <th className="text-left p-2 font-semibold text-foreground print:p-1">Frequency</th>
                        <th className="text-left p-2 font-semibold text-foreground print:p-1">Duration</th>
                        <th className="text-left p-2 font-semibold text-foreground print:p-1">Timing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((med, idx) => (
                        <tr key={idx} className="border-t border-border/30">
                          <td className="p-2 font-medium text-muted-foreground print:p-1">{idx + 1}.</td>
                          <td className="p-2 print:p-1">
                            <span className="font-medium text-foreground">{med.name}</span>
                            {med.instructions && (
                              <p className="text-[9px] text-muted-foreground mt-0.5">{med.instructions}</p>
                            )}
                          </td>
                          <td className="p-2 text-muted-foreground print:p-1">{med.dosage || "-"}</td>
                          <td className="p-2 text-muted-foreground print:p-1">{frequencyLabels[med.frequency] || med.frequency}</td>
                          <td className="p-2 text-muted-foreground print:p-1">{durationLabels[med.duration] || med.duration}</td>
                          <td className="p-2 text-muted-foreground print:p-1">{timingLabels[med.timing] || med.timing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : appointment.medicines ? (
              <div className="mb-4 print:mb-3">
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-primary" />
                  Prescribed Medications
                </h3>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30 print:p-2">
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground print:text-[10px]">{appointment.medicines}</p>
                </div>
              </div>
            ) : null}

            {/* Lab Tests - Compact */}
            {appointment.lab_tests && (
              <div className="mb-4 print:mb-3">
                <h3 className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5 border-b border-border/50 pb-1">
                  <FlaskConical className="w-3.5 h-3.5 text-primary" />
                  Recommended Lab Tests
                </h3>
                <div className="pl-5 grid grid-cols-2 gap-x-4">
                  {appointment.lab_tests.split('\n').filter(Boolean).map((test: string, idx: number) => (
                    <p key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground py-0.5 print:text-[10px]">
                      <CheckCircle className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                      {test}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor Comments - Compact */}
            {appointment.doctor_comments && !appointment.doctor_comments.startsWith("Payment") && (
              <div className="mb-4 print:mb-3">
                <h3 className="text-xs font-semibold text-foreground mb-1 border-b border-border/50 pb-1">
                  Additional Notes
                </h3>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap pl-5 print:text-[10px]">{appointment.doctor_comments}</p>
              </div>
            )}

            {/* QR Code & Signature with Stamp Section */}
            <div className="flex justify-between items-end mt-6 pt-4 print:mt-4 print:pt-3">
              {/* QR Code */}
              <div className="flex flex-col items-center">
                <QRCodeSVG 
                  value={prescriptionUrl}
                  size={60}
                  level="M"
                  className="border p-0.5 rounded bg-white print:w-12 print:h-12"
                />
                <p className="text-[9px] text-muted-foreground mt-1 text-center">
                  Scan to verify
                </p>
              </div>

              {/* Signature with Stamp overlay */}
              <div className="relative text-center">
                {/* Stamp positioned overlapping signature */}
                <img 
                  src={stampUrl}
                  alt="Official Stamp" 
                  className="absolute -top-10 -left-14 w-24 h-24 object-contain opacity-70 rotate-[-12deg] print:w-20 print:h-20 print:opacity-60 print:-top-8 print:-left-12 pointer-events-none"
                />
                <div className="w-40 border-t-2 border-foreground pt-1.5 mb-0.5 print:w-32" />
                <p className="font-semibold text-foreground text-sm print:text-xs">Dr. {appointment.doctorProfile?.name}</p>
                <p className="text-[10px] text-muted-foreground">{appointment.doctor?.specialty}</p>
                {appointment.doctor?.degree && (
                  <p className="text-[9px] text-muted-foreground">{appointment.doctor.degree}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer - Compact */}
          <div className="bg-muted/50 px-5 py-2 border-t border-border/50 print:px-4 print:py-1.5">
            <div className="flex justify-between items-center text-[9px] text-muted-foreground">
              <div>
                <p>Valid for 30 days. For emergencies, contact your healthcare provider.</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">{clinicName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 5mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .prescription-page {
            min-height: auto !important;
            page-break-inside: auto;
            box-shadow: none !important;
          }
        }
        .prescription-page {
          min-height: auto;
        }
      `}</style>
    </div>
  );
}
