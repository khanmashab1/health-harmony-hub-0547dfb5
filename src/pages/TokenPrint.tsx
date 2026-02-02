import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Printer, ArrowLeft, Calendar, User, MapPin, Clock, Hash, Upload, Wallet, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptUpload } from "@/components/booking/ReceiptUpload";
import { useToast } from "@/hooks/use-toast";

export default function TokenPrint() {
  const { appointmentId } = useParams();
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: appointment, isLoading } = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .single();
      
      if (error) throw error;

      // Get doctor info including easypaisa number
      const { data: doctor } = await supabase
        .from("doctors")
        .select("specialty, fee, easypaisa_number")
        .eq("user_id", data.doctor_user_id)
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

      return {
        ...data,
        doctor,
        doctorProfile,
        patientProfile,
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
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{appointment.doctor?.specialty || appointment.department}</p>
                </div>
              </div>

              {/* Easypaisa Payment Info for Online Payments */}
              {appointment.payment_method === "Online" && appointment.doctor?.easypaisa_number && (
                <div className="p-4 border-t bg-green-50/50 dark:bg-green-900/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Easypaisa Number</p>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-green-700 dark:text-green-400">{appointment.doctor.easypaisa_number}</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(appointment.doctor?.easypaisa_number || "");
                            toast({ title: "Copied!", description: "Easypaisa number copied to clipboard" });
                          }}
                          className="p-1 hover:bg-green-100 dark:hover:bg-green-900/40 rounded no-print"
                        >
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Send payment to this Easypaisa number and upload receipt</p>
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
