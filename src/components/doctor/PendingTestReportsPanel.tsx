import { useState } from "react";
import { format } from "date-fns";
import {
  FlaskConical,
  FileText,
  Image,
  Eye,
  Loader2,
  CheckCircle,
  ArrowLeft,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PendingTestReportsPanelProps {
  doctorUserId: string;
  showAll?: boolean;
}

export function PendingTestReportsPanel({ doctorUserId, showAll = false }: PendingTestReportsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

  const queryKey = ["pending-test-reports", doctorUserId, showAll];

  const { data: reports, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from("test_reports")
        .select(
          "*, appointments!inner(appointment_date, patient_full_name, patient_phone, token_number, lab_tests, doctor_user_id, id, status, diagnosis, medicines)"
        )
        .eq("appointments.doctor_user_id", doctorUserId)
        .order("created_at", { ascending: false });

      if (!showAll) {
        query = query.is("reviewed_at", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const viewFile = async (filePath: string, fileType?: string | null, fileName?: string) => {
    setLoadingUrl(filePath);
    try {
      const { data, error } = await supabase.storage
        .from("test-reports")
        .createSignedUrl(filePath, 300);
      if (error) throw error;
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
        setPreviewType(fileType || null);
        setPreviewName(fileName || "File Preview");
      }
    } catch (err) {
      console.error("Error viewing file:", err);
    } finally {
      setLoadingUrl(null);
    }
  };

  const handleMarkReviewed = async (reportId: string) => {
    setSavingReview(true);
    try {
      const { error } = await supabase
        .from("test_reports")
        .update({
          reviewed_at: new Date().toISOString(),
          reviewed_by: doctorUserId,
          review_notes: reviewNotes || null,
        })
        .eq("id", reportId);

      if (error) throw error;

      toast({ title: "Report Reviewed", description: "Test report marked as reviewed with your remarks." });
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["doctor-test-reports"] });
      setReviewingId(null);
      setReviewNotes("");
      setPreviewUrl(null);
      setPreviewType(null);
      setPreviewName("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingReview(false);
    }
  };

  const getFileIcon = (fileType?: string | null) => {
    if (fileType?.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-amber-500" />;
  };

  if (isLoading) {
    return (
      <Card variant="glass" className="border-white/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            {showAll ? "Test Reports" : "Pending Test Reports"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reports || reports.length === 0) {
    if (showAll) {
      return (
        <Card variant="glass" className="border-white/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Test Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                <FlaskConical className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No test reports uploaded yet</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  // If previewing a file
  if (previewUrl) {
    const currentReport = reports?.find(
      (r: any) => previewName === r.file_name
    );

    return (
      <Card variant="glass" className="border-white/50">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
          <CardTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setPreviewUrl(null);
                setPreviewType(null);
                setPreviewName("");
              }}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="truncate text-sm sm:text-base">{previewName}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 space-y-3">
          <div className="rounded-lg overflow-hidden border bg-muted/30">
            {previewType?.startsWith("image/") ? (
              <img
                src={previewUrl}
                alt={previewName}
                className="w-full h-auto max-h-[50vh] sm:max-h-[60vh] object-contain"
              />
            ) : (
              <iframe
                src={previewUrl}
                title={previewName}
                className="w-full h-[50vh] sm:h-[60vh] border-0"
              />
            )}
          </div>

          {/* Actions below preview */}
          <div className="flex flex-col sm:flex-row gap-2">
            {currentReport && !currentReport.reviewed_at && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReviewingId(currentReport.id);
                  setReviewNotes("");
                }}
                className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30"
              >
                <CheckCircle className="w-4 h-4" />
                Add Remarks
              </Button>
            )}
            {currentReport?.appointments && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/lab-tests/${currentReport.appointment_id}`)
                }
                className="gap-1.5"
              >
                <ClipboardList className="w-4 h-4" />
                View Prescription
              </Button>
            )}
          </div>

          {/* Review form below preview */}
          {reviewingId === currentReport?.id && (
            <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 space-y-2">
              <Textarea
                placeholder="Add your remarks about this test report..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleMarkReviewed(currentReport.id)}
                  disabled={savingReview}
                  className="gap-1"
                >
                  {savingReview ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3 h-3" />
                  )}
                  Submit & Mark Reviewed
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReviewingId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="border-white/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          {showAll ? "All Test Reports" : "Pending Test Reports"}
          <Badge variant={showAll ? "secondary" : "destructive"} className="ml-1 text-xs">
            {reports.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          {showAll ? "All test reports from your patients" : "Test reports awaiting your review and remarks"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-3">
            {reports.map((report: any) => {
              const apt = report.appointments;
              return (
                <div
                  key={report.id}
                  className="rounded-xl border border-border/50 bg-card hover:bg-accent/30 transition-all overflow-hidden"
                >
                  {/* Report header with patient info */}
                  <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(report.file_type)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">
                          {apt?.patient_full_name || "Patient"}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {apt?.token_number && (
                            <Badge variant="secondary" className="text-[10px] h-4">
                              Token #{apt.token_number}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {apt
                              ? format(new Date(apt.appointment_date), "MMM d, yyyy")
                              : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {report.file_name}
                          {report.test_name && ` — ${report.test_name}`}
                        </p>
                        {report.notes && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            Patient note: {report.notes}
                          </p>
                        )}
                        {report.reviewed_at && (
                          <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5">
                            <CheckCircle className="w-3 h-3" />
                            Reviewed {format(new Date(report.reviewed_at), "MMM d, h:mm a")}
                            {report.review_notes && ` — ${report.review_notes}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          viewFile(report.file_path, report.file_type, report.file_name)
                        }
                        disabled={loadingUrl === report.file_path}
                        className="gap-1.5 text-xs"
                      >
                        {loadingUrl === report.file_path ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">View & Review</span>
                        <span className="sm:hidden">View</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(`/lab-tests/${report.appointment_id}`)
                        }
                        className="gap-1 text-xs"
                        title="View Prescription"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Rx</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
