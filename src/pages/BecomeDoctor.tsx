 import { useState } from "react";
 import { motion } from "framer-motion";
 import { Stethoscope, CheckCircle, FileText, Award, Clock, Users, ArrowRight } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Label } from "@/components/ui/label";
 import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Layout } from "@/components/layout/Layout";
 import { DoctorApplicationForm } from "@/components/doctor/DoctorApplicationForm";
 import { useAuth } from "@/hooks/useAuth";
 import { useNavigate } from "react-router-dom";
 
 export default function BecomeDoctor() {
   const [acceptedTerms, setAcceptedTerms] = useState(false);
   const [formOpen, setFormOpen] = useState(false);
   const { user } = useAuth();
   const navigate = useNavigate();
 
   const benefits = [
     {
       icon: Users,
       title: "Reach More Patients",
       description: "Connect with patients actively seeking healthcare professionals in your specialty.",
     },
     {
       icon: Clock,
       title: "Flexible Schedule",
       description: "Set your own availability and manage appointments on your terms.",
     },
     {
       icon: Award,
       title: "Build Your Reputation",
       description: "Collect reviews and ratings to establish trust with potential patients.",
     },
     {
       icon: FileText,
       title: "Digital Prescriptions",
       description: "Issue digital prescriptions with QR code verification for authenticity.",
     },
   ];
 
   const requirements = [
     "Valid medical degree (MBBS, BDS, or equivalent)",
     "Current medical license from Pakistan Medical Commission (PMC)",
     "Minimum 1 year of clinical experience",
     "Professional liability insurance (recommended)",
     "Clean professional record with no disciplinary actions",
   ];
 
   const handleApplyClick = () => {
     if (!user) {
       navigate("/auth?mode=signup&redirect=/become-doctor");
       return;
     }
     setFormOpen(true);
   };
 
   return (
     <Layout>
       <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
         {/* Hero Section */}
         <section className="container mx-auto px-4 py-16 md:py-24">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-center max-w-3xl mx-auto"
           >
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
               <Stethoscope className="w-5 h-5" />
               <span className="font-medium">Join Our Medical Network</span>
             </div>
             <h1 className="text-4xl md:text-5xl font-bold mb-6">
               Become a Doctor on <span className="text-primary">MediCare+</span>
             </h1>
             <p className="text-xl text-muted-foreground mb-8">
               Join Pakistan's growing network of healthcare professionals. Expand your practice,
               reach more patients, and provide quality care through our platform.
             </p>
           </motion.div>
         </section>
 
         {/* Benefits Section */}
         <section className="container mx-auto px-4 pb-16">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
           >
             <h2 className="text-2xl font-bold text-center mb-8">Why Join MediCare+?</h2>
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
               {benefits.map((benefit, index) => (
                 <motion.div
                   key={benefit.title}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.1 + index * 0.05 }}
                 >
                   <Card className="h-full hover:shadow-lg transition-shadow">
                     <CardHeader>
                       <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                         <benefit.icon className="w-6 h-6 text-primary" />
                       </div>
                       <CardTitle className="text-lg">{benefit.title}</CardTitle>
                     </CardHeader>
                     <CardContent>
                       <p className="text-muted-foreground">{benefit.description}</p>
                     </CardContent>
                   </Card>
                 </motion.div>
               ))}
             </div>
           </motion.div>
         </section>
 
         {/* Requirements Section */}
         <section className="container mx-auto px-4 pb-16">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
           >
             <Card className="max-w-2xl mx-auto">
               <CardHeader>
                 <CardTitle>Eligibility Requirements</CardTitle>
                 <CardDescription>
                   To join our platform, you must meet the following criteria:
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <ul className="space-y-3">
                   {requirements.map((req, index) => (
                     <li key={index} className="flex items-start gap-3">
                       <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                       <span>{req}</span>
                     </li>
                   ))}
                 </ul>
               </CardContent>
             </Card>
           </motion.div>
         </section>
 
         {/* Terms and Apply Section */}
         <section className="container mx-auto px-4 pb-16">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
           >
             <Card className="max-w-2xl mx-auto">
               <CardHeader>
                 <CardTitle>Terms & Conditions</CardTitle>
                 <CardDescription>
                   Please review and accept our terms before applying
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-6">
                 <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                   <div className="space-y-4 text-sm text-muted-foreground">
                     <h4 className="font-semibold text-foreground">1. Professional Standards</h4>
                     <p>
                       By joining MediCare+, you agree to maintain the highest standards of
                       medical professionalism. You must provide accurate information about your
                       qualifications, experience, and credentials.
                     </p>
 
                     <h4 className="font-semibold text-foreground">2. Patient Care</h4>
                     <p>
                       You commit to providing quality healthcare services to all patients without
                       discrimination. Patient safety and well-being must be your primary concern.
                     </p>
 
                     <h4 className="font-semibold text-foreground">3. Confidentiality</h4>
                     <p>
                       You agree to maintain strict confidentiality of all patient information in
                       accordance with medical ethics and applicable laws.
                     </p>
 
                     <h4 className="font-semibold text-foreground">4. Platform Usage</h4>
                     <p>
                       You will use the platform responsibly and not engage in any activity that
                       could harm the platform, other users, or patients.
                     </p>
 
                     <h4 className="font-semibold text-foreground">5. Verification</h4>
                     <p>
                       Your application will be reviewed by our team. We reserve the right to
                       verify your credentials and reject applications that do not meet our
                       standards.
                     </p>
 
                     <h4 className="font-semibold text-foreground">6. Fees and Payments</h4>
                     <p>
                       Consultation fees are set by you. The platform may charge a service fee
                       for facilitating appointments. Payment terms will be communicated separately.
                     </p>
 
                     <h4 className="font-semibold text-foreground">7. Termination</h4>
                     <p>
                       Either party may terminate this agreement with appropriate notice. The
                       platform reserves the right to suspend or terminate accounts that violate
                       these terms.
                     </p>
                   </div>
                 </ScrollArea>
 
                 <div className="flex items-start gap-3">
                   <Checkbox
                     id="terms"
                     checked={acceptedTerms}
                     onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                   />
                   <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                     I have read and agree to the Terms & Conditions. I confirm that all
                     information I provide will be accurate and truthful.
                   </Label>
                 </div>
 
                 <Dialog open={formOpen} onOpenChange={setFormOpen}>
                   <DialogTrigger asChild>
                     <Button
                       size="lg"
                       variant="hero"
                       className="w-full"
                       disabled={!acceptedTerms}
                       onClick={handleApplyClick}
                     >
                       <Stethoscope className="w-5 h-5 mr-2" />
                       Apply to Become a Doctor
                       <ArrowRight className="w-5 h-5 ml-2" />
                     </Button>
                   </DialogTrigger>
                   <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                     <DoctorApplicationForm onSuccess={() => setFormOpen(false)} />
                   </DialogContent>
                 </Dialog>
               </CardContent>
             </Card>
           </motion.div>
         </section>
       </div>
     </Layout>
   );
 }