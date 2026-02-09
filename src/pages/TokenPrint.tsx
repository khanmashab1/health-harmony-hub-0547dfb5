import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Printer, ArrowLeft, Calendar, User, MapPin, Clock, Upload, Wallet, Copy, Building2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptUpload } from "@/components/booking/ReceiptUpload";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

export default function TokenPrint() {
  const { appointmentId } = useParams();
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: appointment, isLoading } = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .single();
      
      if (error) throw error;

      // Get doctor info including payment details and consultation duration
      const { data: doctor } = await supabase
        .from("doctors")
        .select("specialty, fee, easypaisa_number, jazzcash_number, bank_name, bank_account_number, bank_account_title, consultation_duration, delay_minutes")
        .eq("user_id", data.doctor_user_id)
        .single();

      // Get doctor schedule for appointment date
      const appointmentDay = new Date(data.appointment_date).getDay();
      const { data: schedule } = await supabase
        .from("doctor_schedules")
        .select("start_time")
        .eq("doctor_user_id", data.doctor_user_id)
        .eq("day_of_week", appointmentDay)
        .eq("is_available", true)
        .single();

      const { data: doctorProfile } = await supabase
        .from("profiles")
        .select("name, city, province")
        .eq("id", data.doctor_user_id)
        .single();

      // Get patient profile for patient_id
      let patientProfile = null;
      if (data.patient_user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("patient_id")
          .eq("id", data.patient_user_id)
          .single();
        patientProfile = profile;
      }

      // Calculate estimated time including delay
      let estimatedTime: string | null = null;
      const delayMinutes = doctor?.delay_minutes || 0;
      
      if (schedule?.start_time && doctor?.consultation_duration) {
        const [startHour, startMin] = schedule.start_time.split(":").map(Number);
        const tokensBefore = data.token_number - 1;
        const totalMinutesToAdd = (tokensBefore * doctor.consultation_duration) + delayMinutes;
        
        const estimatedDate = new Date();
        estimatedDate.setHours(startHour, startMin + totalMinutesToAdd, 0, 0);
        
        estimatedTime = estimatedDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }

      return {
        ...data,
        doctor,
        doctorProfile,
        patientProfile,
        estimatedTime,
        delayMinutes,
      };
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <Skeleton className="h-8 w-48 mx-auto mb-6" />
          <Skeleton className="h-24 w-24 rounded-full mx-auto mb-6" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Appointment Not Found</h2>
          <Link to="/profile">
            <Button>Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-md mx-auto">
        {/* Action Buttons - Hidden on Print */}
        <div className="flex justify-between mb-6 no-print">
          <Link to="/profile">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Button onClick={handlePrint} size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print Token
          </Button>
        </div>

        {/* Token Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="gradient-bg text-primary-foreground p-6 text-center">
              <h1 className="text-2xl font-bold mb-2">MediCare+</h1>
              <p className="text-primary-foreground/80">Appointment Token</p>
            </div>

            {/* Token Number */}
            <div className="p-8 text-center border-b">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
                <span className="text-4xl font-bold text-primary">
                  {appointment.token_number}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Your Token Number</p>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Doctor</p>
                  <p className="font-medium">Dr. {appointment.doctorProfile?.name || "Doctor"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(appointment.appointment_date), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">
                    {appointment.doctorProfile?.city}, {appointment.doctorProfile?.province}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{appointment.doctor?.specialty || appointment.department}</p>
                </div>
              </div>

              {/* Estimated Time */}
              {appointment.estimatedTime && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Time</p>
                    <p className="font-bold text-blue-700 dark:text-blue-400">{appointment.estimatedTime}</p>
                    {appointment.delayMinutes > 0 ? (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        ⚠️ Includes +{appointment.delayMinutes} min delay (doctor running late)
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Approx. based on token position</p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Methods for Online Payments */}
              {appointment.payment_method === "Online" && (
                <div className="space-y-3 p-4 rounded-lg border border-green-200/50 bg-green-50/50 dark:bg-green-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <p className="font-semibold text-green-700 dark:text-green-400">Payment Details</p>
                  </div>
                  
                  {/* Mobile Wallets */}
                  {(appointment.doctor?.easypaisa_number || appointment.doctor?.jazzcash_number) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Smartphone className="w-3 h-3" />
                        <span>Mobile Wallets</span>
                      </div>
                      
                      {appointment.doctor?.easypaisa_number && (
                        <div className="flex items-center justify-between p-2 rounded bg-white/50 dark:bg-black/20">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-sm font-medium">Easypaisa:</span>
                            <span className="font-bold">{appointment.doctor.easypaisa_number}</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(appointment.doctor?.easypaisa_number || "");
                              toast({ title: "Copied!", description: "Easypaisa number copied" });
                            }}
                            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/40 rounded no-print"
                          >
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                      
                      {appointment.doctor?.jazzcash_number && (
                        <div className="flex items-center justify-between p-2 rounded bg-white/50 dark:bg-black/20">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm font-medium">JazzCash:</span>
                            <span className="font-bold">{appointment.doctor.jazzcash_number}</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(appointment.doctor?.jazzcash_number || "");
                              toast({ title: "Copied!", description: "JazzCash number copied" });
                            }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded no-print"
                          >
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Bank Details */}
                  {appointment.doctor?.bank_name && appointment.doctor?.bank_account_number && (
                    <div className="space-y-2 pt-2 border-t border-green-200/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3" />
                        <span>Bank Transfer</span>
                      </div>
                      <div className="p-2 rounded bg-white/50 dark:bg-black/20 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Bank:</span>
                          <span className="font-medium">{appointment.doctor.bank_name}</span>
                        </div>
                        {appointment.doctor.bank_account_title && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Account Title:</span>
                            <span className="font-medium">{appointment.doctor.bank_account_title}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Account #:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold">{appointment.doctor.bank_account_number}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(appointment.doctor?.bank_account_number || "");
                                toast({ title: "Copied!", description: "Account number copied" });
                              }}
                              className="p-1 hover:bg-muted rounded no-print"
                            >
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Send payment and upload receipt below
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Consultation Fee</span>
                  <span className="text-xl font-bold text-primary">
                    Rs. {appointment.doctor?.fee || 0}
                  </span>
                </div>
              </div>

              {/* Patient ID and Appointment ID for PA Search */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {appointment.patientProfile?.patient_id && (
                  <div className="p-3 border rounded-lg bg-primary/5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Patient ID</p>
                    <p className="font-mono text-sm font-bold text-primary">{appointment.patientProfile.patient_id}</p>
                  </div>
                )}
                <div className="p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Token ID</p>
                      <p className="font-mono text-sm font-bold text-foreground">{appointment.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(appointment.id.slice(0, 8).toUpperCase());
                        toast({ title: "Copied!", description: "Token ID copied to clipboard" });
                      }}
                      className="p-2 hover:bg-muted rounded no-print"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Use Patient ID or Token ID for quick search</p>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Payment Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  appointment.payment_status === "Confirmed" 
                    ? "bg-green-100 text-green-700"
                    : appointment.payment_status === "Pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {appointment.payment_status}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  appointment.status === "Completed" 
                    ? "bg-green-100 text-green-700"
                    : appointment.status === "Upcoming"
                    ? "bg-blue-100 text-blue-700"
                    : appointment.status === "Pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {appointment.status}
                </span>
              </div>

              {/* Receipt Upload for Online Payment */}
              {appointment.payment_method === "Online" && !appointment.receipt_path && (
                <div className="p-4 border-t no-print">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => setShowReceiptUpload(true)}
                  >
                    <Upload className="w-4 h-4" />
                    Upload Payment Receipt
                  </Button>
                </div>
              )}

              {appointment.receipt_path && (
                <div className="p-4 border-t bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm text-green-700 dark:text-green-300 text-center">
                    ✓ Receipt uploaded - Awaiting verification
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-muted text-center text-xs text-muted-foreground">
              <p>Please arrive 15 minutes before your scheduled time.</p>
              <p className="mt-1">Bring this token and a valid ID.</p>
            </div>
          </Card>
        </motion.div>

        {/* Receipt Upload Modal */}
        {showReceiptUpload && appointmentId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <ReceiptUpload
                appointmentId={appointmentId}
                doctorFee={appointment.doctor?.fee || 0}
                onSuccess={() => {
                  setShowReceiptUpload(false);
                  queryClient.invalidateQueries({ queryKey: ["appointment", appointmentId] });
                }}
                onCancel={() => setShowReceiptUpload(false)}
              />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
