import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Calendar,
  Stethoscope,
  Pill,
  FileText,
  Activity,
  ChevronDown,
  ChevronUp,
  User,
  TestTube,
  MessageSquare,
  AlertCircle,
  Clock,
  Download,
  Share2,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { downloadMedicalHistoryPDF, getMedicalHistoryPDFBlob } from "@/lib/pdfGenerator";
import { useToast } from "@/hooks/use-toast";

interface TimelineAppointment {
  id: string;
  appointment_date: string;
  status: string;
  department: string | null;
  reason: string | null;
  diagnosis: string | null;
  medicines: string | null;
  lab_tests: string | null;
  doctor_comments: string | null;
  allergies: string | null;
  vitals_bp: string | null;
  vitals_temperature: string | null;
  vitals_weight: string | null;
  vitals_heart_rate: string | null;
  token_number: number;
  doctor?: { name: string | null };
}

export function MedicalHistoryTimeline() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["medical-history", user?.id],
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
      })) as TimelineAppointment[];
    },
    enabled: !!user,
  });

  const { data: medicalRecords } = useQuery({
    queryKey: ["medical-records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_records")
        .select("*")
        .eq("patient_user_id", user!.id)
        .order("record_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "Upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Combine appointments and medical records into timeline
  const timelineItems = [
    ...(appointments?.map((apt) => ({
      id: apt.id,
      type: "appointment" as const,
      date: apt.appointment_date,
      data: apt,
    })) || []),
    ...(medicalRecords?.map((rec) => ({
      id: rec.id,
      type: "record" as const,
      date: rec.record_date,
      data: rec,
    })) || []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!timelineItems.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No medical history found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your appointments and medical records will appear here
          </p>
          <Link to="/booking">
            <Button className="mt-4" variant="hero">
              Book Your First Appointment
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const handleDownloadPDF = async () => {
    if (!appointments) return;
    setIsDownloading(true);
    try {
      downloadMedicalHistoryPDF(
        appointments,
        medicalRecords || [],
        {
          name: profile?.name || "Patient",
          phone: profile?.phone || undefined,
          age: profile?.age || undefined,
          gender: profile?.gender || undefined,
          blood_type: profile?.blood_type || undefined,
        }
      );
      toast({
        title: "PDF Downloaded",
        description: "Your medical history has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Failed to generate PDF. Please try again.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSharePDF = async () => {
    if (!appointments) return;
    setIsSharing(true);
    try {
      const blob = getMedicalHistoryPDFBlob(
        appointments,
        medicalRecords || [],
        {
          name: profile?.name || "Patient",
          phone: profile?.phone || undefined,
          age: profile?.age || undefined,
          gender: profile?.gender || undefined,
          blood_type: profile?.blood_type || undefined,
        }
      );
      
      const file = new File(
        [blob],
        `medical-history-${profile?.name?.replace(/\s+/g, "-").toLowerCase() || "patient"}.pdf`,
        { type: "application/pdf" }
      );

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Medical History Report",
          text: "My complete medical history from MediCare+",
          files: [file],
        });
        toast({
          title: "Shared successfully",
          description: "Your medical history has been shared.",
        });
      } else {
        // Fallback: copy link or download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        toast({
          title: "PDF Downloaded",
          description: "Sharing not supported. PDF has been downloaded instead.",
        });
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast({
          variant: "destructive",
          title: "Share failed",
          description: "Failed to share PDF. Please try downloading instead.",
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleDownloadPDF}
          disabled={isDownloading || !appointments?.length}
          className="gap-2"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Download PDF
        </Button>
        <Button
          variant="outline"
          onClick={handleSharePDF}
          disabled={isSharing || !appointments?.length}
          className="gap-2"
        >
          {isSharing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          Share
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Visits</span>
            </div>
            <p className="text-2xl font-bold mt-1">{appointments?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Diagnoses</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {appointments?.filter((a) => a.diagnosis).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Prescriptions</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {appointments?.filter((a) => a.medicines).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <TestTube className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">Lab Tests</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {appointments?.filter((a) => a.lab_tests).length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Medical History Timeline
          </CardTitle>
          <CardDescription>
            Your complete medical history in chronological order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {timelineItems.map((item, index) => {
                const isExpanded = expandedItems.has(item.id);

                if (item.type === "appointment") {
                  const apt = item.data as TimelineAppointment;
                  const hasDetails = apt.diagnosis || apt.medicines || apt.lab_tests || apt.doctor_comments;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative pl-14"
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-4 w-5 h-5 rounded-full bg-primary border-4 border-background" />

                      <Card className="overflow-hidden">
                        <div
                          className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                            hasDetails ? "" : "cursor-default"
                          }`}
                          onClick={() => hasDetails && toggleExpand(item.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">
                                  {format(new Date(apt.appointment_date), "MMMM d, yyyy")}
                                </span>
                                <Badge className={getStatusColor(apt.status)}>
                                  {apt.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  Dr. {apt.doctor?.name || "Unknown"}
                                </span>
                                {apt.department && (
                                  <span className="flex items-center gap-1">
                                    <Stethoscope className="w-3 h-3" />
                                    {apt.department}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <span className="font-medium text-primary">#{apt.token_number}</span>
                                </span>
                              </div>
                              {apt.reason && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  <span className="font-medium">Reason:</span> {apt.reason}
                                </p>
                              )}
                            </div>
                            {hasDetails && (
                              <Button variant="ghost" size="sm" className="shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && hasDetails && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="border-t bg-muted/30"
                          >
                            <div className="p-4 space-y-4">
                              {/* Vitals */}
                              {(apt.vitals_bp || apt.vitals_temperature || apt.vitals_weight || apt.vitals_heart_rate) && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-red-500" />
                                    Vitals
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {apt.vitals_bp && (
                                      <div className="p-2 rounded-lg bg-background text-sm">
                                        <span className="text-muted-foreground">BP:</span> {apt.vitals_bp}
                                      </div>
                                    )}
                                    {apt.vitals_temperature && (
                                      <div className="p-2 rounded-lg bg-background text-sm">
                                        <span className="text-muted-foreground">Temp:</span> {apt.vitals_temperature}
                                      </div>
                                    )}
                                    {apt.vitals_weight && (
                                      <div className="p-2 rounded-lg bg-background text-sm">
                                        <span className="text-muted-foreground">Weight:</span> {apt.vitals_weight}
                                      </div>
                                    )}
                                    {apt.vitals_heart_rate && (
                                      <div className="p-2 rounded-lg bg-background text-sm">
                                        <span className="text-muted-foreground">Heart Rate:</span> {apt.vitals_heart_rate}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Diagnosis */}
                              {apt.diagnosis && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-blue-500" />
                                    Diagnosis
                                  </h4>
                                  <p className="text-sm p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                                    {apt.diagnosis}
                                  </p>
                                </div>
                              )}

                              {/* Medicines */}
                              {apt.medicines && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <Pill className="w-4 h-4 text-green-500" />
                                    Prescription
                                  </h4>
                                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                                    <p className="text-sm whitespace-pre-line">{apt.medicines}</p>
                                  </div>
                                </div>
                              )}

                              {/* Lab Tests */}
                              {apt.lab_tests && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <TestTube className="w-4 h-4 text-purple-500" />
                                    Lab Tests
                                  </h4>
                                  <p className="text-sm p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900">
                                    {apt.lab_tests}
                                  </p>
                                </div>
                              )}

                              {/* Doctor Comments */}
                              {apt.doctor_comments && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-amber-500" />
                                    Doctor's Notes
                                  </h4>
                                  <p className="text-sm p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                                    {apt.doctor_comments}
                                  </p>
                                </div>
                              )}

                              {/* Allergies */}
                              {apt.allergies && (
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                    Allergies Noted
                                  </h4>
                                  <p className="text-sm p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                                    {apt.allergies}
                                  </p>
                                </div>
                              )}

                              {/* Action buttons */}
                              {apt.status === "Completed" && (
                                <div className="flex gap-2 pt-2">
                                  <Link to={`/prescription/${apt.id}`}>
                                    <Button variant="outline" size="sm">
                                      <FileText className="w-4 h-4 mr-2" />
                                      View Prescription
                                    </Button>
                                  </Link>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </Card>
                    </motion.div>
                  );
                }

                // Medical record item
                const record = item.data as any;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative pl-14"
                  >
                    <div className="absolute left-4 w-5 h-5 rounded-full bg-purple-500 border-4 border-background" />

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="border-purple-500 text-purple-600">
                            Medical Record
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(record.record_date), "MMMM d, yyyy")}
                          </span>
                        </div>
                        {record.doctor_name && (
                          <p className="text-sm text-muted-foreground mb-2">
                            <User className="w-3 h-3 inline mr-1" />
                            Dr. {record.doctor_name}
                          </p>
                        )}
                        {record.diagnosis && (
                          <p className="text-sm"><strong>Diagnosis:</strong> {record.diagnosis}</p>
                        )}
                        {record.medicines && (
                          <p className="text-sm"><strong>Medicines:</strong> {record.medicines}</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
