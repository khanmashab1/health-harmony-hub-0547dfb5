import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, seoSchemas } from "@/components/seo/SEOHead";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Brain, 
  Stethoscope, 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  ArrowRight,
  Loader2,
  ShieldAlert,
  Target,
  TrendingUp,
  ListChecks,
  Gauge,
  Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SYMPTOM_TAG_KEYS = [
  "headache", "fever", "cough", "fatigue", "nausea", 
  "dizziness", "chestPain", "shortnessOfBreath", "backPain",
  "stomachPain", "jointPain", "skinRash", "soreThroat",
  "muscleAches", "lossOfAppetite", "insomnia", "anxiety"
];

const SYMPTOM_TAGS_EN = [
  "Headache", "Fever", "Cough", "Fatigue", "Nausea", 
  "Dizziness", "Chest Pain", "Shortness of Breath", "Back Pain",
  "Stomach Pain", "Joint Pain", "Skin Rash", "Sore Throat",
  "Muscle Aches", "Loss of Appetite", "Insomnia", "Anxiety"
];

interface ConditionResult {
  name: string;
  percentage: number;
  description: string;
}

interface Analysis {
  conditions: ConditionResult[];
  differentials: { name: string; description: string }[];
  severity: string;
  triage_advice: string;
  confidence_level: number;
  raw_analysis: string;
  consult_immediately: boolean;
}

