import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SplashScreen } from "@/components/SplashScreen";
import { PasswordChangeDialog } from "@/components/auth/PasswordChangeDialog";
import { SessionTimeoutWarning } from "@/components/session/SessionTimeoutWarning";
import { GeoBlock } from "@/components/GeoBlock";
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
import OnlineDoctorAppointmentSystem from "./pages/seo/OnlineDoctorAppointmentSystem";
import ClinicManagementSoftware from "./pages/seo/ClinicManagementSoftware";
import HospitalManagementSoftware from "./pages/seo/HospitalManagementSoftware";
import AISymptomChecker from "./pages/seo/AISymptomChecker";
import RiskEvaluator from "./pages/RiskEvaluator";
import AIHealth from "./pages/AIHealth";
import DietPlanner from "./pages/DietPlanner";
import AIDietPlanner from "./pages/seo/AIDietPlanner";
import AIHealthRiskEvaluator from "./pages/seo/AIHealthRiskEvaluator";
import PharmacyDashboard from "./pages/PharmacyDashboard";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

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
      <LanguageProvider>
        <TooltipProvider>
          <GeoBlock>
          <BrowserRouter>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <SessionTimeoutWarning />
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
                  <Route path="/online-doctor-appointment-system" element={<OnlineDoctorAppointmentSystem />} />
                  <Route path="/clinic-management-software" element={<ClinicManagementSoftware />} />
                  <Route path="/hospital-management-software" element={<HospitalManagementSoftware />} />
                  <Route path="/ai-symptom-checker" element={<AISymptomChecker />} />
                  <Route path="/ai-health" element={<AIHealth />} />
                  <Route path="/diet-planner" element={<DietPlanner />} />
                  <Route path="/ai-diet-planner" element={<AIDietPlanner />} />
                  <Route path="/ai-health-risk-evaluator" element={<AIHealthRiskEvaluator />} />
                  <Route path="/risk-evaluator" element={<RiskEvaluator />} />
                  <Route path="/pharmacy" element={<PharmacyDashboard />} />
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
          </GeoBlock>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;