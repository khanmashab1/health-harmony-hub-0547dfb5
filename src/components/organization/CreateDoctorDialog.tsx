import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Eye, EyeOff, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

const SPECIALTIES = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Gynecologist",
  "Neurologist",
  "Orthopedic",
  "Pediatrician",
  "Psychiatrist",
  "ENT Specialist",
  "Ophthalmologist",
  "Urologist",
  "Gastroenterologist",
  "Pulmonologist",
  "Dentist",
  "Other",
];

interface CreateDoctorDialogProps {
  organizationId: string;
  trigger?: React.ReactNode;
}

export function CreateDoctorDialog({ organizationId, trigger }: CreateDoctorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialty: "",
    degree: "",
    fee: "",
    experienceYears: "",
    bio: "",
  });

  const createDoctor = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("create-org-doctor", {
        body: {
          organizationId,
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone || undefined,
          specialty: formData.specialty,
          degree: formData.degree || undefined,
          fee: Number(formData.fee) || 500,
          experienceYears: Number(formData.experienceYears) || 0,
          bio: formData.bio || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create doctor");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["org-doctors"] });
      queryClient.invalidateQueries({ queryKey: ["org-members"] });
      toast({
        title: "Doctor Created Successfully!",
        description: `${formData.name} can now log in with the provided credentials.`,
      });
      setOpen(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        specialty: "",
        degree: "",
        fee: "",
        experienceYears: "",
        bio: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password || !formData.specialty) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    createDoctor.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
            <UserPlus className="w-4 h-4" />
            Add Doctor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Create New Doctor Account
          </DialogTitle>
          <DialogDescription>
            Create a new doctor account for your organization. They will receive Professional-level access.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Account Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Account Information
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Dr. John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+92 300 1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Professional Information
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty *</Label>
                <Select
                  value={formData.specialty}
                  onValueChange={(value) => setFormData({ ...formData, specialty: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent side="bottom" avoidCollisions={false} className="max-h-60">
                    {SPECIALTIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="degree">Degree</Label>
                <Input
                  id="degree"
                  placeholder="MBBS, MD, etc."
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fee">Consultation Fee (PKR) *</Label>
                <Input
                  id="fee"
                  type="number"
                  placeholder="1000"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience (Years)</Label>
                <Input
                  id="experience"
                  type="number"
                  placeholder="5"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio / About</Label>
              <Textarea
                id="bio"
                placeholder="Brief description about the doctor..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm">
              <strong>Note:</strong> The doctor will receive Professional-level dashboard access. 
              They can log in immediately using the email and password provided above. 
              Their data will be visible in your organization's unified analytics.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDoctor.isPending}>
              {createDoctor.isPending ? "Creating..." : "Create Doctor Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
