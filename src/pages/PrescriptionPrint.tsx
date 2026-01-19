import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
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
  const { siteName } = useSiteSettings();
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

      // Get patient profile for age and gender
      let patientProfile = null;
      if (data.patient_user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("age, gender")
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
  const prescriptionUrl = `${window.location.origin}/prescription/${appointmentId}`;

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
        <div className="flex gap-2">
          {appointment.patient_email && (
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white shadow-md"
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

              {/* Patient Info with Age & Gender */}
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Patient Details</h3>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-foreground">{appointment.patient_full_name}</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {appointment.patientProfile?.age && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {appointment.patientProfile.age} years
                      </span>
                    )}
                    {appointment.patientProfile?.gender && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {appointment.patientProfile.gender}
                      </span>
                    )}
                  </div>
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

            {/* QR Code & Signature Section */}
            <div className="flex justify-between items-end mt-12 pt-6">
              {/* QR Code */}
              <div className="flex flex-col items-center">
                <QRCodeSVG 
                  value={prescriptionUrl}
                  size={80}
                  level="M"
                  className="border p-1 rounded bg-white"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Scan to verify<br />prescription
                </p>
              </div>

              {/* Signature */}
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
