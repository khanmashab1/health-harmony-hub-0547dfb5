import { useState } from "react";
import { format } from "date-fns";
import { FlaskConical, FileText, Image, ExternalLink, Eye, Loader2, CheckCircle, MessageSquare, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TestReportsViewerProps {
  patientName: string;
  patientUserId?: string | null;
  doctorUserId?: string;
  currentAppointmentId?: string;
  mode?: "single" | "all";
}

export function TestReportsViewer({ patientName, patientUserId, doctorUserId, currentAppointmentId, mode = "all" }: TestReportsViewerProps) {
  const [open, setOpen] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ["doctor-test-reports", mode === "single" ? currentAppointmentId : patientUserId, doctorUserId, mode];

  const { data: reports, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from("test_reports")
        .select("*, appointments!inner(appointment_date, patient_full_name, token_number, lab_tests, doctor_user_id)")
        .order("created_at", { ascending: false });

      if (mode === "single" && currentAppointmentId) {
        query = query.eq("appointment_id", currentAppointmentId);
      } else {
        // Filter by patient
        if (patientUserId) {
          query = query.eq("appointments.patient_user_id", patientUserId);
        }
        // Filter by doctor to only show reports for this doctor's appointments
        if (doctorUserId) {
          query = query.eq("appointments.doctor_user_id", doctorUserId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("test_reports")
        .update({
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_notes: reviewNotes || null,
        })
        .eq("id", reportId);

      if (error) throw error;

      toast({ title: "Report Reviewed", description: "Test report marked as reviewed." });
      queryClient.invalidateQueries({ queryKey });
      setReviewingId(null);
      setReviewNotes("");
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

  const groupedByAppointment = reports?.reduce((acc: Record<string, any[]>, report: any) => {
    const key = report.appointment_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(report);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const renderReportItem = (report: any, compact = false) => (
    <div key={report.id} className="space-y-1">
      <div className={`flex items-center gap-2.5 ${compact ? "p-2 rounded-lg hover:bg-muted/30" : "p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/30"} transition-all`}>
        {getFileIcon(report.file_type)}
        <div className="flex-1 min-w-0">
          <p className={`${compact ? "text-xs" : "text-sm"} font-medium truncate`}>{report.file_name}</p>
          {report.test_name && (
            <Badge variant="secondary" className="text-[10px] h-4 mt-0.5">{report.test_name}</Badge>
          )}
          {report.notes && <p className="text-[10px] text-muted-foreground truncate">{report.notes}</p>}
          {!compact && (
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(report.created_at), "MMM d, yyyy h:mm a")}
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
        <div className="flex items-center gap-1 shrink-0">
          {!report.reviewed_at && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setReviewingId(reviewingId === report.id ? null : report.id);
                setReviewNotes("");
              }}
              title="Mark as reviewed"
              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size={compact ? "icon-sm" : "sm"}
            onClick={() => viewFile(report.file_path, report.file_type, report.file_name)}
            disabled={loadingUrl === report.file_path}
          >
            {loadingUrl === report.file_path ? (
              <Loader2 className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} animate-spin`} />
            ) : compact ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Review annotation form */}
      {reviewingId === report.id && (
        <div className="ml-6 p-2.5 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 space-y-2">
          <Textarea
            placeholder="Add review notes (optional)..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className="min-h-[60px] text-xs"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleMarkReviewed(report.id)}
              disabled={savingReview}
              className="gap-1 h-7 text-xs"
            >
              {savingReview ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Mark Reviewed
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReviewingId(null)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPreviewUrl(null); setPreviewType(null); setPreviewName(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FlaskConical className="w-4 h-4" />
          <span className="hidden sm:inline">{mode === "single" ? "View Tests" : "Review All Tests"}</span>
          <span className="sm:hidden">Tests</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        {previewUrl ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => { setPreviewUrl(null); setPreviewType(null); setPreviewName(""); }}
                  className="shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <span className="truncate">{previewName}</span>
              </DialogTitle>
              <DialogDescription>Viewing uploaded test report</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 max-h-[65vh] rounded-lg overflow-hidden border bg-muted/30">
              {previewType?.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt={previewName}
                  className="w-full h-full object-contain max-h-[65vh]"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={previewName}
                  className="w-full h-[65vh] border-0"
                />
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                {mode === "single" ? "Test Reports" : "All Test Reports"}
              </DialogTitle>
              <DialogDescription>
                {mode === "single"
                  ? `Test reports for this appointment`
                  : `All uploaded test reports for ${patientName}`}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
              ) : reports && reports.length > 0 ? (
                mode === "single" ? (
                  <div className="space-y-2">
                    {reports.map((report: any) => renderReportItem(report))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedByAppointment).map(([aptId, aptReports]: [string, any[]]) => {
                      const apt = aptReports[0]?.appointments;
                      return (
                        <div key={aptId} className="rounded-xl border border-border/50 overflow-hidden">
                          <div className="px-4 py-2.5 bg-muted/50 border-b border-border/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {apt ? format(new Date(apt.appointment_date), "MMM d, yyyy") : "Unknown Date"}
                              </span>
                              {apt?.token_number && (
                                <Badge variant="secondary" className="text-xs">Token #{apt.token_number}</Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">{aptReports.length} file(s)</Badge>
                          </div>
                          {apt?.lab_tests && (
                            <div className="px-4 py-2 bg-amber-50/50 dark:bg-amber-950/10 border-b border-border/20">
                              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                <span className="font-medium">Suggested:</span> {apt.lab_tests}
                              </p>
                            </div>
                          )}
                          <div className="p-2 space-y-1">
                            {aptReports.map((report: any) => renderReportItem(report, true))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <FlaskConical className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No test reports uploaded yet</p>
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