export default function SymptomsChecker() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  
  const [symptoms, setSymptoms] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim() && selectedTags.length === 0) {
      toast.error(t("symptoms.whatSymptoms"));
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-symptoms', {
        body: {
          symptoms,
          age: age ? parseInt(age) : null,
          gender, duration, severity, medicalHistory,
          selectedTags: selectedTags.map((tag) => {
            const idx = SYMPTOM_TAG_KEYS.indexOf(tag);
            return idx >= 0 ? SYMPTOM_TAGS_EN[idx] : tag;
          })
        }
      });

      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }

      setAnalysis(data);
      setStep(3);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Error analyzing symptoms:", error);
      toast.error(error.message || "Failed to analyze symptoms. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetChecker = () => {
    setStep(1);
    setSymptoms("");
    setSelectedTags([]);
    setAge("");
    setGender("");
    setDuration("");
    setSeverity("");
    setMedicalHistory("");
    setAnalysis(null);
  };

  const getSeverityConfig = (level: string) => {
    switch (level) {
      case 'low': return { color: 'bg-green-500/10 text-green-600 border-green-500/30', label: 'Low', icon: CheckCircle2, bg: 'bg-green-500' };
      case 'moderate': return { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', label: 'Moderate', icon: Activity, bg: 'bg-yellow-500' };
      case 'high': return { color: 'bg-orange-500/10 text-orange-600 border-orange-500/30', label: 'High', icon: AlertTriangle, bg: 'bg-orange-500' };
      case 'critical': return { color: 'bg-red-500/10 text-red-600 border-red-500/30', label: 'Critical', icon: ShieldAlert, bg: 'bg-red-500' };
      default: return { color: 'bg-muted text-muted-foreground border-border', label: 'Unknown', icon: Activity, bg: 'bg-muted' };
    }
  };

  return (
    <Layout>
      <SEOHead
        title="AI Symptom Checker - Free Health Assessment"
        description="Use MediCare+ AI-powered symptom checker to get preliminary health insights."
        keywords="AI symptom checker, online health assessment, symptom analysis"
        canonicalUrl="/symptoms"
        jsonLd={seoSchemas.medicalService({
          name: "AI-Powered Symptom Checker",
          description: "Describe your symptoms and get AI-powered health analysis.",
          url: "/symptoms",
        })}
      />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{t("symptoms.title")}</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">{t("symptoms.description")}</p>
          </motion.div>

          {/* Disclaimer */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-6">
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-start gap-3 py-4">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>{t("symptoms.disclaimer")}</strong> {t("symptoms.disclaimerText")}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>{s}</div>
                {s < 3 && <div className={`w-12 h-1 mx-1 rounded ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Symptoms Input */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-primary" />
                      {t("symptoms.describeSymptoms")}
                    </CardTitle>
                    <CardDescription>{t("symptoms.tellUs")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>{t("symptoms.whatSymptoms")}</Label>
                      <Textarea
                        placeholder={t("symptoms.symptomsPlaceholder")}
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        className="min-h-[120px] resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("symptoms.quickSelect")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {SYMPTOM_TAG_KEYS.map((key) => (
                          <Badge
                            key={key}
                            variant={selectedTags.includes(key) ? "default" : "outline"}
                            className="cursor-pointer transition-all hover:scale-105"
                            onClick={() => toggleTag(key)}
                          >
                            {t(`symptomTag.${key}`)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button onClick={() => setStep(2)} className="w-full" disabled={!symptoms.trim() && selectedTags.length === 0}>
                      {t("symptoms.continue")} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Additional Info */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      {t("symptoms.additionalInfo")}
                    </CardTitle>
                    <CardDescription>{t("symptoms.helpAnalysis")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">{t("symptoms.yourAge")}</Label>
                        <Input id="age" type="number" placeholder={t("symptoms.enterAge")} value={age} onChange={(e) => setAge(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">{t("common.gender")}</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger><SelectValue placeholder={t("symptoms.selectGender")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t("common.male")}</SelectItem>
                            <SelectItem value="female">{t("common.female")}</SelectItem>
                            <SelectItem value="other">{t("common.other")}</SelectItem>
                            <SelectItem value="prefer-not-to-say">{t("symptoms.preferNotToSay")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duration">{t("symptoms.howLong")}</Label>
                        <Select value={duration} onValueChange={setDuration}>
                          <SelectTrigger><SelectValue placeholder={t("symptoms.selectDuration")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="less-than-day">{t("symptoms.lessThanDay")}</SelectItem>
                            <SelectItem value="1-3-days">{t("symptoms.1to3Days")}</SelectItem>
                            <SelectItem value="4-7-days">{t("symptoms.4to7Days")}</SelectItem>
                            <SelectItem value="1-2-weeks">{t("symptoms.1to2Weeks")}</SelectItem>
                            <SelectItem value="more-than-2-weeks">{t("symptoms.moreThan2Weeks")}</SelectItem>
                            <SelectItem value="chronic">{t("symptoms.chronic")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="severity">{t("symptoms.severityLevel")}</Label>
                        <Select value={severity} onValueChange={setSeverity}>
                          <SelectTrigger><SelectValue placeholder={t("symptoms.selectSeverity")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mild">{t("symptoms.mild")}</SelectItem>
                            <SelectItem value="moderate">{t("symptoms.moderate")}</SelectItem>
                            <SelectItem value="severe">{t("symptoms.severe")}</SelectItem>
                            <SelectItem value="very-severe">{t("symptoms.verySevere")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="history">{t("symptoms.medicalHistory")}</Label>
                      <Textarea id="history" placeholder={t("symptoms.medicalHistoryPlaceholder")} value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} className="min-h-[80px] resize-none" />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1">{t("common.back")}</Button>
                      <Button onClick={handleAnalyze} disabled={isAnalyzing} className="flex-1">
                        {isAnalyzing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("symptoms.analyzing")}</>) : (<><Brain className="w-4 h-4 mr-2" />{t("symptoms.analyzeSymptoms")}</>)}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Results */}
            {step === 3 && analysis && (() => {
              const conditions = analysis.conditions || [];
              const differentials = analysis.differentials || [];
              const confidence = analysis.confidence_level || 0;
              const primaryCondition = conditions[0];
              const isLikely = confidence >= 85;
              const severityCfg = getSeverityConfig(analysis.severity);

              // Recommendation based on severity
              const getRecommendation = () => {
                switch (analysis.severity) {
                  case 'critical': return { text: 'Seek emergency medical care immediately. Do not delay.', urgent: true };
                  case 'high': return { text: 'Consult a doctor within 24 hours. Schedule an urgent appointment.', urgent: true };
                  case 'moderate': return { text: 'Schedule a doctor visit if symptoms persist beyond 48 hours or worsen.', urgent: false };
                  default: return { text: 'Monitor at home. If symptoms worsen or persist beyond a week, schedule a visit.', urgent: false };
                }
              };
              const recommendation = getRecommendation();

              return (
              <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">

                {/* Emergency Banner */}
                {recommendation.urgent && (
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
                    <Card className="border-2 border-red-500/50 bg-red-500/5">
                      <CardContent className="flex items-center gap-4 py-5">
                        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <p className="font-bold text-red-600 text-lg">Consult a Doctor Immediately</p>
                          <p className="text-sm text-red-600/80">{recommendation.text}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Primary Condition Card */}
                {primaryCondition && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Target className="w-5 h-5 text-primary" />
                          {isLikely ? 'Likely Condition' : 'Possible Consideration'}
                        </CardTitle>
                        <Badge variant={isLikely ? "default" : "secondary"} className="text-xs">
                          {isLikely ? 'High Match' : 'Possible'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {conditions.slice(0, 2).map((c, i) => (
                        <div key={i} className="p-4 rounded-xl bg-muted/50 border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-foreground text-base">{c.name}</p>
                            {c.percentage > 0 && (
                              <span className="text-sm font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">{c.percentage}%</span>
                            )}
                          </div>
                          {c.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Confidence & Risk Level Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Confidence Level</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-end justify-between">
                          <span className="text-3xl font-bold text-foreground">{confidence}%</span>
                          <span className="text-xs text-muted-foreground">database match</span>
                        </div>
                        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${confidence}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border ${severityCfg.color}`}>
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                          <Gauge className="w-4 h-4" />
                        </div>
                        <p className="text-sm font-medium">Risk Level</p>
                      </div>
                      <p className="text-3xl font-bold capitalize">{severityCfg.label}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {analysis.severity === 'low' && 'Low risk — manageable with self-care'}
                        {analysis.severity === 'moderate' && 'Medium risk — monitor closely'}
                        {analysis.severity === 'high' && 'High risk — medical attention advised'}
                        {analysis.severity === 'critical' && 'Critical — seek emergency care'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Advice to Treat */}
                {analysis.triage_advice && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ListChecks className="w-5 h-5 text-primary" />
                        Advice to Treat
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{analysis.triage_advice}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendation */}
                <Card className={recommendation.urgent ? "border-red-500/30 bg-red-500/5" : "border-primary/30 bg-primary/5"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Stethoscope className="w-5 h-5" />
                      Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium leading-relaxed">{recommendation.text}</p>
                  </CardContent>
                </Card>

                {/* Differential Considerations */}
                {differentials.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="w-5 h-5 text-muted-foreground" />
                        Differential Considerations
                      </CardTitle>
                      <CardDescription>Other conditions to keep in mind</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {differentials.map((d, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium text-sm text-foreground">{d.name}</p>
                              {d.description && <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Disclaimer */}
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="flex items-start gap-3 py-4">
                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/70 leading-relaxed">
                      This is an AI-powered triage and not a substitute for professional medical advice.
                    </p>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetChecker} className="flex-1 h-12">
                    {t("symptoms.checkNewSymptoms")}
                  </Button>
                  <Button onClick={() => window.location.href = '/booking'} className="flex-1 h-12">
                    <Stethoscope className="w-4 h-4 mr-2" />
                    {t("symptoms.bookAppointment")}
                  </Button>
                </div>
              </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
