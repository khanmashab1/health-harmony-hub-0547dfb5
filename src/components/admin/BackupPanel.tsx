import { useState } from "react";
import { Download, Database, FileJson, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TABLES = [
  { name: "profiles", label: "User Profiles", description: "User account data" },
  { name: "doctors", label: "Doctors", description: "Doctor information" },
  { name: "appointments", label: "Appointments", description: "Appointment records" },
  { name: "reviews", label: "Reviews", description: "Patient reviews" },
  { name: "health_metrics", label: "Health Metrics", description: "Patient health data" },
  { name: "medical_records", label: "Medical Records", description: "Medical history" },
  { name: "symptom_knowledge", label: "Symptom Knowledge", description: "Symptom database" },
  { name: "symptom_submissions", label: "Symptom Submissions", description: "User symptom checks" },
  { name: "email_templates", label: "Email Templates", description: "Email configurations" },
  { name: "email_logs", label: "Email Logs", description: "Email history" },
  { name: "pa_assignments", label: "PA Assignments", description: "PA-Doctor assignments" },
  { name: "blocked_slots", label: "Blocked Slots", description: "Doctor availability" },
  { name: "audit_logs", label: "Audit Logs", description: "System activity logs" },
];

export function BackupPanel() {
  const { toast } = useToast();
  const [selectedTables, setSelectedTables] = useState<string[]>(TABLES.map(t => t.name));
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<"idle" | "success" | "error">("idle");

  const toggleTable = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const selectAll = () => setSelectedTables(TABLES.map(t => t.name));
  const deselectAll = () => setSelectedTables([]);

  const exportData = async () => {
    if (selectedTables.length === 0) {
      toast({
        variant: "destructive",
        title: "No tables selected",
        description: "Please select at least one table to export.",
      });
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setExportStatus("idle");

    try {
      const backupData: Record<string, unknown[]> = {};
      const totalTables = selectedTables.length;

      for (let i = 0; i < selectedTables.length; i++) {
        const tableName = selectedTables[i];
        setProgress(((i + 0.5) / totalTables) * 100);

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabase as any)
            .from(tableName)
            .select("*");

          if (error) {
            console.warn(`Error fetching ${tableName}:`, error.message);
            backupData[tableName] = [];
          } else {
            backupData[tableName] = data || [];
          }
        } catch {
          backupData[tableName] = [];
        }

        setProgress(((i + 1) / totalTables) * 100);
      }

      // Create backup file
      const backup = {
        exportedAt: new Date().toISOString(),
        projectId: "zfibmvdqnagcajgehqni",
        tables: selectedTables,
        data: backupData,
        metadata: {
          totalRecords: Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0),
          tableCount: selectedTables.length,
        },
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `medicare-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus("success");
      toast({
        title: "Backup completed",
        description: `Exported ${backup.metadata.totalRecords} records from ${selectedTables.length} tables.`,
      });
    } catch (error: unknown) {
      console.error("Export error:", error);
      setExportStatus("error");
      toast({
        variant: "destructive",
        title: "Backup failed",
        description: error instanceof Error ? error.message : "Failed to export data.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card variant="glass" className="border-white/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-emerald-50/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">Database Backup</CardTitle>
              <CardDescription>Export your database tables as JSON</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {TABLES.map((table) => (
            <div
              key={table.name}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                selectedTables.includes(table.name)
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/50 hover:border-border"
              }`}
              onClick={() => toggleTable(table.name)}
            >
              <Checkbox
                id={table.name}
                checked={selectedTables.includes(table.name)}
                onCheckedChange={() => toggleTable(table.name)}
              />
              <div className="flex-1">
                <Label htmlFor={table.name} className="font-medium cursor-pointer">
                  {table.label}
                </Label>
                <p className="text-xs text-muted-foreground">{table.description}</p>
              </div>
            </div>
          ))}
        </div>

        {isExporting && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Exporting data...</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {exportStatus !== "idle" && !isExporting && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            exportStatus === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {exportStatus === "success" ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Backup file downloaded successfully!</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" />
                <span>Export failed. Please try again.</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <FileJson className="w-3 h-3" />
              JSON Format
            </Badge>
            <Badge variant="secondary">
              {selectedTables.length} tables selected
            </Badge>
          </div>
          <Button
            onClick={exportData}
            disabled={isExporting || selectedTables.length === 0}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Backup
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
