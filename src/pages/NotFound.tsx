import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SEOHead
        title="Page Not Found"
        description="The page you're looking for doesn't exist. Return to MediCare+ homepage."
        noindex={true}
      />
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
        <p className="mb-2 text-2xl font-semibold text-foreground">Page Not Found</p>
        <p className="mb-6 text-muted-foreground max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Try navigating back to our homepage.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild>
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Go to Homepage
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/our-doctors">Find a Doctor</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/symptoms">Check Symptoms</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;