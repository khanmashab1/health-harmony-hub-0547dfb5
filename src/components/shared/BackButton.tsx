import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Main/top-level pages where the back button should NOT appear
const mainPages = new Set([
  "/", "/auth", "/booking", "/profile", "/doctor", "/pa", "/admin",
  "/symptoms", "/reviews", "/become-doctor", "/our-doctors", "/organization",
  "/online-doctor-appointment-system", "/clinic-management-software",
  "/hospital-management-software", "/ai-symptom-checker", "/ai-health",
  "/diet-planner", "/risk-evaluator", "/patient"
]);

export function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Only show on subpages (e.g. /doctor/:id, /admin/reviews, /token/:id, etc.)
  if (mainPages.has(location.pathname)) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate(-1)}
      className="fixed top-[80px] left-3 z-40 h-9 w-9 sm:h-10 sm:w-auto sm:px-3 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-md transition-all"
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline text-sm ml-1">Back</span>
    </Button>
  );
}
