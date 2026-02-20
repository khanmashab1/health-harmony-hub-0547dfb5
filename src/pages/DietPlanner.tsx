import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, seoSchemas } from "@/components/seo/SEOHead";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { generateDietPlanPDF } from "@/lib/dietPlanPdfGenerator";
import { generateDietPlan } from "@/lib/dietPlanGenerator";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Salad, Loader2, Apple, Dumbbell, Moon, Droplets, Target,
  Flame, Clock, Activity, Heart, Lightbulb, ChevronRight, Utensils,
  Coffee, Sun, Sunset, Download, ClipboardCheck, Trash2, History,
  LogIn, Plus, Eye, Share2, MessageCircle, Copy, Check, ArrowLeft
} from "lucide-react";

interface MealItem {
  meal: string;
  calories: number;
  details: string;
}

interface ExerciseItem {
  day: string;
  workout: string;
  duration: string;
  intensity: string;
  details: string;
}

interface HealthPlan {
  summary: string;
  bmi: number;
  bmiCategory: string;
  dailyCalories: number;
  waterIntake: string;
  dietPlan: {
    breakfast: MealItem[];
    morningSnack: MealItem[];
    lunch: MealItem[];
    eveningSnack: MealItem[];
    dinner: MealItem[];
  };
  exercisePlan: ExerciseItem[];
  lifestyleTips: string[];
  sleepRecommendation: string;
  weeklyGoals: string[];
  planId?: string;
}

interface MealLog {
  eaten: boolean;
  notes: string;
}

interface SavedPlan {
  id: string;
  plan_data: HealthPlan;
  profile_data: { age: string; gender: string; height: string; weight: string; goal: string; dietaryPreference: string; activityLevel: string };
  meal_logs: Record<string, MealLog>;
  created_at: string;
  calorie_target: number | null;
}

const mealOrder = ["breakfast", "morningSnack", "lunch", "eveningSnack", "dinner"];

const mealIcons: Record<string, typeof Coffee> = {
  breakfast: Coffee,
  morningSnack: Sun,
  lunch: Utensils,
  eveningSnack: Sunset,
  dinner: Moon,
};

const mealLabels: Record<string, string> = {
  breakfast: "Breakfast",
  morningSnack: "Morning Snack",
  lunch: "Lunch",
  eveningSnack: "Evening Snack",
  dinner: "Dinner",
};

const intensityColor: Record<string, string> = {
  Low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  High: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Rest: "bg-muted text-muted-foreground",
};

type ViewMode = "list" | "form" | "plan";

