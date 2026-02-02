import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Pause, FlaskConical, Play, Search, Hash, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PausedPatient {
  id: string;
  token_number: number;
  patient_full_name: string | null;
  patient_phone: string | null;
  patient_user_id: string | null;
}

interface PausedPatientsSectionProps {
  pausedPatients: PausedPatient[];
  onResume: (appointmentId: string) => void;
  isResumeDisabled: boolean;
}

export function PausedPatientsSection({ 
  pausedPatients, 
  onResume, 
  isResumeDisabled 
}: PausedPatientsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch patient IDs for all paused patients
  const { data: patientProfiles } = useQuery({
    queryKey: ["paused-patient-profiles", pausedPatients.map(p => p.patient_user_id).filter(Boolean)],
    queryFn: async () => {
      const patientUserIds = pausedPatients.map(p => p.patient_user_id).filter(Boolean) as string[];
      if (patientUserIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, patient_id")
        .in("id", patientUserIds);
      
      if (error) throw error;
      
      // Create a map of user_id -> patient_id
      const profileMap: Record<string, string | null> = {};
      data?.forEach(profile => {
        profileMap[profile.id] = profile.patient_id;
      });
      return profileMap;
    },
    enabled: pausedPatients.length > 0,
  });

  // Filter paused patients based on search
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return pausedPatients;
    
    const query = searchQuery.toLowerCase().trim();
    
    return pausedPatients.filter(apt => {
      // Search by name
      if (apt.patient_full_name?.toLowerCase().includes(query)) return true;
      
      // Search by token number
      if (apt.token_number.toString().includes(query)) return true;
      
      // Search by patient ID
      if (apt.patient_user_id && patientProfiles) {
        const patientId = patientProfiles[apt.patient_user_id];
        if (patientId?.toLowerCase().includes(query)) return true;
      }
      
      // Search by phone
      if (apt.patient_phone?.includes(query)) return true;
      
      return false;
    });
  }, [pausedPatients, searchQuery, patientProfiles]);

  return (
    <Card variant="glass" className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent dark:from-amber-500/10">
      <CardHeader className="border-b border-border/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Pause className="w-5 h-5 text-amber-500" />
              Paused for Lab Tests
              <Badge variant="outline" className="ml-2 border-amber-500/50 text-amber-600 dark:text-amber-400">
                {pausedPatients.length}
              </Badge>
            </CardTitle>
            <CardDescription>Patients waiting for lab results</CardDescription>
          </div>
          
          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-background/50 border-amber-500/30 focus:border-amber-500"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {filteredPatients.length > 0 ? (
          <div className="space-y-2">
            {filteredPatients.map((apt) => {
              const patientId = apt.patient_user_id && patientProfiles 
                ? patientProfiles[apt.patient_user_id] 
                : null;
              
              return (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      #{apt.token_number}
                    </div>
                    <div>
                      <p className="font-medium">{apt.patient_full_name || "Patient"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {patientId && (
                          <>
                            <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {patientId}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <FlaskConical className="w-3 h-3" />
                        Awaiting results
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/lab-tests/${apt.id}`}
                      target="_blank"
                    >
                      <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
                        <FlaskConical className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Print Slip</span>
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => onResume(apt.id)}
                      disabled={isResumeDisabled}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <Play className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Resume</span>
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-6 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No paused patients match "{searchQuery}"</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
