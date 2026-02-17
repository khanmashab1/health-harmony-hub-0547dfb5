import { useState } from "react";
import { format } from "date-fns";
import { FlaskConical, FileText, Image, ExternalLink, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TestReportsViewerProps {
  patientName: string;
  patientUserId?: string | null;
  currentAppointmentId?: string;
  mode?: "single" | "all"; // single = per appointment, all = review all
}

export function TestReportsViewer({ patientName, patientUserId, currentAppointmentId, mode = "all" }: TestReportsViewerProps) {
  const [open, setOpen] = useState(false);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

  // Fetch test reports - either for one appointment or all for patient
  const { data: reports, isLoading } = useQuery({
    queryKey: ["doctor-test-reports", mode === "single" ? currentAppointmentId : patientUserId, mode],
    queryFn: async () => {
      let query = supabase
        .from("test_reports")
        .select("*, appointments!inner(appointment_date, patient_full_name, token_number, lab_tests)")
        .order("created_at", { ascending: false });

      if (mode === "single" && currentAppointmentId) {
        query = query.eq("appointment_id", currentAppointmentId);
      } else if (patientUserId) {
        query = query.eq("appointments.patient_user_id", patientUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const viewFile = async (filePath: string) => {
    setLoadingUrl(filePath);
    try {
      const { data, error } = await supabase.storage
        .from("test-reports")
        .createSignedUrl(filePath, 300); // 5 min

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (err) {
      console.error("Error viewing file:", err);
    } finally {
      setLoadingUrl(null);
    }
  };

  const getFileIcon = (fileType?: string | null) => {
    if (fileType?.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-amber-500" />;
  };

  // Group reports by appointment
  const groupedByAppointment = reports?.reduce((acc: Record<string, any[]>, report: any) => {
    const key = report.appointment_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(report);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FlaskConical className="w-4 h-4" />
          <span className="hidden sm:inline">{mode === "single" ? "View Tests" : "Review All Tests"}</span>
          <span className="sm:hidden">Tests</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
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
              // Single appointment view
              <div className="space-y-2">
                {reports.map((report: any) => (
                  <div key={report.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/30 transition-all">
                    {getFileIcon(report.file_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{report.file_name}</p>
                      {report.notes && <p className="text-xs text-muted-foreground truncate">{report.notes}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(report.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewFile(report.file_path)}
                      disabled={loadingUrl === report.file_path}
                      className="shrink-0"
                    >
                      {loadingUrl === report.file_path ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              // All appointments grouped view
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
                        {aptReports.map((report: any) => (
                          <div key={report.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                            {getFileIcon(report.file_type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{report.file_name}</p>
                              {report.notes && <p className="text-[10px] text-muted-foreground truncate">{report.notes}</p>}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => viewFile(report.file_path)}
                              disabled={loadingUrl === report.file_path}
                            >
                              {loadingUrl === report.file_path ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        ))}
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
      </DialogContent>
    </Dialog>
  );
}
