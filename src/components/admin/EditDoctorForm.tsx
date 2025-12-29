import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PROVINCES, CITIES, SPECIALTIES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

const editDoctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().max(20).optional(),
  specialty: z.string().min(1, "Specialty is required"),
  fee: z.coerce.number().min(0, "Fee must be positive").max(100000),
  province: z.string().min(1, "Province is required"),
  city: z.string().min(1, "City is required"),
  experience: z.coerce.number().min(0).max(70).optional(),
  bio: z.string().max(1000).optional(),
  maxPatientsPerDay: z.coerce.number().min(1).max(100).optional(),
  easypaisaNumber: z.string().max(20).optional(),
  status: z.string(),
});

type EditDoctorFormValues = z.infer<typeof editDoctorSchema>;

interface Doctor {
  user_id: string;
  specialty: string;
  fee: number;
  province: string | null;
  city: string | null;
  experience_years: number | null;
  bio: string | null;
  max_patients_per_day: number;
  easypaisa_number: string | null;
  profile?: {
    name: string | null;
    phone: string | null;
    status: string;
  };
}

interface EditDoctorFormProps {
  doctor: Doctor;
  onSuccess: () => void;
}

export function EditDoctorForm({ doctor, onSuccess }: EditDoctorFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditDoctorFormValues>({
    resolver: zodResolver(editDoctorSchema),
    defaultValues: {
      name: doctor.profile?.name || "",
      phone: doctor.profile?.phone || "",
      specialty: doctor.specialty,
      fee: doctor.fee,
      province: doctor.province || "",
      city: doctor.city || "",
      experience: doctor.experience_years || 0,
      bio: doctor.bio || "",
      maxPatientsPerDay: doctor.max_patients_per_day || 30,
      easypaisaNumber: doctor.easypaisa_number || "",
      status: doctor.profile?.status || "Active",
    },
  });

  const selectedProvince = form.watch("province");

  const onSubmit = async (values: EditDoctorFormValues) => {
    setIsLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: values.name,
          phone: values.phone || null,
          province: values.province,
          city: values.city,
          status: values.status,
        })
        .eq("id", doctor.user_id);

      if (profileError) throw profileError;

      // Update doctor record
      const { error: doctorError } = await supabase
        .from("doctors")
        .update({
          specialty: values.specialty,
          fee: values.fee,
          province: values.province,
          city: values.city,
          experience_years: values.experience || 0,
          bio: values.bio || null,
          max_patients_per_day: values.maxPatientsPerDay || 30,
          easypaisa_number: values.easypaisaNumber || null,
        })
        .eq("user_id", doctor.user_id);

      if (doctorError) throw doctorError;

      toast({
        title: "Doctor updated successfully",
        description: `Dr. ${values.name}'s information has been updated.`,
      });

      onSuccess();
    } catch (error: any) {
      console.error("Update doctor error:", error);
      toast({
        variant: "destructive",
        title: "Failed to update doctor",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle>Edit Doctor</DialogTitle>
          <DialogDescription>
            Update doctor information and settings
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Personal Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Personal Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+92-300-1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Professional Details */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Professional Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialty *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specialty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SPECIALTIES.map((s) => (
                          <SelectItem key={s.name} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consultation Fee (Rs.) *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience (years)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxPatientsPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Patients/Day</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Location
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("city", "");
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROVINCES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!selectedProvince}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(CITIES[selectedProvince] || []).map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Payment */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Payment Details
            </h4>
            <FormField
              control={form.control}
              name="easypaisaNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EasyPaisa Number</FormLabel>
                  <FormControl>
                    <Input placeholder="03XX-XXXXXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Bio */}
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description about the doctor's experience and expertise..."
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isLoading} variant="hero">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
