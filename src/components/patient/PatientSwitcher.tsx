import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown, Plus, User, X, Check, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface PatientSwitcherProps {
  currentUserId: string;
  currentUserName: string | null;
  selectedPatientId: string | null;
  onPatientChange: (patientId: string | null, patientName: string | null) => void;
}

interface ManagedPatient {
  id: string;
  patient_user_id: string;
  patient_name: string;
  relationship: string;
  created_at: string;
}

export function PatientSwitcher({
  currentUserId,
  currentUserName,
  selectedPatientId,
  onPatientChange,
}: PatientSwitcherProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientRelationship, setNewPatientRelationship] = useState("Family Member");

  // Fetch managed patients
  const { data: managedPatients, isLoading } = useQuery({
    queryKey: ["managed-patients", currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("managed_patients")
        .select("*")
        .eq("manager_user_id", currentUserId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ManagedPatient[];
    },
    enabled: !!currentUserId,
  });

  // Add managed patient mutation
  const addPatient = useMutation({
    mutationFn: async ({ patientName, relationship }: { patientName: string; relationship: string }) => {
      // For simplicity, we'll create a patient profile linked to the current user
      // This means the manager manages this as a "virtual" patient under their account
      const { data, error } = await supabase
        .from("managed_patients")
        .insert({
          manager_user_id: currentUserId,
          patient_user_id: currentUserId, // Links to the manager's profile for RLS purposes
          patient_name: patientName,
          relationship: relationship,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-patients", currentUserId] });
      toast({ title: "Patient Added", description: "You can now book appointments for this patient" });
      setAddPatientOpen(false);
      setNewPatientName("");
      setNewPatientRelationship("Family Member");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Delete managed patient mutation
  const deletePatient = useMutation({
    mutationFn: async (patientId: string) => {
      const { error } = await supabase
        .from("managed_patients")
        .delete()
        .eq("id", patientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-patients", currentUserId] });
      toast({ title: "Patient Removed", description: "Patient has been removed from your list" });
      // If currently selected patient was deleted, reset to self
      if (selectedPatientId) {
        onPatientChange(null, null);
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleAddPatient = () => {
    if (!newPatientName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a patient name",
      });
      return;
    }
    addPatient.mutate({ patientName: newPatientName.trim(), relationship: newPatientRelationship });
  };

  const getCurrentPatientName = () => {
    if (!selectedPatientId) return currentUserName || "Myself";
    const patient = managedPatients?.find(p => p.id === selectedPatientId);
    return patient?.patient_name || "Unknown Patient";
  };

  const getCurrentRelationship = () => {
    if (!selectedPatientId) return "Self";
    const patient = managedPatients?.find(p => p.id === selectedPatientId);
    return patient?.relationship || "";
  };

  if (isLoading) {
    return <Skeleton className="h-10 w-48" />;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-1.5 sm:gap-2 border-primary/30 hover:bg-primary/10 px-2 sm:px-3">
            <Users className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-medium truncate max-w-[80px] sm:max-w-[150px]">{getCurrentPatientName()}</span>
            {selectedPatientId && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs ml-1 hidden sm:inline-flex">
                {getCurrentRelationship()}
              </Badge>
            )}
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 max-w-[calc(100vw-2rem)]">
          {/* Self option */}
          <DropdownMenuItem
            onClick={() => onPatientChange(null, null)}
            className="flex items-center gap-3 p-3"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {currentUserName?.charAt(0)?.toUpperCase() || "M"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{currentUserName || "Myself"}</p>
              <p className="text-xs text-muted-foreground">Self</p>
            </div>
            {!selectedPatientId && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>

          {/* Managed patients */}
          {managedPatients && managedPatients.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground">Managed Patients</p>
              </div>
              {managedPatients.map((patient) => (
                <DropdownMenuItem
                  key={patient.id}
                  onClick={() => onPatientChange(patient.id, patient.patient_name)}
                  className="flex items-center gap-3 p-3 group"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm">
                      {patient.patient_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{patient.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{patient.relationship}</p>
                  </div>
                  {selectedPatientId === patient.id && <Check className="w-4 h-4 text-primary" />}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePatient.mutate(patient.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />

          {/* Add patient button */}
          <DropdownMenuItem
            onClick={() => setAddPatientOpen(true)}
            className="flex items-center gap-3 p-3 text-primary"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <span className="font-medium">Add Family Member</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Patient Dialog */}
      <Dialog open={addPatientOpen} onOpenChange={setAddPatientOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add Family Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient-name">Patient Name</Label>
              <Input
                id="patient-name"
                placeholder="Enter full name"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Select value={newPatientRelationship} onValueChange={setNewPatientRelationship}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Family Member">Family Member</SelectItem>
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Child">Child</SelectItem>
                  <SelectItem value="Parent">Parent</SelectItem>
                  <SelectItem value="Sibling">Sibling</SelectItem>
                  <SelectItem value="Guardian">Guardian</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPatientOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPatient} disabled={addPatient.isPending}>
              {addPatient.isPending ? "Adding..." : "Add Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
