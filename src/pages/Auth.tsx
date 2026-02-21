import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Stethoscope, Mail, Lock, User, ArrowLeft, Loader2, ArrowRight, CheckCircle2, Eye, EyeOff, Circle, CheckCircle } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/useLanguage";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character (!@#$%^&*)");

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address").max(255),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const resetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const newPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type ResetFormData = z.infer<typeof resetSchema>;
type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

type AuthMode = "login" | "signup" | "reset" | "new-password";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "signup") return "signup";
    if (modeParam === "reset") return "reset";
    return "login";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const { signIn, signUp, user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { logoUrl, siteName } = useSiteSettings();

  // Helper to switch modes and reset all form state
  const switchMode = (newMode: AuthMode) => {
    setIsLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    loginForm.reset();
    signupForm.reset();
    resetForm.reset();
    newPasswordForm.reset();
    setMode(newMode);
  };

  // Handle email confirmation and password recovery tokens from URL hash
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    const accessToken = hashParams.get("access_token");
    
    if (type === "recovery" && accessToken) {
      setMode("new-password");
    } else if (type === "signup" && accessToken) {
      // Email verification link clicked — set the session with the token first,
      // then sign out so user lands on login form with a success message
      const refreshToken = hashParams.get("refresh_token");
      if (refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(() => {
          return supabase.auth.signOut();
        }).then(() => {
          setEmailVerified(true);
          setMode("login");
          window.history.replaceState(null, "", window.location.pathname + "?mode=login");
        });
      } else {
        supabase.auth.signOut().then(() => {
          setEmailVerified(true);
          setMode("login");
          window.history.replaceState(null, "", window.location.pathname + "?mode=login");
        });
      }
    }
  }, []);

  useEffect(() => {
    // Only redirect authenticated users if they're NOT in new-password mode
    if (user && profile && mode !== "new-password") {
      // Honor ?redirect= param if present
      const redirectParam = searchParams.get("redirect");
      if (redirectParam) {
        navigate(decodeURIComponent(redirectParam));
        return;
      }
      const redirectMap: Record<string, string> = {
        patient: "/profile",
        doctor: "/doctor",
        pa: "/pa",
        admin: "/admin",
        pharmacy: "/pharmacy",
      };
      navigate(redirectMap[profile.role] || "/profile");
    }
  }, [user, profile, navigate, mode, searchParams]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const newPasswordForm = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const clearSessionAndRetry = async () => {
    localStorage.removeItem("sb-zikbiesawrowlkhvrbmz-auth-token");
    sessionStorage.clear();
    await supabase.auth.signOut();
    setLoginError(false);
    loginForm.reset();
    toast({ title: "Session cleared", description: "You can now try logging in again." });
  };

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError(false);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      setLoginError(true);
      let message = error.message;
      if (message.includes("Invalid login credentials") || message.includes("invalid_grant") || message.includes("Invalid API")) {
        // Check if user exists in profiles by looking up via a sign-in attempt result
        // Supabase returns the same error for wrong password and non-existent user
        // We can check profiles table to distinguish
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);
        
        // Since we can't query by email in profiles (no email column), 
        // show a clear message that covers both cases
        message = "Account not found or password is incorrect. Please check your email and password, or create a new account.";
      } else if (message.includes("Email not confirmed")) {
        try {
          await supabase.auth.resend({
            type: 'signup',
            email: data.email,
            options: { emailRedirectTo: "https://medicareplus.app/auth" },
          });
          message = "Your email is not verified. We've sent a new verification link to your inbox.";
        } catch (resendError) {
          message = "Please verify your email before logging in. Check your inbox for the verification link.";
        }
      }
      toast({ variant: "destructive", title: "Login failed", description: message });
    } else {
      setLoginError(false);
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
    }
  };

  const onSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.name);
    setIsLoading(false);

    if (error) {
      let message = error.message;
      if (message.includes("already registered")) {
        message = "This email is already registered. Please sign in instead.";
      }
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: message,
      });
    } else {
      // Show success message and switch to login mode
      setSignupSuccess(true);
      switchMode("login");
    }
  };

  const onResetPassword = async (data: ResetFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-password-reset", {
        body: {
          email: data.email,
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "If this email exists, a password reset link has been sent.",
      });
      switchMode("login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error.message || "Failed to send reset email. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onNewPassword = async (data: NewPasswordFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      toast({
        title: "Password reset successfully!",
        description: "You can now log in with your new password.",
      });
      
      // Sign out to force re-login with new password
      await supabase.auth.signOut();
      
      // Clear the hash from URL
      window.history.replaceState(null, "", window.location.pathname);
      
      switchMode("login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description: error.message || "Failed to reset password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <SEOHead
        title={mode === "signup" ? "Create Account" : mode === "reset" ? "Reset Password" : "Sign In"}
        description="Sign in or create an account on MediCare+ to book doctor appointments, access your medical records, and manage your health."
        noindex={true}
      />
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-brand items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative elements - pointer-events-none to not block input */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full border-2 border-white/30" />
          <div className="absolute bottom-40 left-10 w-40 h-40 rounded-full border border-white/20" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="text-white max-w-md relative z-10"
        >
          <Link to="/" className="flex items-center gap-3 mb-8">
            {logoUrl && <img src={logoUrl} alt={`${siteName} Logo`} className="h-12 w-auto object-contain" />}
            <span className="text-2xl font-bold italic" style={{ fontFamily: "'Alegreya', serif" }}>{siteName}</span>
          </Link>
          
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            {t("auth.healthJourney")}
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            {t("auth.healthDescription")}
          </p>

          <div className="mt-12 space-y-4">
            {[
              t("auth.feature1"),
              t("auth.feature2"),
              t("auth.feature3"),
              t("auth.feature4"),
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  ✓
                </div>
                <span className="text-white/90">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("auth.backToHome")}
          </Link>

          <Card variant="elevated" className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="lg:hidden flex flex-col items-center mb-4 gap-1">
                {logoUrl && <img src={logoUrl} alt={`${siteName} Logo`} className="h-12 w-auto object-contain" />}
                <span className="text-lg tracking-tight italic" style={{ fontFamily: "'Alegreya', serif" }}>
                  <span className="text-blue-600 dark:text-blue-400">{siteName?.replace(/\+/g, '').trim()}</span>
                  {siteName?.includes('+') && (
                    <span className="text-teal-500 dark:text-teal-400 font-extrabold">
                      {siteName.match(/\++/)?.[0] || ''}
                    </span>
                  )}
                </span>
              </div>
              <CardTitle className="text-2xl font-bold">
                {mode === "signup" 
                  ? t("auth.createAccount")
                  : mode === "reset" 
                  ? t("auth.resetPassword")
                  : mode === "new-password"
                  ? t("auth.setNewPassword")
                  : t("auth.welcomeBack")}
              </CardTitle>
              <CardDescription className="text-base">
                {mode === "signup"
                  ? t("auth.signUpDescription")
                  : mode === "reset"
                  ? t("auth.resetPassword")
                  : mode === "new-password"
                  ? t("auth.setNewPassword")
                  : t("auth.signInDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Email Verified Success Alert */}
              {emailVerified && mode === "login" && (
                <Alert className="mb-6 border-green-500/50 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Email verified! Please sign in.
                  </AlertDescription>
                </Alert>
              )}

              {/* Signup Success Alert */}
              {signupSuccess && mode === "login" && (
                <Alert className="mb-6 border-green-500/50 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    {t("auth.accountCreated")} {t("auth.verifyEmail")}
                    <br />
                    <span className="text-sm font-medium">If you don't see the email, please check your Spam/Junk folder.</span>
                  </AlertDescription>
                </Alert>
              )}
              
              {mode === "signup" ? (
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.fullName")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <Input placeholder="John Doe" className="pl-10 h-12" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.email")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <Input placeholder="you@example.com" className="pl-10 h-12" autoComplete="email" value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => {
                        const val = field.value || "";
                        const checks = [
                          { label: "At least 8 characters", met: val.length >= 8 },
                          { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(val) },
                          { label: "One lowercase letter (a-z)", met: /[a-z]/.test(val) },
                          { label: "One number (0-9)", met: /[0-9]/.test(val) },
                          { label: "One special character (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(val) },
                        ];
                        return (
                          <FormItem>
                            <FormLabel>{t("auth.password")}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input 
                                  type={showPassword ? "text" : "password"} 
                                  placeholder="••••••••" 
                                  className="pl-10 pr-10 h-12" 
                                  autoComplete="new-password"
                                  value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </FormControl>
                            {val.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {checks.map((check) => (
                                  <div key={check.label} className="flex items-center gap-2 text-xs">
                                    {check.met ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                    ) : (
                                      <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    )}
                                    <span className={check.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                                      {check.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={signupForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.confirmPassword")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <Input 
                                type={showConfirmPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                className="pl-10 pr-10 h-12" 
                                {...field} 
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" variant="hero" className="w-full h-12 text-base" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("auth.creatingAccount")}
                        </>
                      ) : (
                        t("auth.createAccount")
                      )}
                    </Button>
                  </form>
                </Form>
              ) : mode === "reset" ? (
                <Form {...resetForm}>
                  <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                    <FormField
                      control={resetForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.email")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-0" />
                              <Input 
                                type="email"
                                placeholder="you@example.com" 
                                className="pl-10 h-12 relative z-10" 
                                autoComplete="email"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" variant="hero" className="w-full h-12 text-base" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("auth.sendResetLink")}...
                        </>
                      ) : (
                        <>
                          {t("auth.sendResetLink")}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              ) : mode === "new-password" ? (
                <Form {...newPasswordForm}>
                  <form onSubmit={newPasswordForm.handleSubmit(onNewPassword)} className="space-y-4">
                    <FormField
                      control={newPasswordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.newPassword")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                className="pl-10 pr-10 h-12" 
                                {...field} 
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newPasswordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.confirmPassword")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <Input 
                                type={showConfirmPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                className="pl-10 pr-10 h-12" 
                                {...field} 
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" variant="hero" className="w-full h-12 text-base" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("auth.resetPassword")}...
                        </>
                      ) : (
                        t("auth.resetPassword")
                      )}
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.email")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <Input placeholder="you@example.com" className="pl-10 h-12" autoComplete="email" value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                           <div className="flex items-center justify-between">
                            <FormLabel>{t("auth.password")}</FormLabel>
                            <button
                              type="button"
                              onClick={() => switchMode("reset")}
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              {t("auth.forgotPassword")}
                            </button>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                className="pl-10 pr-10 h-12" 
                                autoComplete="current-password"
                                value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" variant="hero" className="w-full h-12 text-base" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("auth.signingIn")}
                        </>
                      ) : (
                        t("auth.signIn")
                      )}
                    </Button>
                    {loginError && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full h-10 text-sm mt-2" 
                        onClick={clearSessionAndRetry}
                      >
                        Clear Session & Try Again
                      </Button>
                    )}
                  </form>
                </Form>
              )}

              <div className="mt-6 text-center text-sm">
                {mode === "signup" ? (
                  <p className="text-muted-foreground">
                    {t("auth.haveAccount")}{" "}
                    <button
                      onClick={() => switchMode("login")}
                      className="text-primary hover:underline font-medium"
                    >
                      {t("auth.signIn")}
                    </button>
                  </p>
                ) : mode === "reset" ? (
                  <p className="text-muted-foreground">
                    {t("auth.haveAccount")}{" "}
                    <button
                      onClick={() => switchMode("login")}
                      className="text-primary hover:underline font-medium"
                    >
                      {t("auth.signIn")}
                    </button>
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    {t("auth.noAccount")}{" "}
                    <button
                      onClick={() => switchMode("signup")}
                      className="text-primary hover:underline font-medium"
                    >
                      {t("auth.signUp")}
                    </button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
