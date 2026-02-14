import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, HeartPulse, Calendar, AlertTriangle, ShieldCheck, ShieldAlert, Activity, Droplets, Moon, Dumbbell, Cigarette, Wine, TrendingUp, TrendingDown, Minus, Brain, Utensils, Users } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";

interface RiskResult {
  risk_level: string;
  message?: string;
  [key: string]: unknown;
}

interface HealthMetric {
  label: string;
  value: number;
  normalMin: number;
  normalMax: number;
  dangerMin: number;
  dangerMax: number;
  unit: string;
  icon: React.ReactNode;
  status: "normal" | "warning" | "danger";
  suggestion: string;
}

export default function RiskEvaluator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");

  const calculatedBmi = heightCm && weightKg
    ? (parseFloat(weightKg) / ((parseFloat(heightCm) / 100) ** 2)).toFixed(1)
    : "";
  const [bpSystolic, setBpSystolic] = useState("");
  const [oxygenLevel, setOxygenLevel] = useState("");
  const [diet, setDiet] = useState("");
  const [exerciseDays, setExerciseDays] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [stress, setStress] = useState("");
  const [smoking, setSmoking] = useState("");
  const [alcohol, setAlcohol] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");

  // Compute health metrics for results
  const healthMetrics = useMemo((): HealthMetric[] => {
    if (!result) return [];
    const bmi = parseFloat(calculatedBmi);
    const bp = parseInt(bpSystolic);
    const o2 = parseFloat(oxygenLevel);
    const sleep = parseFloat(sleepHours);
    const exercise = parseInt(exerciseDays);

    const getBmiStatus = (v: number): "normal" | "warning" | "danger" => {
      if (v >= 18.5 && v <= 24.9) return "normal";
      if ((v >= 25 && v <= 29.9) || (v >= 16 && v < 18.5)) return "warning";
      return "danger";
    };
    const getBpStatus = (v: number): "normal" | "warning" | "danger" => {
      if (v >= 90 && v <= 120) return "normal";
      if ((v > 120 && v <= 140) || (v >= 80 && v < 90)) return "warning";
      return "danger";
    };
    const getO2Status = (v: number): "normal" | "warning" | "danger" => {
      if (v >= 95) return "normal";
      if (v >= 90 && v < 95) return "warning";
      return "danger";
    };
    const getSleepStatus = (v: number): "normal" | "warning" | "danger" => {
      if (v >= 7 && v <= 9) return "normal";
      if ((v >= 6 && v < 7) || (v > 9 && v <= 10)) return "warning";
      return "danger";
    };
    const getExerciseStatus = (v: number): "normal" | "warning" | "danger" => {
      if (v >= 4) return "normal";
      if (v >= 2) return "warning";
      return "danger";
    };

    return [
      {
        label: "BMI",
        value: bmi,
        normalMin: 18.5, normalMax: 24.9,
        dangerMin: 0, dangerMax: 40,
        unit: "kg/m²",
        icon: <Activity className="w-4 h-4" />,
        status: getBmiStatus(bmi),
        suggestion: getBmiStatus(bmi) === "normal"
          ? "Your BMI is in a healthy range. Maintain your current diet and exercise habits."
          : getBmiStatus(bmi) === "warning"
          ? "Your BMI is slightly outside the ideal range. Consider adjusting your diet and increasing physical activity."
          : "Your BMI indicates a significant health risk. Consult a doctor for a personalized weight management plan.",
      },
      {
        label: "Blood Pressure",
        value: bp,
        normalMin: 90, normalMax: 120,
        dangerMin: 60, dangerMax: 200,
        unit: "mmHg",
        icon: <HeartPulse className="w-4 h-4" />,
        status: getBpStatus(bp),
        suggestion: getBpStatus(bp) === "normal"
          ? "Your blood pressure is within a healthy range. Keep monitoring it regularly."
          : getBpStatus(bp) === "warning"
          ? "Your blood pressure is elevated. Reduce sodium intake, manage stress, and exercise regularly."
          : "Your blood pressure is in the danger zone! Seek immediate medical attention and follow prescribed medications.",
      },
      {
        label: "Oxygen Level",
        value: o2,
        normalMin: 95, normalMax: 100,
        dangerMin: 70, dangerMax: 100,
        unit: "%",
        icon: <Droplets className="w-4 h-4" />,
        status: getO2Status(o2),
        suggestion: getO2Status(o2) === "normal"
          ? "Your oxygen saturation is excellent."
          : getO2Status(o2) === "warning"
          ? "Your oxygen level is slightly low. Practice deep breathing exercises and monitor with a pulse oximeter."
          : "Critically low oxygen! Seek emergency medical care immediately. This may indicate a serious respiratory condition.",
      },
      {
        label: "Sleep",
        value: sleep,
        normalMin: 7, normalMax: 9,
        dangerMin: 0, dangerMax: 14,
        unit: "hrs",
        icon: <Moon className="w-4 h-4" />,
        status: getSleepStatus(sleep),
        suggestion: getSleepStatus(sleep) === "normal"
          ? "Great sleep habits! Quality rest supports overall health."
          : getSleepStatus(sleep) === "warning"
          ? "Try to get 7-9 hours of sleep. Avoid screens before bedtime and maintain a consistent sleep schedule."
          : "Your sleep pattern needs immediate attention. Chronic sleep deprivation increases risk of heart disease, diabetes, and mental health issues.",
      },
      {
        label: "Exercise",
        value: exercise,
        normalMin: 4, normalMax: 7,
        dangerMin: 0, dangerMax: 7,
        unit: "days/wk",
        icon: <Dumbbell className="w-4 h-4" />,
        status: getExerciseStatus(exercise),
        suggestion: getExerciseStatus(exercise) === "normal"
          ? "Excellent exercise routine! Physical activity greatly reduces health risks."
          : getExerciseStatus(exercise) === "warning"
          ? "Aim for at least 4 days of moderate exercise per week. Even 30-minute walks can significantly improve heart health."
          : "Sedentary lifestyle detected. Start with light exercises like walking and gradually increase intensity.",
      },
    ];
  }, [result, calculatedBmi, bpSystolic, oxygenLevel, sleepHours, exerciseDays]);

  // Radar chart data for lifestyle
  const radarData = useMemo(() => {
    if (!result) return [];
    const dietScore = diet === "Good" ? 100 : diet === "Average" ? 60 : 30;
    const exerciseScore = Math.min((parseInt(exerciseDays) / 7) * 100, 100);
    const sleepScore = parseFloat(sleepHours) >= 7 && parseFloat(sleepHours) <= 9 ? 100 : parseFloat(sleepHours) >= 6 ? 70 : 30;
    const stressScore = stress === "Low" ? 100 : stress === "Medium" ? 60 : 20;
    const smokingScore = smoking === "No" ? 100 : 10;
    const alcoholScore = alcohol === "Low" ? 100 : alcohol === "Medium" ? 50 : 10;
    return [
      { metric: "Diet", score: dietScore, fullMark: 100 },
      { metric: "Exercise", score: exerciseScore, fullMark: 100 },
      { metric: "Sleep", score: sleepScore, fullMark: 100 },
      { metric: "Stress Mgmt", score: stressScore, fullMark: 100 },
      { metric: "No Smoking", score: smokingScore, fullMark: 100 },
      { metric: "Low Alcohol", score: alcoholScore, fullMark: 100 },
    ];
  }, [result, diet, exerciseDays, sleepHours, stress, smoking, alcohol]);

  // Danger zone bar chart data
  const dangerZoneData = useMemo(() => {
    return healthMetrics.map(m => ({
      name: m.label,
      value: m.value,
      normalMin: m.normalMin,
      normalMax: m.normalMax,
      status: m.status,
    }));
  }, [healthMetrics]);

  // Lifestyle suggestions
  const lifestyleSuggestions = useMemo(() => {
    if (!result) return [];
    const suggestions: { icon: React.ReactNode; title: string; text: string; severity: "good" | "warn" | "bad" }[] = [];

    if (smoking === "Yes") suggestions.push({ icon: <Cigarette className="w-5 h-5" />, title: "Quit Smoking", text: "Smoking significantly increases risk of heart disease, lung cancer, and stroke. Consider nicotine replacement therapy or counseling.", severity: "bad" });
    if (alcohol === "High") suggestions.push({ icon: <Wine className="w-5 h-5" />, title: "Reduce Alcohol", text: "High alcohol intake damages the liver, weakens the immune system, and increases cancer risk. Limit to 1-2 drinks per day.", severity: "bad" });
    if (alcohol === "Medium") suggestions.push({ icon: <Wine className="w-5 h-5" />, title: "Moderate Alcohol", text: "Consider reducing alcohol intake further. Even moderate drinking has some health effects.", severity: "warn" });
    if (stress === "High") suggestions.push({ icon: <Brain className="w-5 h-5" />, title: "Manage Stress", text: "High stress contributes to hypertension, weakened immunity, and mental health issues. Try meditation, yoga, or speaking with a counselor.", severity: "bad" });
    if (stress === "Medium") suggestions.push({ icon: <Brain className="w-5 h-5" />, title: "Stress Awareness", text: "Your stress is moderate. Regular breaks, exercise, and hobbies can help keep it in check.", severity: "warn" });
    if (diet === "Poor") suggestions.push({ icon: <Utensils className="w-5 h-5" />, title: "Improve Diet", text: "A poor diet increases risk of obesity, diabetes, and heart disease. Include more fruits, vegetables, whole grains, and lean proteins.", severity: "bad" });
    if (diet === "Average") suggestions.push({ icon: <Utensils className="w-5 h-5" />, title: "Enhance Nutrition", text: "Consider adding more nutrient-rich foods. Reduce processed foods and increase fiber intake.", severity: "warn" });
    if (familyHistory === "Yes") suggestions.push({ icon: <Users className="w-5 h-5" />, title: "Family History Alert", text: "Genetic predisposition increases risk. Schedule regular screenings and preventive checkups with a specialist.", severity: "warn" });

    if (suggestions.length === 0) suggestions.push({ icon: <ShieldCheck className="w-5 h-5" />, title: "Great Lifestyle!", text: "Your lifestyle habits are excellent. Keep it up with regular checkups to maintain your health.", severity: "good" });
    return suggestions;
  }, [result, smoking, alcohol, stress, diet, familyHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const payload = {
      age: parseInt(age),
      bmi: parseFloat(calculatedBmi),
      bp_systolic: parseInt(bpSystolic),
      oxygen_level: parseFloat(oxygenLevel),
      diet,
      exercise_days: parseInt(exerciseDays),
      sleep_hours: parseFloat(sleepHours),
      stress,
      smoking,
      alcohol,
      family_history: familyHistory,
    };

    try {
      const { data, error: fnError } = await supabase.functions.invoke("health-risk-proxy", { body: payload });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      if (!data?.prediction && !data?.risk_level) throw new Error("Invalid response from server. Please check your inputs and try again.");
      setError(null);
      setResult({ ...data, risk_level: data.risk_level || data.prediction });
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    const l = level?.toLowerCase();
    if (l === "low") return "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300";
    if (l === "medium") return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300";
    return "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300";
  };

  const getRiskIcon = (level: string) => {
    const l = level?.toLowerCase();
    if (l === "low") return <ShieldCheck className="w-8 h-8 text-green-600" />;
    if (l === "medium") return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
    return <ShieldAlert className="w-8 h-8 text-red-600" />;
  };

  const getRiskAdvice = (level: string) => {
    const l = level?.toLowerCase();
    if (l === "low") return "Your vitals look healthy! Keep maintaining your lifestyle and schedule routine checkups.";
    if (l === "medium") return "Some risk factors detected. Consider consulting a doctor for a preventive health checkup.";
    return "⚠️ High risk detected! We strongly recommend booking an appointment with a doctor immediately for a thorough evaluation.";
  };

  const getStatusColor = (status: string) => {
    if (status === "normal") return "text-green-600 dark:text-green-400";
    if (status === "warning") return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getStatusBg = (status: string) => {
    if (status === "normal") return "bg-green-100 dark:bg-green-900/30";
    if (status === "warning") return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  const getProgressColor = (status: string) => {
    if (status === "normal") return "[&>div]:bg-green-500";
    if (status === "warning") return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
  };

  const getBarColor = (status: string) => {
    if (status === "normal") return "#22c55e";
    if (status === "warning") return "#eab308";
    return "#ef4444";
  };

  const getTrendIcon = (status: string) => {
    if (status === "normal") return <Minus className="w-4 h-4 text-green-500" />;
    if (status === "warning") return <TrendingUp className="w-4 h-4 text-yellow-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getSeverityStyle = (severity: string) => {
    if (severity === "good") return "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20";
    if (severity === "warn") return "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20";
    return "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20";
  };

  const getSeverityTextColor = (severity: string) => {
    if (severity === "good") return "text-green-700 dark:text-green-300";
    if (severity === "warn") return "text-yellow-700 dark:text-yellow-300";
    return "text-red-700 dark:text-red-300";
  };

  const inputClass = "bg-background";

  return (
    <Layout>
      <SEOHead
        title="AI Health Risk Evaluator | MediCare+"
        description="Get a real-time, AI-driven assessment of your health vitals."
        canonicalUrl="/risk-evaluator"
      />
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <Card variant="elevated" className="shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-2xl bg-gradient-brand text-white shadow-lg">
                <HeartPulse className="w-8 h-8" />
              </div>
            </div>
            <CardTitle className="text-2xl md:text-3xl">AI Health Risk Evaluator</CardTitle>
            <CardDescription className="text-base mt-1">
              Get a real-time, AI-driven assessment of your health vitals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
              {/* Biometrics */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Biometrics</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">Your current age in years</p>
                    <Input id="age" type="number" min={1} max={120} required placeholder="e.g. 30" value={age} onChange={e => setAge(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <Label htmlFor="height">Height (cm)</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">Your height in centimeters</p>
                    <Input id="height" type="number" min={50} max={250} required placeholder="e.g. 170" value={heightCm} onChange={e => setHeightCm(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">Your weight in kilograms</p>
                    <Input id="weight" type="number" step="0.1" min={10} max={300} required placeholder="e.g. 70" value={weightKg} onChange={e => setWeightKg(e.target.value)} className={inputClass} />
                  </div>
                  {calculatedBmi && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">
                        Calculated BMI: <span className="font-semibold text-foreground">{calculatedBmi}</span>
                        <span className="ml-2 text-[11px]">
                          {parseFloat(calculatedBmi) < 18.5 ? "(Underweight)" : parseFloat(calculatedBmi) <= 24.9 ? "(Normal)" : parseFloat(calculatedBmi) <= 29.9 ? "(Overweight)" : "(Obese)"}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </fieldset>

              {/* Clinical Vitals */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Clinical Vitals</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bp">Systolic BP</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">Upper blood pressure reading (mmHg). Normal: ~120</p>
                    <Input id="bp" type="number" min={60} max={250} required placeholder="e.g. 120" value={bpSystolic} onChange={e => setBpSystolic(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <Label htmlFor="oxygen">Oxygen Level %</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">Blood oxygen saturation (SpO2). Normal: 95–100%</p>
                    <Input id="oxygen" type="number" step="0.1" min={50} max={100} required placeholder="e.g. 98" value={oxygenLevel} onChange={e => setOxygenLevel(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </fieldset>

              {/* Lifestyle */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Lifestyle</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Diet</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">Overall quality of your daily eating habits</p>
                    <Select value={diet} onValueChange={setDiet} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Poor">Poor</SelectItem>
                        <SelectItem value="Average">Average</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="exercise">Exercise Days/Week</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">How many days per week you exercise (0–7)</p>
                    <Input id="exercise" type="number" min={0} max={7} required placeholder="0-7" value={exerciseDays} onChange={e => setExerciseDays(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <Label htmlFor="sleep">Sleep Hours</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">Average hours of sleep per night. Ideal: 7–9</p>
                    <Input id="sleep" type="number" step="0.5" min={0} max={24} required placeholder="e.g. 7" value={sleepHours} onChange={e => setSleepHours(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <Label>Stress Level</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">Your general day-to-day stress level</p>
                    <Select value={stress} onValueChange={setStress} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </fieldset>

              {/* Habits & Genetics */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Habits & Genetics</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Smoking</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">Do you currently smoke?</p>
                    <Select value={smoking} onValueChange={setSmoking} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Alcohol</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">Your alcohol intake level</p>
                    <Select value={alcohol} onValueChange={setAlcohol} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Family History</Label>
                    <p className="text-[11px] text-muted-foreground mb-1">Any chronic illness in close relatives?</p>
                    <Select value={familyHistory} onValueChange={setFamilyHistory} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </fieldset>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Analyzing…</> : "Analyze Health Risk"}
              </Button>
            </form>

            {/* Error */}
            {error && (
              <Alert variant="destructive" className="mt-6 max-w-2xl mx-auto">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Enhanced Results */}
            {result && (
              <div className="mt-8 space-y-6">
                {/* Overall Risk Banner */}
                <div className={`rounded-xl border-2 p-6 ${getRiskColor(result.risk_level)}`}>
                  <div className="flex items-center gap-4 mb-3">
                    {getRiskIcon(result.risk_level)}
                    <div>
                      <h3 className="text-2xl font-bold capitalize">Risk Level: {result.risk_level}</h3>
                      <p className="text-sm mt-1 leading-relaxed opacity-90">{getRiskAdvice(result.risk_level)}</p>
                    </div>
                  </div>
                  {result.message && (
                    <p className="text-xs mt-2 opacity-75 italic">{result.message}</p>
                  )}
                  <div className="flex gap-3 mt-4 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => { setResult(null); setError(null); }}>
                      Check Again
                    </Button>
                    {result.risk_level?.toLowerCase() !== "low" && (
                      <Link to="/booking">
                        <Button variant="default" size="sm" className="gap-2">
                          <Calendar className="w-4 h-4" />
                          Book Appointment
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Health Metrics Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Health Metrics Breakdown
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {healthMetrics.map((metric) => (
                      <Card key={metric.label} className={`border ${metric.status === "danger" ? "border-red-300 dark:border-red-800" : metric.status === "warning" ? "border-yellow-300 dark:border-yellow-800" : "border-border"}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${getStatusBg(metric.status)}`}>
                                {metric.icon}
                              </div>
                              <span className="font-medium text-sm">{metric.label}</span>
                            </div>
                            {getTrendIcon(metric.status)}
                          </div>
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>{metric.value}</span>
                            <span className="text-xs text-muted-foreground">{metric.unit}</span>
                          </div>
                          <Progress value={Math.min(((metric.value - metric.dangerMin) / (metric.dangerMax - metric.dangerMin)) * 100, 100)} className={`h-2 mb-2 ${getProgressColor(metric.status)}`} />
                          <p className="text-[11px] text-muted-foreground">
                            Normal: {metric.normalMin}–{metric.normalMax} {metric.unit}
                          </p>
                          <p className={`text-xs mt-2 ${getStatusColor(metric.status)}`}>{metric.suggestion}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Danger Zone Bar Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Vitals Danger Zone Analysis
                      </CardTitle>
                      <CardDescription className="text-xs">Your values vs normal ranges</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={dangerZoneData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                            formatter={(value: number, name: string) => [value, name === "value" ? "Your Value" : name]}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Your Value">
                            {dangerZoneData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Lifestyle Radar Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        Lifestyle Score Radar
                      </CardTitle>
                      <CardDescription className="text-xs">Higher = healthier habits (out of 100)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <RadarChart data={radarData}>
                          <PolarGrid className="opacity-30" />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Radar name="Your Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Personalized Suggestions */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Personalized Recommendations
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lifestyleSuggestions.map((s, i) => (
                      <div key={i} className={`rounded-lg border p-4 ${getSeverityStyle(s.severity)}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={getSeverityTextColor(s.severity)}>{s.icon}</span>
                          <h4 className={`font-semibold text-sm ${getSeverityTextColor(s.severity)}`}>{s.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center mt-6">
              ⚕️ This AI-generated result may not be 100% accurate. Always consult a qualified healthcare professional for proper diagnosis and treatment.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
