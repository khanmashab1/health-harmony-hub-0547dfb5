import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type UserRole = "patient" | "doctor" | "pa" | "admin" | "pharmacy";

interface Profile {
  id: string;
  role: UserRole;
  status: string;
  name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  province: string | null;
  city: string | null;
  avatar_path: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  requiresPasswordChange: boolean;
  setRequiresPasswordChange: (value: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      // Send welcome email on first verified login
      if (data && !data.first_login_welcomed) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email_confirmed_at) {
          // User is verified, send welcome email
          supabase.functions.invoke("send-welcome-email", {
            body: {
              userId: data.id,
              email: user.email,
              name: data.name,
            },
          }).catch(err => console.error("Failed to send welcome email:", err));
        }
      }
      
      return data as Profile | null;
    } catch (err) {
      console.error("Error in fetchProfile:", err);
      return null;
    }
  };

  // Function to sync subscription status for doctors
  const syncDoctorSubscription = async () => {
    try {
      await supabase.functions.invoke("check-doctor-subscription");
    } catch (err) {
      console.error("Failed to sync subscription:", err);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check if user requires password change
        if (session?.user?.user_metadata?.requires_password_change) {
          setRequiresPasswordChange(true);
        } else {
          setRequiresPasswordChange(false);
        }
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(async () => {
            const fetchedProfile = await fetchProfile(session.user.id);
            setProfile(fetchedProfile);
            
            // Sync subscription status for doctors on login
            if (fetchedProfile?.role === "doctor" && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
              syncDoctorSubscription();
            }
          }, 0);
          // Mark session as active for security - when tab closes, we'll sign out
          sessionStorage.setItem("session_active", "true");
        } else {
          setProfile(null);
          sessionStorage.removeItem("session_active");
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const fetchedProfile = await fetchProfile(session.user.id);
        setProfile(fetchedProfile);
        // Mark session as active
        sessionStorage.setItem("session_active", "true");
        
        // Sync subscription for doctors on initial load
        if (fetchedProfile?.role === "doctor") {
          syncDoctorSubscription();
        }
      }
      setLoading(false);
    });

    // Security: Check if this is a fresh browser session
    // If there was a previous session but sessionStorage is empty, sign out
    const checkSessionSecurity = async () => {
      const wasActive = sessionStorage.getItem("session_active");
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && !wasActive) {
        // This is a new browser session but old auth exists - sign out for security
        console.log("Security: New browser session detected, signing out...");
        await supabase.auth.signOut();
      }
    };
    
    checkSessionSecurity();

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole = "patient") => {
    // Use the production URL for email verification redirect
    const redirectUrl = "https://medicareplus.app/auth";
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          role,
        },
      },
    });

    // When email confirmation is enabled, Supabase returns a fake user with
    // empty identities instead of an error if the email already exists.
    if (!error && data?.user && data.user.identities?.length === 0) {
      return { error: new Error("This email is already registered. Please sign in instead.") };
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      const profile = await fetchProfile(user.id);
      setProfile(profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        requiresPasswordChange,
        setRequiresPasswordChange,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        // Redirect to appropriate dashboard based on role
        const redirectMap: Record<UserRole, string> = {
          patient: "/profile",
          doctor: "/doctor",
          pa: "/pa",
          admin: "/admin",
          pharmacy: "/pharmacy",
        };
        navigate(redirectMap[profile.role] || "/");
      }
    }
  }, [user, profile, loading, navigate, allowedRoles]);

  return { user, profile, loading, refreshProfile };
}
