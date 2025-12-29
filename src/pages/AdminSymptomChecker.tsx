import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Upload, 
  FileSpreadsheet, 
  RefreshCw, 
  Trash2, 
  Download,
  CheckCircle2,
  AlertCircle,
  Database,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const REQUIRED_COLUMNS = ["symptom", "description", "severity", "advice", "red_flags"];

interface CSVRow {
  symptom: string;
  description: string;
  severity: string;
  advice: string;
  red_flags: string;
  when_to_seek_help?: string;
  source?: string;
}

export default function AdminSymptomChecker() {
  const { loading } = useRequireAuth(["admin"]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch symptom knowledge stats
  const { data: knowledgeStats, isLoading: loadingStats } = useQuery({
    queryKey: ["symptom-knowledge-stats"],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("symptom_knowledge")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      const latestRecord = data?.[0];
      return {
        totalRows: count || 0,
        lastUpdated: latestRecord?.created_at || null,
        recentEntries: data || []
      };
    },
  });

  // Parse CSV file
  const parseCSV = (content: string): CSVRow[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");
    
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    
    // Validate required columns
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
    }
    
    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleanValues = values.map(v => v.replace(/^"|"$/g, "").trim());
      
      if (cleanValues.length < REQUIRED_COLUMNS.length) continue;
      
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = cleanValues[index] || "";
      });
      
      // Validate severity
      if (!["low", "medium", "high"].includes(row.severity?.toLowerCase())) {
        row.severity = "medium"; // Default
      } else {
        row.severity = row.severity.toLowerCase();
      }
      
      rows.push(row as CSVRow);
    }
    
    return rows;
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    setParsedRows([]);
    setShowPreview(false);
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith(".csv")) {
      setParseError("File must be a .csv file");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const rows = parseCSV(content);
        setParsedRows(rows);
        setShowPreview(true);
        toast({ title: `Parsed ${rows.length} rows from CSV` });
      } catch (error: any) {
        setParseError(error.message);
      }
    };
    reader.readAsText(file);
  };

  // Upload and replace data
  const uploadMutation = useMutation({
    mutationFn: async (rows: CSVRow[]) => {
      // Delete existing data
      const { error: deleteError } = await supabase
        .from("symptom_knowledge")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
      
      if (deleteError) throw deleteError;
      
      // Insert new data in batches
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize).map(row => ({
          symptom: row.symptom,
          description: row.description,
          severity: row.severity as "low" | "medium" | "high",
          advice: row.advice,
          red_flags: row.red_flags,
          when_to_seek_help: row.when_to_seek_help || null,
          source: row.source || null,
        }));
        
        const { error } = await supabase.from("symptom_knowledge").insert(batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["symptom-knowledge-stats"] });
      toast({ title: "Dataset uploaded successfully", description: `${parsedRows.length} symptoms indexed` });
      setParsedRows([]);
      setShowPreview(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Upload failed", description: error.message });
    },
  });

  // Clear all data
  const clearMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("symptom_knowledge")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["symptom-knowledge-stats"] });
      toast({ title: "Dataset cleared" });
    },
  });

  // Download sample CSV
  const downloadSampleCSV = () => {
    const sample = `symptom,description,severity,advice,red_flags,when_to_seek_help,source
Headache,Pain or discomfort in the head or face area,low,"Rest, stay hydrated, take OTC pain relievers if needed",Sudden severe headache;Vision changes;Confusion,Seek immediate help if headache is sudden and severe or accompanied by fever and stiff neck,Medical guidelines
Fever,Elevated body temperature above 38°C (100.4°F),medium,"Rest, stay hydrated, take fever-reducing medication",Fever above 39.4°C (103°F);Difficulty breathing;Severe headache,See a doctor if fever persists more than 3 days or is very high,CDC guidelines
Chest Pain,Discomfort or pain in the chest area,high,"Stop activity, rest, call for help if severe",Pressure or squeezing sensation;Pain radiating to arm or jaw;Shortness of breath,Call emergency services immediately if chest pain is severe or accompanied by shortness of breath,AHA guidelines`;
    
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "symptom-checker-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-brand-50/20 py-8">
          <div className="container mx-auto px-4">
            <Skeleton className="h-12 w-64 mb-8" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-brand-50/20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Database className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Symptom Checker Dataset</h1>
              <p className="text-muted-foreground">Manage the RAG knowledge base for symptom analysis</p>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{loadingStats ? "-" : knowledgeStats?.totalRows}</p>
                    <p className="text-sm text-muted-foreground">Total Symptoms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-600">Indexed</p>
                    <p className="text-sm text-muted-foreground">RAG Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {knowledgeStats?.lastUpdated 
                        ? format(new Date(knowledgeStats.lastUpdated), "MMM d, yyyy HH:mm")
                        : "Never"
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Upload Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload CSV Dataset
                </CardTitle>
                <CardDescription>
                  Upload a CSV file with symptom data. Required columns: symptom, description, severity, advice, red_flags
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="csv-file">Select CSV File</Label>
                    <Input
                      ref={fileInputRef}
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="mt-2"
                    />
                  </div>
                  <Button variant="outline" onClick={downloadSampleCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                {parseError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span>{parseError}</span>
                  </div>
                )}

                {showPreview && parsedRows.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Preview: {parsedRows.length} rows parsed
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setParsedRows([]);
                            setShowPreview(false);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => uploadMutation.mutate(parsedRows)}
                          disabled={uploadMutation.isPending}
                        >
                          {uploadMutation.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload & Replace
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Symptom</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedRows.slice(0, 5).map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{row.symptom}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  row.severity === "high" ? "destructive" :
                                  row.severity === "medium" ? "default" : "secondary"
                                }>
                                  {row.severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="truncate max-w-xs">{row.description}</TableCell>
                            </TableRow>
                          ))}
                          {parsedRows.length > 5 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                ... and {parsedRows.length - 5} more rows
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Current Data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current Dataset</CardTitle>
                    <CardDescription>Recent entries in the symptom knowledge base</CardDescription>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={knowledgeStats?.totalRows === 0}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear all symptom data?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all {knowledgeStats?.totalRows} symptom entries. 
                          The symptom checker will not work until new data is uploaded.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => clearMutation.mutate()}>
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : knowledgeStats?.recentEntries && knowledgeStats.recentEntries.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symptom</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Advice</TableHead>
                          <TableHead>Red Flags</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {knowledgeStats.recentEntries.map((entry: any) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.symptom}</TableCell>
                            <TableCell>
                              <Badge variant={
                                entry.severity === "high" ? "destructive" :
                                entry.severity === "medium" ? "default" : "secondary"
                              }>
                                {entry.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="truncate max-w-xs">{entry.advice}</TableCell>
                            <TableCell className="truncate max-w-xs text-muted-foreground">
                              {entry.red_flags || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No symptom data uploaded yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload a CSV file to populate the RAG knowledge base
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}