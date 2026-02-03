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

// CSV format: title, symptom_keywords, symptom_keywords (duplicate), recommendation
interface CSVRow {
  title: string;
  symptom_keywords: string;
  recommendation: string;
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

  // Fetch disease symptoms stats
  const { data: knowledgeStats, isLoading: loadingStats } = useQuery({
    queryKey: ["disease-symptoms-stats"],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("disease_symptoms")
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

  // Parse CSV file - format: title, symptom_keywords, symptom_keywords (duplicate), recommendation
  const parseCSV = (content: string): CSVRow[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");
    
    const rows: CSVRow[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV considering quoted fields with commas
      const fields: string[] = [];
      let currentField = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(currentField.trim().replace(/^"|"$/g, ''));
          currentField = '';
        } else {
          currentField += char;
        }
      }
      fields.push(currentField.trim().replace(/^"|"$/g, ''));
      
      // CSV format: title, symptom_keywords, symptom_keywords (duplicate), recommendation
      if (fields.length >= 3) {
        rows.push({
          title: fields[0] || '',
          symptom_keywords: fields[1] || fields[2] || '', // Use first symptom_keywords column
          recommendation: fields[3] || ''
        });
      }
    }
    
    if (rows.length === 0) {
      throw new Error("No valid data rows found in CSV");
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
        toast({ title: `Parsed ${rows.length} diseases from CSV` });
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
        .from("disease_symptoms")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
      
      if (deleteError) throw deleteError;
      
      // Insert new data in batches
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize).map(row => ({
          title: row.title,
          symptom_keywords: row.symptom_keywords,
          recommendation: row.recommendation || null,
        }));
        
        const { error } = await supabase.from("disease_symptoms").insert(batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disease-symptoms-stats"] });
      toast({ title: "Dataset uploaded successfully", description: `${parsedRows.length} diseases indexed` });
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
        .from("disease_symptoms")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disease-symptoms-stats"] });
      toast({ title: "Dataset cleared" });
    },
  });

  // Download sample CSV
  const downloadSampleCSV = () => {
    const sample = `title,symptom_keywords,symptom_keywords,recommendation,
Gestational Cholestasis,"Itchy skin, particularly on the hands and feet","Itchy skin, particularly on the hands and feet",,
Common Cold,"Cough, sore throat, runny nose, sneezing, mild fever","Cough, sore throat, runny nose, sneezing, mild fever","Rest, fluids, over-the-counter medication",
Migraine,"Severe headache, nausea, sensitivity to light, visual disturbances","Severe headache, nausea, sensitivity to light, visual disturbances","Pain relievers, preventive medications, rest in dark room",
Bronchitis,"Persistent cough with mucus, chest congestion, fatigue, shortness of breath","Persistent cough with mucus, chest congestion, fatigue, shortness of breath","Rest, fluids, over-the-counter cough suppressants, inhalers",`;
    
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Diseases_Symptoms_Template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen admin-gradient py-8">
          <div className="container mx-auto px-4">
            <Skeleton className="h-12 w-64 mb-8 bg-slate-700" />
            <Skeleton className="h-64 bg-slate-700" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen admin-gradient">
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
              <h1 className="text-3xl font-bold text-white">Disease & Symptoms Dataset</h1>
              <p className="text-slate-400">
                Manage the RAG knowledge base for <span className="text-emerald-400">AI symptom</span> analysis
              </p>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            <Card className="admin-stats-card">
              <CardContent className="p-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{loadingStats ? "-" : knowledgeStats?.totalRows}</p>
                    <p className="text-sm text-slate-400">Total Diseases</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="admin-stats-card">
              <CardContent className="p-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-400">
                      {knowledgeStats?.totalRows && knowledgeStats.totalRows > 0 ? "Active" : "Empty"}
                    </p>
                    <p className="text-sm text-slate-400">RAG Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="admin-stats-card">
              <CardContent className="p-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {knowledgeStats?.lastUpdated 
                        ? format(new Date(knowledgeStats.lastUpdated), "MMM d, yyyy HH:mm")
                        : "Never"
                      }
                    </p>
                    <p className="text-sm text-slate-400">Last Updated</p>
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
            <Card className="mb-8 admin-card text-white border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Upload className="w-5 h-5" />
                  Upload CSV Dataset
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Upload a CSV file with disease data. Format: title, symptom_keywords, symptom_keywords, recommendation
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
                        Preview: {parsedRows.length} diseases parsed
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
                            <TableHead>Disease Title</TableHead>
                            <TableHead>Symptoms</TableHead>
                            <TableHead>Recommendation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedRows.slice(0, 5).map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{row.title}</TableCell>
                              <TableCell className="truncate max-w-xs">{row.symptom_keywords}</TableCell>
                              <TableCell className="truncate max-w-xs">{row.recommendation || '-'}</TableCell>
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
                    <CardDescription>Recent entries in the disease knowledge base</CardDescription>
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
                        <AlertDialogTitle>Clear Dataset?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove all {knowledgeStats?.totalRows} disease entries from the knowledge base. 
                          The symptom checker will use fallback data until new data is uploaded.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => clearMutation.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Clear All Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : knowledgeStats?.recentEntries && knowledgeStats.recentEntries.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Disease Title</TableHead>
                          <TableHead>Symptoms</TableHead>
                          <TableHead>Recommendation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {knowledgeStats.recentEntries.map((entry: any) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.title}</TableCell>
                            <TableCell className="truncate max-w-xs">{entry.symptom_keywords}</TableCell>
                            <TableCell className="truncate max-w-xs">{entry.recommendation || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {knowledgeStats.totalRows > 10 && (
                      <div className="p-3 text-center text-sm text-muted-foreground border-t">
                        Showing 10 of {knowledgeStats.totalRows} entries
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No disease data uploaded yet</p>
                    <p className="text-sm">Upload a CSV file to populate the symptom checker knowledge base</p>
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
