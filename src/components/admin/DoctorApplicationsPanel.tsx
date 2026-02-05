import { useState, useEffect } from "react";
 import { format, differenceInYears } from "date-fns";
 import {
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
  Eye,
  ExternalLink,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewApplication, setViewApplication] = useState<DoctorApplication | null>(null);
  const [documentUrls, setDocumentUrls] = useState<{ license: string | null; degree: string | null }>({ license: null, degree: null });
 
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
 
  // Fetch document URLs when viewing an application
  useEffect(() => {
    const fetchDocUrls = async () => {
      if (!viewApplication) {
        setDocumentUrls({ license: null, degree: null });
        return;
      }
      
      let licenseUrl = null;
      let degreeUrl = null;
      
      if (viewApplication.medical_license_path) {
        const { data } = await supabase.storage
          .from("doctor-applications")
          .createSignedUrl(viewApplication.medical_license_path, 3600);
        licenseUrl = data?.signedUrl || null;
      }
      
      if (viewApplication.degree_certificate_path) {
        const { data } = await supabase.storage
          .from("doctor-applications")
          .createSignedUrl(viewApplication.degree_certificate_path, 3600);
        degreeUrl = data?.signedUrl || null;
      }
      
      setDocumentUrls({ license: licenseUrl, degree: degreeUrl });
    };
    
    fetchDocUrls();
  }, [viewApplication]);

  const updateApplication = useMutation({
    mutationFn: async ({ id, status, notes, application }: { id: string; status: string; notes?: string; application?: DoctorApplication }) => {
      // If approving, first create the doctor account
      if (status === "approved" && application) {
        // Check if a user with this email already exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", application.email)
          .maybeSingle();

        // We need to invite the user or create an account for them
        // First, let's check if a profile exists by looking up via email in auth
        // Since we can't directly query auth.users, we'll create the doctor record
        // The user will need to use the same email to register/login
        
        // For now, we'll create a placeholder in doctors table
        // When the user registers with this email, we'll link them
        
        // Actually, let's use an edge function to handle this properly
        const { data: funcData, error: funcError } = await supabase.functions.invoke("approve-doctor-application", {
          body: {
            applicationId: id,
            adminNotes: notes,
          },
        });
        
        if (funcError) throw funcError;
        if (funcData?.error) throw new Error(funcData.error);
        
        return;
      }
      
      // For rejection, just update the status
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
      application: actionType === "approve" ? selectedApplication : undefined,
     });
   };

  const handleViewApplication = (app: DoctorApplication) => {
    setViewApplication(app);
    setViewDialogOpen(true);
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
                        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => handleViewApplication(app)}>
                           <FileText className="w-3 h-3" />
                           License Uploaded
                         </Badge>
                       )}
                       {app.degree_certificate_path && (
                        <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => handleViewApplication(app)}>
                           <FileText className="w-3 h-3" />
                           Degree Uploaded
                         </Badge>
                       )}
                     </div>
                   </div>
 
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewApplication(app)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                    {app.status === "pending" && (
                      <>
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
                      </>
                    )}
                  </div>
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

      {/* View Application Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review all information submitted by {viewApplication?.full_name}
            </DialogDescription>
          </DialogHeader>

          {viewApplication && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Applicant Info</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{viewApplication.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{viewApplication.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{viewApplication.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {viewApplication.date_of_birth 
                        ? format(new Date(viewApplication.date_of_birth), "dd MMM yyyy")
                        : "Not provided"}
                      {viewApplication.date_of_birth && (
                        <span className="text-muted-foreground ml-1">
                          ({calculateAge(viewApplication.date_of_birth)} years old)
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium">{viewApplication.gender || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{viewApplication.city}, {viewApplication.province}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Specialty</p>
                    <p className="font-medium">{viewApplication.specialty}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Degree</p>
                    <p className="font-medium">{viewApplication.degree}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Experience</p>
                    <p className="font-medium">{viewApplication.experience_years} years</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Consultation Fee</p>
                    <p className="font-medium">Rs. {viewApplication.consultation_fee}</p>
                  </div>
                </div>
                
                {viewApplication.qualifications && (
                  <div>
                    <p className="text-sm text-muted-foreground">Qualifications</p>
                    <p className="font-medium">{viewApplication.qualifications}</p>
                  </div>
                )}
                
                {viewApplication.bio && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bio</p>
                    <p className="font-medium">{viewApplication.bio}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Application Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(viewApplication.status)}
                    <span className="text-sm text-muted-foreground">
                      Submitted on {format(new Date(viewApplication.created_at), "dd MMM yyyy 'at' hh:mm a")}
                    </span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Medical License
                    </h4>
                    {viewApplication.medical_license_path ? (
                      <div className="space-y-2">
                        {documentUrls.license ? (
                          <>
                            {viewApplication.medical_license_path.match(/\.(jpg|jpeg|png)$/i) ? (
                              <img 
                                src={documentUrls.license} 
                                alt="Medical License" 
                                className="max-w-full max-h-96 rounded border"
                              />
                            ) : (
                              <div className="bg-muted p-4 rounded text-center">
                                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">PDF Document</p>
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(documentUrls.license!, "_blank")}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open in New Tab
                            </Button>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Loading document...</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No license document uploaded</p>
                    )}
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Degree Certificate
                    </h4>
                    {viewApplication.degree_certificate_path ? (
                      <div className="space-y-2">
                        {documentUrls.degree ? (
                          <>
                            {viewApplication.degree_certificate_path.match(/\.(jpg|jpeg|png)$/i) ? (
                              <img 
                                src={documentUrls.degree} 
                                alt="Degree Certificate" 
                                className="max-w-full max-h-96 rounded border"
                              />
                            ) : (
                              <div className="bg-muted p-4 rounded text-center">
                                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">PDF Document</p>
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(documentUrls.degree!, "_blank")}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open in New Tab
                            </Button>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Loading document...</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No degree certificate uploaded</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            {viewApplication?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="text-green-600 hover:bg-green-50"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleAction(viewApplication, "approve");
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleAction(viewApplication, "reject");
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
     </div>
   );
 }