export default function DietPlanner() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<HealthPlan | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return dayNames[new Date().getDay()];
  });

  const [mealLogs, setMealLogs] = useState<Record<string, MealLog>>({});

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [allergies, setAllergies] = useState("");

  const STORAGE_KEY = "diet_planner_form";

  const bmi = height && weight ? (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1) : "";

  // Restore form from sessionStorage (for auth redirect flow)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.age) setAge(data.age);
        if (data.gender) setGender(data.gender);
        if (data.height) setHeight(data.height);
        if (data.weight) setWeight(data.weight);
        if (data.goal) setGoal(data.goal);
        if (data.activityLevel) setActivityLevel(data.activityLevel);
        if (data.allergies) setAllergies(data.allergies);
        sessionStorage.removeItem(STORAGE_KEY);
        setViewMode("form");
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch saved plans
  const fetchSavedPlans = useCallback(async () => {
    if (!user) return;
    setLoadingPlans(true);
    try {
      const { data, error } = await supabase
        .from("diet_plans" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedPlans((data || []) as unknown as SavedPlan[]);
    } catch {
      // silent
    } finally {
      setLoadingPlans(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchSavedPlans();
  }, [user, fetchSavedPlans]);

  const saveFormToStorage = () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ age, gender, height, weight, goal, activityLevel, allergies }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      saveFormToStorage();
      toast.info("Please sign in to generate your health plan. Your form data will be preserved!");
      navigate(`/auth?redirect=${encodeURIComponent("/diet-planner")}`);
      return;
    }

    setLoading(true);
    setPlan(null);
    setError(null);
    setMealLogs({});
    setActivePlanId(null);

    try {
      const data = await generateDietPlan({
        age: parseInt(age),
        gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
        goal,
        activityLevel,
        allergies,
        userId: user.id,
      });

      if (data.planId) setActivePlanId(data.planId);

      setPlan(data);
      setViewMode("plan");
      toast.success("Diet plan generated and saved!");
      fetchSavedPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.error("Failed to generate plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadSavedPlan = (saved: SavedPlan) => {
    setPlan(saved.plan_data);
    setMealLogs(saved.meal_logs || {});
    setActivePlanId(saved.id);
    if (saved.profile_data) {
      setAge(saved.profile_data.age || "");
      setGender(saved.profile_data.gender || "");
      setHeight(saved.profile_data.height || "");
      setWeight(saved.profile_data.weight || "");
      setGoal(saved.profile_data.goal || "");
      setActivityLevel(saved.profile_data.activityLevel || "");
    }
    setViewMode("plan");
  };

  const deletePlan = async (planId: string) => {
    setDeletingId(planId);
    try {
      const { error } = await supabase.from("diet_plans" as any).delete().eq("id", planId);
      if (error) throw error;
      toast.success("Plan deleted");
      setSavedPlans(prev => prev.filter(p => p.id !== planId));
      if (activePlanId === planId) {
        setPlan(null);
        setActivePlanId(null);
        setViewMode("list");
      }
    } catch {
      toast.error("Failed to delete plan");
    } finally {
      setDeletingId(null);
    }
  };

  // Save meal logs to DB when they change
  useEffect(() => {
    if (!activePlanId || !user) return;
    const timeout = setTimeout(async () => {
      await supabase
        .from("diet_plans" as any)
        .update({ meal_logs: mealLogs } as any)
        .eq("id", activePlanId);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [mealLogs, activePlanId, user]);

  const getBmiColor = (cat: string) => {
    if (cat === "Normal") return "text-green-600 dark:text-green-400";
    if (cat === "Overweight") return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const toggleMealEaten = (key: string) => {
    const dayKey = `${selectedDay}:${key}`;
    setMealLogs(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], eaten: !prev[dayKey]?.eaten, notes: prev[dayKey]?.notes || "" }
    }));
  };

  const setMealNote = (key: string, notes: string) => {
    const dayKey = `${selectedDay}:${key}`;
    setMealLogs(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], eaten: prev[dayKey]?.eaten || false, notes }
    }));
  };

  const getDayStats = (day: string) => {
    if (!plan) return { total: 0, eaten: 0, calories: 0 };
    let total = 0, eaten = 0, calories = 0;
    mealOrder.forEach((mealKey) => {
      const meals = plan.dietPlan[mealKey as keyof typeof plan.dietPlan] || [];
      (meals as MealItem[]).forEach((item, i) => {
        total++;
        const dayKey = `${day}:${mealKey}-${i}`;
        if (mealLogs[dayKey]?.eaten) { eaten++; calories += item.calories; }
      });
    });
    return { total, eaten, calories };
  };

  const getWeeklyStats = () => {
    const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    let totalEaten = 0, totalMeals = 0, totalCalories = 0;
    const dayBreakdown = allDays.map(day => {
      const s = getDayStats(day);
      totalEaten += s.eaten;
      totalMeals += s.total;
      totalCalories += s.calories;
      return { day, ...s };
    });
    return { totalEaten, totalMeals, totalCalories, dayBreakdown };
  };

  const getTrackerStats = () => getDayStats(selectedDay);

  const handleDownloadPDF = () => {
    if (!plan) return;
    generateDietPlanPDF(plan, { age, gender, height, weight, goal, dietaryPreference: "N/A", activityLevel }, mealLogs, mealLabels);
    toast.success("PDF downloaded!");
  };

  const getShareText = () => {
    if (!plan) return "";
    return `🥗 My Health & Diet Plan\n\n📊 BMI: ${plan.bmi} (${plan.bmiCategory})\n🔥 Daily Calories: ${plan.dailyCalories} kcal\n💧 Water: ${plan.waterIntake}\n🎯 Goal: ${goal}\n\n✅ Weekly Goals:\n${plan.weeklyGoals.map((g, i) => `${i + 1}. ${g}`).join("\n")}\n\nGenerated by MediCare+ Diet Planner`;
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleCopyPlan = async () => {
    try {
      await navigator.clipboard.writeText(getShareText());
      setCopied(true);
      toast.success("Plan copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const stats = plan ? getTrackerStats() : null;

  // Not signed in — show sign-in prompt
  if (!authLoading && !user) {
    return (
      <Layout>
        <SEOHead
          title="Diet Planner — Free Personalized Meal Plans"
          description="Generate a free personalized diet plan based on your health goals, age, weight, and dietary preferences. Includes meal plans, calorie tracking, PDF export, and WhatsApp sharing."
          keywords="diet planner, free diet plan generator, personalized meal plan, diet planner online free, meal planner, healthy diet plan Pakistan, weight loss meal plan, diabetes diet plan, diet chart generator, nutrition planner, calorie counter"
          canonicalUrl="/diet-planner"
          jsonLd={[
            seoSchemas.medicalService({
              name: "Diet Planner Tool",
              description: "Free personalized diet and meal planning tool that creates customized nutrition plans based on health goals, dietary preferences, and medical conditions.",
              url: "/diet-planner",
            }),
            seoSchemas.breadcrumb([
              { name: "Home", url: "/" },
              { name: "AI Health Tools", url: "/ai-health" },
              { name: "Diet Planner", url: "/diet-planner" },
            ]),
          ]}
        />
        <div className="container mx-auto px-4 py-8 md:py-20 max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card variant="elevated" className="shadow-xl text-center">
              <CardHeader>
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
                    <Salad className="w-8 h-8" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Health & Diet Planner</CardTitle>
                <CardDescription className="text-base mt-2">
                  Sign in to generate personalized diet plans, track your meals, and save your progress.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50">
                    <Apple className="w-5 h-5 text-primary" />
                    <span>Diet Plans</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    <span>Meal Tracker</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50">
                    <History className="w-5 h-5 text-primary" />
                    <span>Save & Revisit</span>
                  </div>
                </div>
                <Button size="lg" className="w-full gap-2" onClick={() => navigate(`/auth?redirect=${encodeURIComponent("/diet-planner")}`)}>
                  <LogIn className="w-5 h-5" />
                  Sign In to Get Started
                </Button>
                <p className="text-xs text-muted-foreground">Don't have an account? You can sign up on the next page.</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead
        title="Diet Planner — Free Personalized Meal Plans"
        description="Generate a free personalized diet plan based on your health goals, age, weight, and dietary preferences. Includes meal plans, calorie tracking, PDF export, and WhatsApp sharing."
        keywords="diet planner, free diet plan generator, personalized meal plan, diet planner online free, meal planner, healthy diet plan Pakistan, weight loss meal plan, diabetes diet plan, diet chart generator, nutrition planner, calorie counter"
        canonicalUrl="/diet-planner"
        jsonLd={[
          seoSchemas.medicalService({
            name: "Diet Planner Tool",
            description: "Free personalized diet and meal planning tool that creates customized nutrition plans based on health goals, dietary preferences, and medical conditions.",
            url: "/diet-planner",
          }),
          seoSchemas.breadcrumb([
            { name: "Home", url: "/" },
            { name: "AI Health Tools", url: "/ai-health" },
            { name: "Diet Planner", url: "/diet-planner" },
          ]),
        ]}
      />
      <div className="container mx-auto px-4 py-4 md:py-10 max-w-5xl">
        <AnimatePresence mode="wait">
          {/* ========== LIST VIEW ========== */}
          {viewMode === "list" && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 md:space-y-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("/ai-health")} className="gap-1.5 -ml-2 mb-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">My Diet Plans</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Your saved diet and health plans</p>
                </div>
                <Button onClick={() => setViewMode("form")} className="gap-1.5 shrink-0 h-9 text-sm px-3">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New</span> Plan
                </Button>
              </div>

              {loadingPlans ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} variant="default">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-3 w-1/3" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : savedPlans.length === 0 ? (
                <Card variant="elevated" className="text-center py-12">
                  <CardContent>
                    <Salad className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">No Plans Yet</h2>
                    <p className="text-sm text-muted-foreground mb-4">Generate your first personalized health and diet plan!</p>
                    <Button onClick={() => setViewMode("form")} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Your First Plan
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {savedPlans.map(sp => (
                    <Card key={sp.id} variant="default" className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shrink-0">
                            <Salad className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base text-foreground leading-tight">
                              {sp.profile_data?.goal || "Health Plan"} • {sp.calorie_target || sp.plan_data?.dailyCalories} kcal/day
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              BMI: {sp.plan_data?.bmi} ({sp.plan_data?.bmiCategory})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created {format(new Date(sp.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Button variant="outline" size="sm" onClick={() => loadSavedPlan(sp)} className="gap-1.5 h-8 text-xs">
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={deletingId === sp.id}
                                    className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
                                  >
                                    {deletingId === sp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this diet plan and all its meal tracker data. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deletePlan(sp.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ========== FORM VIEW ========== */}
          {viewMode === "form" && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {savedPlans.length > 0 && (
                <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={() => setViewMode("list")}>
                  <History className="w-4 h-4" /> Back to My Plans
                </Button>
              )}
              <Card variant="elevated" className="shadow-xl max-w-2xl mx-auto">
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
                      <Salad className="w-8 h-8" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl md:text-3xl">Health & Diet Planner</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Get a personalized diet, exercise, and lifestyle plan based on scientific formulas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <fieldset className="space-y-3">
                      <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Your Profile</legend>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="dp-age">Age</Label>
                          <Input id="dp-age" type="number" min={10} max={100} required placeholder="e.g. 25" value={age} onChange={e => setAge(e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="dp-gender">Gender</Label>
                          <Select value={gender} onValueChange={setGender} required>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="dp-height">Height (cm)</Label>
                          <Input id="dp-height" type="number" min={100} max={250} required placeholder="e.g. 170" value={height} onChange={e => setHeight(e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="dp-weight">Weight (kg)</Label>
                          <Input id="dp-weight" type="number" min={20} max={300} required placeholder="e.g. 70" value={weight} onChange={e => setWeight(e.target.value)} />
                        </div>
                      </div>
                      {bmi && (
                        <p className="text-sm text-muted-foreground">Calculated BMI: <span className="font-semibold text-foreground">{bmi}</span></p>
                      )}
                    </fieldset>

                    <fieldset className="space-y-3">
                      <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Goals & Activity</legend>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Health Goal</Label>
                          <Select value={goal} onValueChange={setGoal} required>
                            <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                              <SelectItem value="Weight Gain">Weight Gain</SelectItem>
                              <SelectItem value="Muscle Building">Muscle Building</SelectItem>
                              <SelectItem value="Maintain Weight">Maintain Weight</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Activity Level</Label>
                          <Select value={activityLevel} onValueChange={setActivityLevel} required>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sedentary">Sedentary (little/no exercise)</SelectItem>
                              <SelectItem value="Moderate">Moderate (3-5 days/week)</SelectItem>
                              <SelectItem value="Active">Active (6-7 days/week)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </fieldset>

                    <fieldset className="space-y-3">
                      <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Allergies (Optional)</legend>
                      <div>
                        <Label>Food Allergies</Label>
                        <Textarea placeholder="e.g. Nuts, Gluten, Dairy (comma separated)" value={allergies} onChange={e => setAllergies(e.target.value)} rows={2} />
                        <p className="text-xs text-muted-foreground mt-1">Foods with these tags will be excluded from your plan.</p>
                      </div>
                    </fieldset>

                    {error && (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" size="lg" className="w-full" disabled={loading || !gender || !goal || !activityLevel}>
                      {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Generating Your Plan...</>
                      ) : (
                        <><Salad className="w-5 h-5" /> Generate My Diet Plan</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ========== PLAN VIEW ========== */}
          {viewMode === "plan" && plan && (
            <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => { setViewMode("list"); setPlan(null); setActivePlanId(null); }}>
                <ArrowLeft className="w-4 h-4" /> Back to My Plans
              </Button>

              {/* Summary Header */}
              <Card variant="elevated" className="overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 md:p-8 text-white">
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">Your Personalized Diet Plan</h1>
                  <p className="text-white/90 text-sm md:text-base">{plan.summary}</p>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-xl bg-muted/50">
                      <Activity className="w-5 h-5 mx-auto mb-1 text-primary" />
                      <p className="text-xs text-muted-foreground">BMI</p>
                      <p className={`text-lg font-bold ${getBmiColor(plan.bmiCategory)}`}>{plan.bmi}</p>
                      <p className="text-xs text-muted-foreground">{plan.bmiCategory}</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-muted/50">
                      <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                      <p className="text-xs text-muted-foreground">Daily Calories</p>
                      <p className="text-lg font-bold text-foreground">{plan.dailyCalories}</p>
                      <p className="text-xs text-muted-foreground">kcal/day</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-muted/50">
                      <Droplets className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                      <p className="text-xs text-muted-foreground">Water</p>
                      <p className="text-lg font-bold text-foreground">{plan.waterIntake}</p>
                      <p className="text-xs text-muted-foreground">daily</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-muted/50">
                      <Moon className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
                      <p className="text-xs text-muted-foreground">Sleep</p>
                      <p className="text-sm font-bold text-foreground">{plan.sleepRecommendation}</p>
                      <p className="text-xs text-muted-foreground">recommended</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="diet" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="diet" className="gap-1.5"><Apple className="w-4 h-4" /><span className="hidden sm:inline">Diet</span></TabsTrigger>
                  <TabsTrigger value="tracker" className="gap-1.5"><ClipboardCheck className="w-4 h-4" /><span className="hidden sm:inline">Tracker</span></TabsTrigger>
                  <TabsTrigger value="exercise" className="gap-1.5"><Dumbbell className="w-4 h-4" /><span className="hidden sm:inline">Exercise</span></TabsTrigger>
                  <TabsTrigger value="lifestyle" className="gap-1.5"><Lightbulb className="w-4 h-4" /><span className="hidden sm:inline">Lifestyle</span></TabsTrigger>
                </TabsList>

                {/* Diet Tab */}
                <TabsContent value="diet" className="space-y-4 mt-4">
                  {mealOrder.map((mealKey) => {
                    const meals = plan.dietPlan[mealKey as keyof typeof plan.dietPlan] || [];
                    if ((meals as MealItem[]).length === 0) return null;
                    const Icon = mealIcons[mealKey] || Utensils;
                    const totalCals = (meals as MealItem[]).reduce((s, m) => s + m.calories, 0);
                    return (
                      <Card key={mealKey} variant="default">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-primary/10"><Icon className="w-5 h-5 text-primary" /></div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">{mealLabels[mealKey]}</h3>
                              <p className="text-xs text-muted-foreground">{totalCals} kcal</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(meals as MealItem[]).map((item, i) => (
                              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
                                <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-sm text-foreground">{item.meal}</span>
                                    <Badge variant="secondary" className="shrink-0 text-xs">{item.calories} kcal</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">{item.details}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>

                {/* Tracker Tab */}
                <TabsContent value="tracker" className="space-y-4 mt-4">
                  {/* Weekly Overview */}
                  {(() => {
                    const weekly = getWeeklyStats();
                    const weekPct = weekly.totalMeals > 0 ? Math.round((weekly.totalEaten / weekly.totalMeals) * 100) : 0;
                    return (
                      <Card variant="elevated" className="border-primary/20">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                              <Target className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">Weekly Overview</h3>
                              <p className="text-xs text-muted-foreground">{weekly.totalEaten} of {weekly.totalMeals} meals logged • {weekly.totalCalories} kcal total</p>
                            </div>
                            <Badge variant={weekPct === 100 ? "default" : "secondary"} className="text-sm">{weekPct}%</Badge>
                          </div>
                          <Progress value={weekPct} className="h-2" />
                          {/* Mini day bars */}
                          <div className="grid grid-cols-7 gap-1.5">
                            {weekly.dayBreakdown.map(d => {
                              const pct = d.total > 0 ? Math.round((d.eaten / d.total) * 100) : 0;
                              return (
                                <button
                                  key={d.day}
                                  onClick={() => setSelectedDay(d.day)}
                                  className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${selectedDay === d.day ? "bg-primary/10 ring-1 ring-primary" : "bg-muted/40 hover:bg-muted"}`}
                                >
                                  <span className="font-medium text-foreground">{d.day.slice(0, 3)}</span>
                                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-primary" : "bg-transparent"}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-muted-foreground">{pct}%</span>
                                </button>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Selected Day Progress */}
                  {stats && (
                    <Card variant="default">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-xl bg-primary/10">
                            <ClipboardCheck className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{selectedDay}'s Meals</h3>
                            <p className="text-xs text-muted-foreground">{stats.eaten} of {stats.total} meals • {stats.calories} kcal consumed</p>
                          </div>
                          <Badge variant={stats.eaten === stats.total && stats.total > 0 ? "default" : "secondary"} className="text-sm">
                            {stats.total > 0 ? Math.round((stats.eaten / stats.total) * 100) : 0}%
                          </Badge>
                        </div>
                        <Progress value={stats.total > 0 ? (stats.eaten / stats.total) * 100 : 0} className="h-2.5" />
                      </CardContent>
                    </Card>
                  )}

                  {mealOrder.map((mealKey) => {
                    const meals = plan.dietPlan[mealKey as keyof typeof plan.dietPlan] || [];
                    if ((meals as MealItem[]).length === 0) return null;
                    const Icon = mealIcons[mealKey] || Utensils;
                    return (
                      <Card key={mealKey} variant="default">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-primary/10"><Icon className="w-5 h-5 text-primary" /></div>
                            <h3 className="font-semibold text-foreground">{mealLabels[mealKey]}</h3>
                          </div>
                          <div className="space-y-3">
                            {(meals as MealItem[]).map((item, i) => {
                              const key = `${mealKey}-${i}`;
                              const dayKey = `${selectedDay}:${key}`;
                              const log = mealLogs[dayKey];
                              const isEaten = log?.eaten || false;
                              return (
                                <div key={i} className={`p-3 rounded-lg border transition-colors ${isEaten ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" : "bg-muted/30 border-border"}`}>
                                  <div className="flex items-start gap-3">
                                    <Checkbox checked={isEaten} onCheckedChange={() => toggleMealEaten(key)} className="mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className={`font-medium text-sm ${isEaten ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.meal}</span>
                                        <Badge variant={isEaten ? "default" : "secondary"} className="shrink-0 text-xs">{item.calories} kcal</Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5">{item.details}</p>
                                      <div className="mt-2">
                                        <Input placeholder="What did you actually eat? (optional)" value={log?.notes || ""} onChange={(e) => setMealNote(key, e.target.value)} className="h-8 text-xs" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>

                {/* Exercise Tab */}
                <TabsContent value="exercise" className="space-y-3 mt-4">
                  {plan.exercisePlan.map((ex, i) => (
                    <Card key={i} variant="default">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 shrink-0"><Dumbbell className="w-5 h-5 text-primary" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-foreground">{ex.day}</h3>
                              <Badge className={`text-xs ${intensityColor[ex.intensity] || "bg-muted text-muted-foreground"}`}>{ex.intensity}</Badge>
                            </div>
                            <p className="font-medium text-sm text-foreground">{ex.workout}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ex.duration}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">{ex.details}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* Lifestyle Tab */}
                <TabsContent value="lifestyle" className="space-y-4 mt-4">
                  <Card variant="default">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3"><Target className="w-5 h-5 text-primary" /><h3 className="font-semibold text-foreground">Weekly Goals</h3></div>
                      <div className="space-y-2">
                        {plan.weeklyGoals.map((g, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-sm text-foreground">{g}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card variant="default">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-5 h-5 text-yellow-500" /><h3 className="font-semibold text-foreground">Lifestyle Tips</h3></div>
                      <div className="space-y-2">
                        {plan.lifestyleTips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
                            <Heart className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <p className="text-sm text-foreground">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card variant="default">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2"><Moon className="w-5 h-5 text-indigo-500" /><h3 className="font-semibold text-foreground">Sleep Recommendation</h3></div>
                      <p className="text-sm text-muted-foreground">{plan.sleepRecommendation}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3">
                  <Button onClick={() => { setViewMode("form"); setPlan(null); setActivePlanId(null); }} variant="outline" size="lg" className="flex-1">
                    Generate New Plan
                  </Button>
                  <Button onClick={handleDownloadPDF} variant="outline" size="lg" className="flex-1 gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Button onClick={handleShareWhatsApp} variant="outline" size="lg" className="gap-2">
                    <MessageCircle className="w-4 h-4" /> <span className="hidden sm:inline">WhatsApp</span><span className="sm:hidden">Share</span>
                  </Button>
                  <Button onClick={handleCopyPlan} variant="outline" size="lg" className="gap-2">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  {activePlanId ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="lg" className="gap-2 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this diet plan and all its meal tracker data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePlan(activePlanId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <div />
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                ⚕️ This plan is generated using the Mifflin-St Jeor formula and is for informational purposes only. It does not replace professional medical or nutritional advice.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
