 import { useState } from "react";
 import { format, differenceInYears } from "date-fns";
 import {
   Eye,
   Check,
   X,
   FileText,
   Download,
   Loader2,
   Mail,
   Phone,
   MapPin,
   Stethoscope,
   GraduationCap,
   Clock,
   DollarSign,
   Calendar,
   User,
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Skeleton } from "@/components/ui/skeleton";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 interface DoctorApplication {
   id: string;
   full_name: string;
   email: string;
   phone: string;
   date_of_birth: string | null;
   gender: string | null;
   city: string | null;
   province: string | null;
   specialty: string;
   degree: string;
   qualifications: string | null;
   experience_years: number;
   consultation_fee: number;
   bio: string | null;
   medical_license_path: string | null;
   degree_certificate_path: string | null;
   status: string;
   admin_notes: string | null;
   created_at: string;
 }
 
 export function DoctorApplicationsPanel() {
   const queryClient = useQueryClient();
   const [selectedApplication, setSelectedApplication] = useState<DoctorApplication | null>(null);
   const [adminNotes, setAdminNotes] = useState("");
   const [actionDialogOpen, setActionDialogOpen] = useState(false);
   const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
 
   const { data: applications, isLoading } = useQuery({
     queryKey: ["doctor-applications"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("doctor_applications")
         .select("*")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data as DoctorApplication[];
     },
   });
 
   const updateApplication = useMutation({
     mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
       const { error } = await supabase
         .from("doctor_applications")
         .update({
           status,
           admin_notes: notes || null,
           reviewed_at: new Date().toISOString(),
         })
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ["doctor-applications"] });
       toast.success(`Application ${variables.status === "approved" ? "approved" : "rejected"} successfully`);
       setActionDialogOpen(false);
       setSelectedApplication(null);
       setAdminNotes("");
     },
     onError: (error: any) => {
       toast.error(error.message || "Failed to update application");
     },
   });
 
   const getDocumentUrl = async (path: string): Promise<string | null> => {
     const { data } = supabase.storage
       .from("doctor-applications")
       .getPublicUrl(path);
     return data?.publicUrl || null;
   };
 
   const handleAction = (app: DoctorApplication, type: "approve" | "reject") => {
     setSelectedApplication(app);
     setActionType(type);
     setAdminNotes("");
     setActionDialogOpen(true);
   };
 
   const confirmAction = () => {
     if (!selectedApplication || !actionType) return;
     updateApplication.mutate({
       id: selectedApplication.id,
       status: actionType === "approve" ? "approved" : "rejected",
       notes: adminNotes,
     });
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "pending":
         return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
       case "approved":
         return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
       case "rejected":
         return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   const calculateAge = (dob: string | null): number | null => {
     if (!dob) return null;
     return differenceInYears(new Date(), new Date(dob));
   };
 
   if (isLoading) {
     return (
       <div className="space-y-4">
         {[1, 2, 3].map((i) => (
           <Skeleton key={i} className="h-32 w-full" />
         ))}
       </div>
     );
   }
 
   const pendingCount = applications?.filter((a) => a.status === "pending").length || 0;
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h3 className="text-lg font-semibold">Doctor Applications</h3>
           <p className="text-sm text-muted-foreground">
             {pendingCount} pending application{pendingCount !== 1 ? "s" : ""} to review
           </p>
         </div>
       </div>
 
       {applications?.length === 0 ? (
         <Card>
           <CardContent className="py-12 text-center">
             <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
             <h3 className="text-lg font-medium mb-2">No Applications Yet</h3>
             <p className="text-muted-foreground">
               Doctor applications will appear here when submitted.
             </p>
           </CardContent>
         </Card>
       ) : (
         <div className="space-y-4">
           {applications?.map((app) => (
             <Card key={app.id} className="hover:shadow-md transition-shadow">
               <CardContent className="p-6">
                 <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                   <div className="flex-1 space-y-3">
                     <div className="flex items-start gap-3">
                       <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                         <User className="w-6 h-6 text-primary" />
                       </div>
                       <div>
                         <h4 className="font-semibold text-lg">{app.full_name}</h4>
                         <p className="text-muted-foreground">{app.specialty}</p>
                       </div>
                       <div className="ml-auto">{getStatusBadge(app.status)}</div>
                     </div>
 
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                       <div className="flex items-center gap-2 text-muted-foreground">
                         <Mail className="w-4 h-4" />
                         <span className="truncate">{app.email}</span>
                       </div>
                       <div className="flex items-center gap-2 text-muted-foreground">
                         <Phone className="w-4 h-4" />
                         <span>{app.phone}</span>
                       </div>
                       <div className="flex items-center gap-2 text-muted-foreground">
                         <MapPin className="w-4 h-4" />
                         <span>{app.city}, {app.province}</span>
                       </div>
                       <div className="flex items-center gap-2 text-muted-foreground">
                         <Calendar className="w-4 h-4" />
                         <span>{format(new Date(app.created_at), "dd MMM yyyy")}</span>
                       </div>
                     </div>
 
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                       <div className="flex items-center gap-2">
                         <GraduationCap className="w-4 h-4 text-primary" />
                         <span>{app.degree}</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <Clock className="w-4 h-4 text-primary" />
                         <span>{app.experience_years} years exp.</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <DollarSign className="w-4 h-4 text-primary" />
                         <span>Rs. {app.consultation_fee}</span>
                       </div>
                       {app.date_of_birth && (
                         <div className="flex items-center gap-2">
                           <User className="w-4 h-4 text-primary" />
                           <span>Age: {calculateAge(app.date_of_birth)} years</span>
                         </div>
                       )}
                     </div>
 
                     {app.bio && (
                       <p className="text-sm text-muted-foreground line-clamp-2">{app.bio}</p>
                     )}
 
                     {/* Documents */}
                     <div className="flex gap-2 flex-wrap">
                       {app.medical_license_path && (
                         <Badge variant="secondary" className="gap-1">
                           <FileText className="w-3 h-3" />
                           License Uploaded
                         </Badge>
                       )}
                       {app.degree_certificate_path && (
                         <Badge variant="secondary" className="gap-1">
                           <FileText className="w-3 h-3" />
                           Degree Uploaded
                         </Badge>
                       )}
                     </div>
                   </div>
 
                   {app.status === "pending" && (
                     <div className="flex gap-2">
                       <Button
                         size="sm"
                         variant="outline"
                         className="text-green-600 hover:bg-green-50 hover:text-green-700"
                         onClick={() => handleAction(app, "approve")}
                       >
                         <Check className="w-4 h-4 mr-1" />
                         Approve
                       </Button>
                       <Button
                         size="sm"
                         variant="outline"
                         className="text-red-600 hover:bg-red-50 hover:text-red-700"
                         onClick={() => handleAction(app, "reject")}
                       >
                         <X className="w-4 h-4 mr-1" />
                         Reject
                       </Button>
                     </div>
                   )}
                 </div>
 
                 {app.admin_notes && (
                   <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                     <p className="text-sm font-medium mb-1">Admin Notes:</p>
                     <p className="text-sm text-muted-foreground">{app.admin_notes}</p>
                   </div>
                 )}
               </CardContent>
             </Card>
           ))}
         </div>
       )}
 
       {/* Action Confirmation Dialog */}
       <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>
               {actionType === "approve" ? "Approve" : "Reject"} Application
             </DialogTitle>
             <DialogDescription>
               {actionType === "approve"
                 ? `Are you sure you want to approve ${selectedApplication?.full_name}'s application?`
                 : `Are you sure you want to reject ${selectedApplication?.full_name}'s application?`}
             </DialogDescription>
           </DialogHeader>
 
           <div className="space-y-4">
             <div>
               <label className="text-sm font-medium">Admin Notes (optional)</label>
               <Textarea
                 placeholder={
                   actionType === "approve"
                     ? "Welcome message or next steps..."
                     : "Reason for rejection..."
                 }
                 value={adminNotes}
                 onChange={(e) => setAdminNotes(e.target.value)}
                 className="mt-1"
               />
             </div>
           </div>
 
           <DialogFooter>
             <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
               Cancel
             </Button>
             <Button
               onClick={confirmAction}
               disabled={updateApplication.isPending}
               variant={actionType === "approve" ? "default" : "destructive"}
             >
               {updateApplication.isPending ? (
                 <>
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   Processing...
                 </>
               ) : (
                 <>
                   {actionType === "approve" ? (
                     <>
                       <Check className="w-4 h-4 mr-2" />
                       Approve
                     </>
                   ) : (
                     <>
                       <X className="w-4 h-4 mr-2" />
                       Reject
                     </>
                   )}
                 </>
               )}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }