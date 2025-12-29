import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, 
  X, 
  Stethoscope, 
  User, 
  LogOut, 
  Calendar, 
  Activity,
  Shield,
  UserCog
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg group-hover:shadow-primary/30 transition-shadow">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-transparent rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:block">
              MediCare+
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            <Link to="/booking">
              <Button variant="ghost" className="gap-2">
                <Calendar className="w-4 h-4" />
                Book Appointment
              </Button>
            </Link>
            <Link to="/symptoms">
              <Button variant="ghost" className="gap-2">
                <Activity className="w-4 h-4" />
                Symptoms Checker
              </Button>
            </Link>

            {user ? (
              <>
                <Link to={getDashboardLink()}>
                  <Button variant="secondary" className="gap-2">
                    <DashboardIcon className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button variant="outline" onClick={handleSignOut} className="gap-2">
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
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
          >
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
              <Link to="/booking" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Calendar className="w-4 h-4" />
                  Book Appointment
                </Button>
              </Link>
              <Link to="/symptoms" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Activity className="w-4 h-4" />
                  Symptoms Checker
                </Button>
              </Link>

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
