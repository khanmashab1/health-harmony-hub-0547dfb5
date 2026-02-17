import { useState, useMemo } from "react";
import { Upload, FileText, X, Image, Loader2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface TestReportUploadProps {
  appointmentId: string;
  userId: string;
  labTests?: string | null;
}

function parseLabTests(labTests?: string | null): string[] {
  if (!labTests) return [];
  // Split by commas, semicolons, newlines, or " and "
  return labTests
    .split(/[,;\n]|(?:\band\b)/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function TestReportUpload({ appointmentId, userId, labTests }: TestReportUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedTest, setSelectedTest] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const testOptions = useMemo(() => parseLabTests(labTests), [labTests]);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["test-reports", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_reports")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (testOptions.length > 0 && !selectedTest) {
      toast({ title: "Select Test", description: "Please select which test you are uploading.", variant: "destructive" });
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const filePath = `${userId}/${appointmentId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("test-reports")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from("test_reports")
          .insert({
            appointment_id: appointmentId,
            uploaded_by: userId,
            file_path: filePath,
            file_name: file.name,
            file_type: file.type,
            notes: notes || null,
            test_name: selectedTest || null,
          });

        if (dbError) throw dbError;
      }

      toast({ title: "Test Report Uploaded", description: "Your report has been uploaded successfully." });
      queryClient.invalidateQueries({ queryKey: ["test-reports", appointmentId] });
      setNotes("");
      setSelectedTest("");
      e.target.value = "";
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (reportId: string, filePath: string) => {
    try {
      await supabase.storage.from("test-reports").remove([filePath]);
      await supabase.from("test_reports").delete().eq("id", reportId);
      queryClient.invalidateQueries({ queryKey: ["test-reports", appointmentId] });
      toast({ title: "Report Deleted" });
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  const getFileIcon = (fileType?: string | null) => {
    if (fileType?.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-amber-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Tests</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Upload Test Reports
          </DialogTitle>
          <DialogDescription>
            Upload lab test results (images, PDFs) for this appointment.
          </DialogDescription>
        </DialogHeader>

        {/* Suggested Tests */}
        {labTests && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Suggested Tests:</p>
            <p className="text-xs text-amber-600 dark:text-amber-300">{labTests}</p>
          </div>
        )}

        {/* Upload Area */}
        <div className="space-y-3">
          {/* Test Name Dropdown */}
          {testOptions.length > 0 ? (
            <Select value={selectedTest} onValueChange={setSelectedTest}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select test being uploaded *" />
              </SelectTrigger>
              <SelectContent>
                {testOptions.map((test) => (
                  <SelectItem key={test} value={test}>
                    {test}
                  </SelectItem>
                ))}
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          ) : null}

          <Input
            placeholder="Add notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-9"
          />
          <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {uploading ? "Uploading..." : "Click to upload images or PDFs"}
            </span>
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Uploaded Reports */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        ) : reports && reports.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground">Uploaded Reports ({reports.length})</p>
            {reports.map((report: any) => (
              <div key={report.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-card">
                {getFileIcon(report.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{report.file_name}</p>
                  {report.test_name && (
                    <Badge variant="secondary" className="text-[10px] h-4 mt-0.5">{report.test_name}</Badge>
                  )}
                  {report.notes && <p className="text-[10px] text-muted-foreground truncate">{report.notes}</p>}
                  {report.reviewed_at && (
                    <p className="text-[10px] text-green-600 dark:text-green-400">✓ Reviewed by doctor</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(report.id, report.file_path)}
                  className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
