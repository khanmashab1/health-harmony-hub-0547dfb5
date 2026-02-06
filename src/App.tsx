import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PasswordChangeDialog } from "@/components/auth/PasswordChangeDialog";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Booking from "./pages/Booking";
import TokenPrint from "./pages/TokenPrint";
import PrescriptionPrint from "./pages/PrescriptionPrint";
import PrescriptionVerify from "./pages/PrescriptionVerify";
import MedicalHistoryPrint from "./pages/MedicalHistoryPrint";
import LabTestsPrint from "./pages/LabTestsPrint";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import PADashboard from "./pages/PADashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSymptomChecker from "./pages/AdminSymptomChecker";
import AdminEmailTemplates from "./pages/AdminEmailTemplates";
import AdminReviews from "./pages/AdminReviews";
import SymptomsChecker from "./pages/SymptomsChecker";
import Reviews from "./pages/Reviews";
import DoctorProfile from "./pages/DoctorProfile";
import NotFound from "./pages/NotFound";
import BecomeDoctor from "./pages/BecomeDoctor";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import OurDoctors from "./pages/OurDoctors";

const queryClient = new QueryClient();

function PasswordChangeWrapper({ children }: { children: React.ReactNode }) {
  const { requiresPasswordChange, setRequiresPasswordChange, user } = useAuth();
  
  if (!user) return <>{children}</>;
  
  return (
    <>
      {children}
      <PasswordChangeDialog
        open={requiresPasswordChange}
        onComplete={() => setRequiresPasswordChange(false)}
      />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <PasswordChangeWrapper>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/doctor/:doctorId" element={<DoctorProfile />} />
                <Route path="/profile" element={<PatientDashboard />} />
                <Route path="/doctor" element={<DoctorDashboard />} />
                <Route path="/pa" element={<PADashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/symptom-checker" element={<AdminSymptomChecker />} />
                <Route path="/admin/email-templates" element={<AdminEmailTemplates />} />
                <Route path="/admin/reviews" element={<AdminReviews />} />
                <Route path="/symptoms" element={<SymptomsChecker />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/become-doctor" element={<BecomeDoctor />} />
                <Route path="/our-doctors" element={<OurDoctors />} />
                <Route path="/organization" element={<OrganizationDashboard />} />
                <Route path="/token/:appointmentId" element={<TokenPrint />} />
                <Route path="/prescription/:appointmentId" element={<PrescriptionPrint />} />
                <Route path="/verify/:appointmentId" element={<PrescriptionVerify />} />
                <Route path="/lab-tests/:appointmentId" element={<LabTestsPrint />} />
                <Route path="/print/history" element={<MedicalHistoryPrint />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PasswordChangeWrapper>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;