import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SEOHead
        title={t("notFound.title")}
        description="The page you're looking for doesn't exist. Return to MediCare+ homepage."
        noindex={true}
      />
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
        <p className="mb-2 text-2xl font-semibold text-foreground">{t("notFound.title")}</p>
        <p className="mb-6 text-muted-foreground max-w-md mx-auto">
          {t("notFound.description")}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild>
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              {t("notFound.goHome")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/our-doctors">{t("notFound.findDoctor")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/symptoms">{t("notFound.checkSymptoms")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
