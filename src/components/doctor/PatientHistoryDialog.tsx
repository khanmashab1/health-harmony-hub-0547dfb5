import { useState } from "react";
import { format } from "date-fns";
import { FileText, Stethoscope, Pill, Calendar, ChevronRight, History, FlaskConical } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { MedicinesList, parseMedicines } from "@/components/shared/MedicinesList";

interface PatientHistoryDialogProps {
  patientName: string;
  patientUserId?: string | null;
  doctorUserId: string;
  currentAppointmentId: string;
}

export function PatientHistoryDialog({ patientName, patientUserId, doctorUserId, currentAppointmentId }: PatientHistoryDialogProps) {
  const [open, setOpen] = useState(false);

  const { data: history, isLoading } = useQuery({
    queryKey: ["patient-history-doctor", patientUserId, patientName, doctorUserId],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*")
        .eq("status", "Completed")
        .not("diagnosis", "is", null)
        .order("appointment_date", { ascending: false });

      // Filter by patient
      if (patientUserId) {
        query = query.eq("patient_user_id", patientUserId);
      } else if (patientName) {
        query = query.eq("patient_full_name", patientName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <History className="w-4 h-4" />
          View Patient History
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Prescription History
          </DialogTitle>
          <DialogDescription>
            All completed prescriptions for {patientName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((record) => {
                const medicines = parseMedicines(record.medicines);
                const isCurrent = record.id === currentAppointmentId;

                return (
                  <div
                    key={record.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent 
                        ? "border-primary/50 bg-primary/5" 
                        : "border-border/50 bg-card hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        {/* Date & Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {format(new Date(record.appointment_date), "MMM d, yyyy")}
                          </span>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-xs">Current Visit</Badge>
                          )}
                        </div>

                        {/* Diagnosis */}
                        {record.diagnosis && (
                          <div className="flex items-start gap-2 text-sm">
                            <Stethoscope className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">
                              <span className="font-medium text-foreground">Diagnosis:</span> {record.diagnosis}
                            </span>
                          </div>
                        )}

                        {/* Medicines */}
                        {medicines.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {medicines.slice(0, 4).map((med: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                                <Pill className="w-2.5 h-2.5 mr-1" />
                                {med.name}
                              </Badge>
                            ))}
                            {medicines.length > 4 && (
                              <Badge variant="secondary" className="text-xs">+{medicines.length - 4} more</Badge>
                            )}
                          </div>
                        )}

                        {/* Lab Tests */}
                        {record.lab_tests && (
                          <div className="flex items-start gap-2 text-sm">
                            <FlaskConical className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground text-xs truncate">
                              Lab: {record.lab_tests.substring(0, 80)}{record.lab_tests.length > 80 ? "..." : ""}
                            </span>
                          </div>
                        )}

                        {/* Follow-up */}
                        {record.follow_up_date && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Follow-up: {format(new Date(record.follow_up_date), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>

                      {/* View Prescription Link */}
                      <Link to={`/prescription/${record.id}`} onClick={() => setOpen(false)}>
                        <Button variant="ghost" size="icon-sm" className="shrink-0">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                <FileText className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No prescription history found</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
