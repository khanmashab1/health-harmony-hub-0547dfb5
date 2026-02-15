import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
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
import { supabase } from "@/integrations/supabase/client";
import { useAIUsageLimit } from "@/hooks/useAIUsageLimit";
import { AIUsageBanner } from "@/components/shared/AIUsageBanner";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Salad, Loader2, Apple, Dumbbell, Moon, Droplets, Target,
  Flame, Clock, Activity, Heart, Lightbulb, ChevronRight, Utensils,
  Coffee, Sun, Sunset
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
}

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

export default function DietPlanner() {
  const usageLimit = useAIUsageLimit("diet_planner");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<HealthPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [allergies, setAllergies] = useState("");

  const bmi = height && weight ? (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1) : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allowed = await usageLimit.checkAndIncrement();
    if (!allowed) {
      toast.error("Daily limit reached. Sign up or purchase AI credits for more!");
      return;
    }

    setLoading(true);
    setPlan(null);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("diet-planner", {
        body: { age: parseInt(age), gender, height: parseFloat(height), weight: parseFloat(weight), goal, dietaryPreference, activityLevel, medicalConditions, allergies },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setPlan(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.error("Failed to generate plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getBmiColor = (cat: string) => {
    if (cat === "Normal") return "text-green-600 dark:text-green-400";
    if (cat === "Overweight") return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Layout>
      <SEOHead
        title="AI Health & Diet Planner | MediCare+"
        description="Get a personalized AI-generated diet plan, exercise routine, and lifestyle recommendations."
        canonicalUrl="/diet-planner"
      />
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {!plan ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card variant="elevated" className="shadow-xl max-w-2xl mx-auto">
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
                    <Salad className="w-8 h-8" />
                  </div>
                </div>
                <CardTitle className="text-2xl md:text-3xl">AI Health & Diet Planner</CardTitle>
                <CardDescription className="text-base mt-1">
                  Get a personalized diet, exercise, and lifestyle plan powered by AI.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIUsageBanner {...usageLimit} />
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Basic Info */}
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
                            <SelectItem value="Other">Other</SelectItem>
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

                  {/* Goals & Preferences */}
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Goals & Preferences</legend>
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
                            <SelectItem value="Improve Energy">Improve Energy</SelectItem>
                            <SelectItem value="Better Sleep">Better Sleep</SelectItem>
                            <SelectItem value="Overall Health">Overall Health</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Dietary Preference</Label>
                        <Select value={dietaryPreference} onValueChange={setDietaryPreference} required>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="No Restriction">No Restriction</SelectItem>
                            <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                            <SelectItem value="Vegan">Vegan</SelectItem>
                            <SelectItem value="Halal">Halal</SelectItem>
                            <SelectItem value="Keto">Keto</SelectItem>
                            <SelectItem value="Low Carb">Low Carb</SelectItem>
                            <SelectItem value="High Protein">High Protein</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Activity Level</Label>
                        <Select value={activityLevel} onValueChange={setActivityLevel} required>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sedentary">Sedentary (little/no exercise)</SelectItem>
                            <SelectItem value="Lightly Active">Lightly Active (1-3 days/week)</SelectItem>
                            <SelectItem value="Moderately Active">Moderately Active (3-5 days/week)</SelectItem>
                            <SelectItem value="Very Active">Very Active (6-7 days/week)</SelectItem>
                            <SelectItem value="Athlete">Athlete (intense training)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </fieldset>

                  {/* Optional */}
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Optional Details</legend>
                    <div>
                      <Label>Medical Conditions</Label>
                      <Textarea placeholder="e.g. Diabetes, Hypertension, Thyroid..." value={medicalConditions} onChange={e => setMedicalConditions(e.target.value)} rows={2} />
                    </div>
                    <div>
                      <Label>Food Allergies</Label>
                      <Textarea placeholder="e.g. Nuts, Gluten, Dairy..." value={allergies} onChange={e => setAllergies(e.target.value)} rows={2} />
                    </div>
                  </fieldset>

                  {error && (
                    <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" size="lg" className="w-full" disabled={loading || !gender || !goal || !dietaryPreference || !activityLevel}>
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating Your Plan...
                      </>
                    ) : (
                      <>
                        <Salad className="w-5 h-5" />
                        Generate My Health Plan
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Summary Header */}
            <Card variant="elevated" className="overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 md:p-8 text-white">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Your Personalized Health Plan</h1>
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
                    <p className="text-sm font-bold text-foreground">{plan.sleepRecommendation.slice(0, 20)}</p>
                    <p className="text-xs text-muted-foreground">recommended</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabbed Content */}
            <Tabs defaultValue="diet" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="diet" className="gap-1.5"><Apple className="w-4 h-4" />Diet</TabsTrigger>
                <TabsTrigger value="exercise" className="gap-1.5"><Dumbbell className="w-4 h-4" />Exercise</TabsTrigger>
                <TabsTrigger value="lifestyle" className="gap-1.5"><Lightbulb className="w-4 h-4" />Lifestyle</TabsTrigger>
              </TabsList>

              {/* Diet Tab */}
              <TabsContent value="diet" className="space-y-4 mt-4">
                {Object.entries(plan.dietPlan).map(([mealKey, meals]) => {
                  const Icon = mealIcons[mealKey] || Utensils;
                  const totalCals = (meals as MealItem[]).reduce((s, m) => s + m.calories, 0);
                  return (
                    <Card key={mealKey} variant="default">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-xl bg-primary/10">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
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

              {/* Exercise Tab */}
              <TabsContent value="exercise" className="space-y-3 mt-4">
                {plan.exercisePlan.map((ex, i) => (
                  <Card key={i} variant="default">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                          <Dumbbell className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-foreground">{ex.day}</h3>
                            <Badge className={`text-xs ${intensityColor[ex.intensity] || "bg-muted text-muted-foreground"}`}>
                              {ex.intensity}
                            </Badge>
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
                {/* Weekly Goals */}
                <Card variant="default">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Weekly Goals</h3>
                    </div>
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

                {/* Lifestyle Tips */}
                <Card variant="default">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      <h3 className="font-semibold text-foreground">Lifestyle Tips</h3>
                    </div>
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

                {/* Sleep */}
                <Card variant="default">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="w-5 h-5 text-indigo-500" />
                      <h3 className="font-semibold text-foreground">Sleep Recommendation</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.sleepRecommendation}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setPlan(null)} variant="outline" size="lg" className="flex-1">
                Generate New Plan
              </Button>
              <Button asChild size="lg" className="flex-1">
                <a href="/booking">Book a Nutritionist</a>
              </Button>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-xs text-muted-foreground">
              ⚕️ This AI-generated plan is for informational purposes only and does not replace professional medical or nutritional advice. Always consult a qualified healthcare professional.
            </p>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
