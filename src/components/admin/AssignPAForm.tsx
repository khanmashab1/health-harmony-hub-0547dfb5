import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface PA {
  id: string;
  name: string | null;
}

interface Doctor {
  user_id: string;
  specialty: string;
  profile?: {
    name: string | null;
  };
}

interface AssignPAFormProps {
  pas: PA[];
  doctors: Doctor[];
  onSubmit: (paId: string, doctorId: string) => void;
  isLoading?: boolean;
}

export function AssignPAForm({ pas, doctors, onSubmit, isLoading }: AssignPAFormProps) {
  const [paId, setPaId] = useState("");
  const [doctorId, setDoctorId] = useState("");

  const handleSubmit = () => {
    if (paId && doctorId) {
      onSubmit(paId, doctorId);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Assign PA to Doctor</DialogTitle>
        <DialogDescription>
          Select a PA and a doctor to create an assignment
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label>Personal Assistant</Label>
          <Select value={paId} onValueChange={setPaId}>
            <SelectTrigger>
              <SelectValue placeholder="Select PA" />
            </SelectTrigger>
            <SelectContent>
              {pas.map((pa) => (
                <SelectItem key={pa.id} value={pa.id}>
                  {pa.name || "Unnamed PA"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Doctor</Label>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doc) => (
                <SelectItem key={doc.user_id} value={doc.user_id}>
                  Dr. {doc.profile?.name || "Unknown"} - {doc.specialty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button
          onClick={handleSubmit}
          disabled={!paId || !doctorId || isLoading}
          variant="hero"
        >
          {isLoading ? "Assigning..." : "Create Assignment"}
        </Button>
      </DialogFooter>
    </>
  );
}
