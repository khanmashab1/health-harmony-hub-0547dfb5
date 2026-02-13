import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, HeartPulse, Calendar, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";

interface RiskResult {
  risk_level: string;
  message?: string;
  [key: string]: unknown;
}

// Proxied through edge function to avoid CORS

export default function RiskEvaluator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [age, setAge] = useState("");
  const [bmi, setBmi] = useState("");
  const [bpSystolic, setBpSystolic] = useState("");
  const [oxygenLevel, setOxygenLevel] = useState("");
  const [diet, setDiet] = useState("");
  const [exerciseDays, setExerciseDays] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [stress, setStress] = useState("");
  const [smoking, setSmoking] = useState("");
  const [alcohol, setAlcohol] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const payload = {
      age: parseInt(age),
      bmi: parseFloat(bmi),
      bp_systolic: parseInt(bpSystolic),
      oxygen_level: parseFloat(oxygenLevel),
      diet: diet,
      exercise_days: parseInt(exerciseDays),
      sleep_hours: parseFloat(sleepHours),
      stress: stress,
      smoking: smoking,
      alcohol: alcohol,
      family_history: familyHistory,
    };

    try {
      const { data, error: fnError } = await supabase.functions.invoke("health-risk-proxy", {
        body: payload,
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (err: unknown) {
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
    if (l === "low") return <ShieldCheck className="w-6 h-6 text-green-600" />;
    if (l === "medium") return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
    return <ShieldAlert className="w-6 h-6 text-red-600" />;
  };

  const getRiskAdvice = (level: string) => {
    const l = level?.toLowerCase();
    if (l === "low") return "Your vitals look healthy! Keep maintaining your lifestyle and schedule routine checkups.";
    if (l === "medium") return "Some risk factors detected. Consider consulting a doctor for a preventive health checkup.";
    return "⚠️ High risk detected! We strongly recommend booking an appointment with a doctor immediately for a thorough evaluation.";
  };

  const inputClass = "bg-background";

  return (
    <Layout>
      <SEOHead
        title="AI Health Risk Evaluator | MediCare+"
        description="Get a real-time, AI-driven assessment of your health vitals."
        canonicalUrl="/risk-evaluator"
      />
      <div className="container mx-auto px-4 py-10 max-w-2xl">
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Biometrics */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Biometrics</legend>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" type="number" min={1} max={120} required placeholder="e.g. 30" value={age} onChange={e => setAge(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <Label htmlFor="bmi">BMI</Label>
                    <Input id="bmi" type="number" step="0.1" min={10} max={60} required placeholder="e.g. 24.5" value={bmi} onChange={e => setBmi(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </fieldset>

              {/* Clinical Vitals */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Clinical Vitals</legend>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bp">Systolic BP</Label>
                    <Input id="bp" type="number" min={60} max={250} required placeholder="e.g. 120" value={bpSystolic} onChange={e => setBpSystolic(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <Label htmlFor="oxygen">Oxygen Level %</Label>
                    <Input id="oxygen" type="number" step="0.1" min={50} max={100} required placeholder="e.g. 98" value={oxygenLevel} onChange={e => setOxygenLevel(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </fieldset>

              {/* Lifestyle */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Lifestyle</legend>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Diet</Label>
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
                    <Input id="exercise" type="number" min={0} max={7} required placeholder="0-7" value={exerciseDays} onChange={e => setExerciseDays(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <Label htmlFor="sleep">Sleep Hours</Label>
                    <Input id="sleep" type="number" step="0.5" min={0} max={24} required placeholder="e.g. 7" value={sleepHours} onChange={e => setSleepHours(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <Label>Stress Level</Label>
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
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Smoking</Label>
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
              <Alert variant="destructive" className="mt-6">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Result */}
            {result && (
              <div className={`mt-6 rounded-xl border-2 p-5 ${getRiskColor(result.risk_level)}`}>
                <div className="flex items-center gap-3 mb-2">
                  {getRiskIcon(result.risk_level)}
                  <span className="text-xl font-bold capitalize">
                    Risk Level: {result.risk_level}
                  </span>
                </div>
                <p className="text-sm mt-2 leading-relaxed">{getRiskAdvice(result.risk_level)}</p>
                {result.message && (
                  <p className="text-xs mt-2 opacity-75 italic">{result.message}</p>
                )}
                {result.risk_level?.toLowerCase() !== "low" && (
                  <Link to="/booking" className="mt-4 inline-block">
                    <Button variant="default" size="sm" className="gap-2">
                      <Calendar className="w-4 h-4" />
                      Book Appointment
                    </Button>
                  </Link>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center mt-6">
              ⚕️ This AI tool is for educational purposes and does not replace professional medical diagnosis.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
