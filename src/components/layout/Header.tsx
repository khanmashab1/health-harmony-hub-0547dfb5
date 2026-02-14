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
  Stethoscope,
  Users,
  HeartPulse
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useLanguage } from "@/hooks/useLanguage";


export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { logoUrl, siteName } = useSiteSettings();
  const { t } = useLanguage();
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

  const navItems = [
    { to: "/our-doctors", icon: Users, label: t("nav.ourDoctors") },
    { to: "/booking", icon: Calendar, label: t("nav.bookAppointment") },
    { to: "/symptoms", icon: Activity, label: t("nav.symptomsChecker") },
    { to: "/risk-evaluator", icon: HeartPulse, label: t("nav.aiHealthRiskChecker") },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border/40 bg-header text-header-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 group py-2">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt={`${siteName} Logo`} 
                className="h-10 sm:h-12 md:h-14 w-auto object-contain group-hover:scale-105 transition-transform"
              />
            )}
            <div className="flex flex-col leading-none">
              <span className="text-lg sm:text-xl tracking-tight whitespace-nowrap italic" style={{ fontFamily: "'Alegreya', serif" }}>
                <span className="text-blue-600 dark:text-blue-400">{siteName?.replace(/\+/g, '').trim()}</span>
                {siteName?.includes('+') && (
                  <span className="text-teal-500 dark:text-teal-400 font-extrabold ml-0.5">
                    {siteName.match(/\++/)?.[0] || ''}
                  </span>
                )}
              </span>
              <span className="text-[9px] sm:text-[10px] tracking-widest uppercase text-muted-foreground font-medium mt-0.5">
                effortless care, delivered
              </span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={location.pathname === item.to ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1.5 text-sm"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right side: Desktop auth + toggles, Mobile hamburger */}
          <div className="flex items-center gap-1">
            {/* Desktop-only auth & toggles */}
            <div className="hidden md:flex items-center gap-1">
              <ThemeToggle />
              <LanguageToggle />
              {user ? (
                <>
                  <Link to={getDashboardLink()}>
                    <Button variant="secondary" size="sm" className="gap-1.5">
                      <DashboardIcon className="w-4 h-4" />
                      {t("nav.dashboard")}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="outline" size="sm">{t("nav.signIn")}</Button>
                  </Link>
                  <Link to="/auth?mode=signup">
                    <Button variant="hero" size="sm">{t("nav.getStarted")}</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile-only: Language + Hamburger */}
            <div className="flex md:hidden items-center gap-1">
              <LanguageToggle />
              <button
                className="p-2 rounded-xl hover:bg-muted transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only Dropdown Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="border-t border-border/40 bg-background overflow-hidden"
          >
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navItems.map((item, i) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.25, ease: "easeOut" }}
                >
                  <Link to={item.to} onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.2 }}
                className="border-t border-border/40 my-2"
              />

              {/* Theme Toggle */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.25, ease: "easeOut" }}
                className="flex items-center gap-2 px-2"
              >
                <ThemeToggle />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.2 }}
                className="border-t border-border/40 my-2"
              />

              {/* Auth Actions */}
              {user ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35, duration: 0.25, ease: "easeOut" }}
                  >
                    <Link to={getDashboardLink()} onClick={() => setIsMenuOpen(false)}>
                      <Button variant="secondary" className="w-full justify-start gap-2">
                        <DashboardIcon className="w-4 h-4" />
                        {t("nav.dashboard")}
                      </Button>
                    </Link>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.25, ease: "easeOut" }}
                  >
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="w-full justify-start gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("nav.signOut")}
                    </Button>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35, duration: 0.25, ease: "easeOut" }}
                  >
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        {t("nav.signIn")}
                      </Button>
                    </Link>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.25, ease: "easeOut" }}
                  >
                    <Link to="/auth?mode=signup" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="hero" className="w-full">
                        {t("nav.getStarted")}
                      </Button>
                    </Link>
                  </motion.div>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
