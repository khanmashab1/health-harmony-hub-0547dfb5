import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Calendar, 
  Activity,
  Shield,
  UserCog,
  Stethoscope
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import medicareLogo from "@/assets/medicare-logo.png";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { logoUrl, siteName } = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getDashboardLink = () => {
    if (!profile) return "/profile";
    const routes: Record<string, string> = {
      patient: "/profile",
      doctor: "/doctor",
      pa: "/pa",
      admin: "/admin",
    };
    return routes[profile.role] || "/profile";
  };

  const getDashboardIcon = () => {
    if (!profile) return User;
    const icons: Record<string, typeof User> = {
      patient: User,
      doctor: Stethoscope,
      pa: UserCog,
      admin: Shield,
    };
    return icons[profile.role] || User;
  };

  const DashboardIcon = getDashboardIcon();

  const isActiveLink = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border/40 bg-header text-header-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src={logoUrl || medicareLogo} 
                alt={`${siteName} Logo`} 
                className={`object-contain group-hover:scale-105 transition-transform ${
                  logoUrl ? 'h-[50px] sm:h-[60px] max-w-[280px]' : 'w-12 h-12'
                }`}
              />
            </div>
            {/* Only show text if no custom logo is uploaded */}
            {!logoUrl && (
              <span className="text-xl font-bold text-foreground">
                {siteName}
              </span>
            )}
          </Link>

          {/* Desktop Nav - Center */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/booking">
              <button
                className={`nav-pill ${isActiveLink('/booking') ? 'active' : ''}`}
              >
                <Calendar className="w-4 h-4" />
                Book Appointment
              </button>
            </Link>
            <Link to="/symptoms">
              <button
                className={`nav-pill ${isActiveLink('/symptoms') ? 'active' : ''}`}
              >
                <Activity className="w-4 h-4" />
                Symptoms Checker
              </button>
            </Link>
          </nav>

          {/* Desktop Actions - Right */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <Link to={getDashboardLink()}>
                  <Button variant="ghost" className="gap-2">
                    <DashboardIcon className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button variant="outline-muted" onClick={handleSignOut} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button variant="hero">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Pills */}
        <div className="md:hidden pb-3 flex gap-2 overflow-x-auto">
          <Link to="/booking">
            <button
              className={`nav-pill whitespace-nowrap text-xs ${isActiveLink('/booking') ? 'active' : ''}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Book Appointment
            </button>
          </Link>
          <Link to="/symptoms">
            <button
              className={`nav-pill whitespace-nowrap text-xs ${isActiveLink('/symptoms') ? 'active' : ''}`}
            >
              <Activity className="w-3.5 h-3.5" />
              Symptoms Checker
            </button>
          </Link>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/40 bg-background"
          >
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {user ? (
                <>
                  <Link to={getDashboardLink()} onClick={() => setIsMenuOpen(false)}>
                    <Button variant="secondary" className="w-full justify-start gap-2">
                      <DashboardIcon className="w-4 h-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    className="w-full justify-start gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth?mode=signup" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="hero" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
