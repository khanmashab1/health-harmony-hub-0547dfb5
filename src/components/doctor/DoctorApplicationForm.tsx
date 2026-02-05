import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Upload, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { toast } from "sonner";
import { PROVINCES, CITIES, SPECIALTIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const GENDERS = ["Male", "Female", "Other"];

const applicationSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email").max(255),
  phone: z.string().trim().min(10, "Phone must be at least 10 digits").max(20),
  dateOfBirth: z.date({ required_error: "Date of birth is required" }),
  gender: z.string().min(1, "Gender is required"),
  province: z.string().min(1, "Province is required"),
  city: z.string().min(1, "City is required"),
  specialty: z.string().min(1, "Specialty is required"),
  degree: z.string().trim().min(2, "Degree is required").max(100),
  qualifications: z.string().max(500).optional(),
  experienceYears: z.coerce.number().min(0).max(70),
  consultationFee: z.coerce.number().min(100, "Minimum fee is Rs. 100").max(100000),
  bio: z.string().max(1000).optional(),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

interface DoctorApplicationFormProps {
  onSuccess: () => void;
}

export function DoctorApplicationForm({ onSuccess }: DoctorApplicationFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [medicalLicenseFile, setMedicalLicenseFile] = useState<File | null>(null);
  const [degreeCertificateFile, setDegreeCertificateFile] = useState<File | null>(null);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      fullName: "",
      email: user?.email || "",
      phone: "",
      gender: "",
      province: "",
      city: "",
      specialty: "",
      degree: "",
      qualifications: "",
      experienceYears: 0,
      consultationFee: 500,
      bio: "",
    },
  });
 
   const selectedProvince = form.watch("province");
 
   const uploadFile = async (file: File, type: string): Promise<string | null> => {
     try {
       const fileExt = file.name.split(".").pop();
       const fileName = `${user?.id}-${type}-${Date.now()}.${fileExt}`;
       const filePath = `applications/${fileName}`;
 
       const { error } = await supabase.storage
         .from("doctor-applications")
         .upload(filePath, file);
 
       if (error) throw error;
       return filePath;
     } catch (error) {
       console.error(`Error uploading ${type}:`, error);
       return null;
     }
   };
 
   const onSubmit = async (values: ApplicationFormValues) => {
     if (!user) {
       toast.error("Please sign in to submit an application");
       return;
     }
 
     setIsSubmitting(true);
     try {
       // Upload documents
       let medicalLicensePath = null;
       let degreeCertificatePath = null;
 
       if (medicalLicenseFile) {
         medicalLicensePath = await uploadFile(medicalLicenseFile, "license");
       }
       if (degreeCertificateFile) {
         degreeCertificatePath = await uploadFile(degreeCertificateFile, "degree");
       }
 
      // Submit application
      const { error } = await supabase.from("doctor_applications").insert({
        full_name: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        date_of_birth: format(values.dateOfBirth, "yyyy-MM-dd"),
        gender: values.gender,
        province: values.province,
        city: values.city,
        specialty: values.specialty,
        degree: values.degree.trim(),
        qualifications: values.qualifications?.trim() || null,
        experience_years: values.experienceYears,
        consultation_fee: values.consultationFee,
        bio: values.bio?.trim() || null,
        medical_license_path: medicalLicensePath,
        degree_certificate_path: degreeCertificatePath,
      });
 
       if (error) throw error;
 
       setSubmitted(true);
       toast.success("Application submitted successfully!");
     } catch (error: any) {
       console.error("Application error:", error);
       toast.error(error.message || "Failed to submit application");
     } finally {
       setIsSubmitting(false);
     }
   };
 
   if (submitted) {
     return (
       <div className="text-center py-8 space-y-4">
         <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
           <CheckCircle className="w-10 h-10 text-green-600" />
         </div>
         <h3 className="text-xl font-semibold">Application Submitted!</h3>
         <p className="text-muted-foreground max-w-md mx-auto">
           Thank you for applying to join MediCare+. Our team will review your application
           and contact you within 3-5 business days.
         </p>
         <Button onClick={onSuccess} variant="outline">
           Close
         </Button>
       </div>
     );
   }
 
   return (
     <Form {...form}>
       <form onSubmit={form.handleSubmit(onSubmit)}>
         <DialogHeader>
           <DialogTitle>Doctor Application Form</DialogTitle>
           <DialogDescription>
             Complete the form below to apply as a healthcare provider on MediCare+
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-6 py-4">
           {/* Personal Information */}
           <div className="space-y-4">
             <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
               Personal Information
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="fullName"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Full Name *</FormLabel>
                     <FormControl>
                       <Input placeholder="Dr. Ahmed Khan" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="email"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Email *</FormLabel>
                     <FormControl>
                       <Input type="email" placeholder="doctor@example.com" {...field} />
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
                     <FormLabel>Phone Number *</FormLabel>
                     <FormControl>
                       <Input placeholder="03XX-XXXXXXX" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="dateOfBirth"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Date of Birth *</FormLabel>
                     <Popover>
                       <PopoverTrigger asChild>
                         <FormControl>
                           <Button
                             variant="outline"
                             className={cn(
                               "w-full pl-3 text-left font-normal",
                               !field.value && "text-muted-foreground"
                             )}
                           >
                             {field.value ? (
                               format(field.value, "dd MMMM yyyy")
                             ) : (
                               <span>Pick a date</span>
                             )}
                             <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                           </Button>
                         </FormControl>
                       </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 z-50"
                          align="start"
                          side="bottom"
                          sideOffset={8}
                          avoidCollisions={false}
                        >
                         <Calendar
                           mode="single"
                           selected={field.value}
                           onSelect={field.onChange}
                           disabled={(date) =>
                             date > new Date() || date < new Date("1940-01-01")
                           }
                           initialFocus
                            captionLayout="dropdown"
                           fromYear={1940}
                           toYear={new Date().getFullYear() - 20}
                            className="p-3 pointer-events-auto"
                         />
                       </PopoverContent>
                     </Popover>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="gender"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Gender *</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Select gender" />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {GENDERS.map((g) => (
                           <SelectItem key={g} value={g}>{g}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
           </div>
 
           {/* Location */}
           <div className="space-y-4">
             <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
               Location
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                       value={field.value}
                     >
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Select province" />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {PROVINCES.map((p) => (
                           <SelectItem key={p} value={p}>{p}</SelectItem>
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
                       value={field.value}
                       disabled={!selectedProvince}
                     >
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Select city" />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {(CITIES[selectedProvince] || []).map((c) => (
                           <SelectItem key={c} value={c}>{c}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
           </div>
 
           {/* Professional Details */}
           <div className="space-y-4">
             <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
               Professional Details
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="specialty"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Specialty *</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Select specialty" />
                         </SelectTrigger>
                       </FormControl>
                        <SelectContent side="bottom" sideOffset={8} avoidCollisions={false}>
                         {SPECIALTIES.map((s) => (
                           <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="degree"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Medical Degree *</FormLabel>
                     <FormControl>
                       <Input placeholder="MBBS, FCPS, etc." {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="experienceYears"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Years of Experience *</FormLabel>
                     <FormControl>
                       <Input type="number" min={0} max={70} {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="consultationFee"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Consultation Fee (Rs.) *</FormLabel>
                     <FormControl>
                       <Input type="number" min={100} {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
             <FormField
               control={form.control}
               name="qualifications"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Additional Qualifications</FormLabel>
                   <FormControl>
                     <Textarea
                       placeholder="Board certifications, specialized training, fellowships..."
                       className="min-h-[60px]"
                       {...field}
                     />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
             <FormField
               control={form.control}
               name="bio"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Professional Bio</FormLabel>
                   <FormControl>
                     <Textarea
                       placeholder="Brief description of your experience, expertise, and approach to patient care..."
                       className="min-h-[80px]"
                       {...field}
                     />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
           </div>
 

          {/* Document Uploads */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Documents (Optional but Recommended)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Medical License</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setMedicalLicenseFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {medicalLicenseFile && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PDF, JPG, or PNG (max 5MB)</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Degree Certificate</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setDegreeCertificateFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  {degreeCertificateFile && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PDF, JPG, or PNG (max 5MB)</p>
              </div>
            </div>
          </div>
        </div>
 
         <div className="flex justify-end pt-4 border-t">
           <Button type="submit" disabled={isSubmitting} variant="hero">
             {isSubmitting ? (
               <>
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 Submitting...
               </>
             ) : (
               <>
                 <Upload className="w-4 h-4 mr-2" />
                 Submit Application
               </>
             )}
           </Button>
         </div>
       </form>
     </Form>
   );
 }