import { useState } from "react";
import ReactMarkdown from "react-markdown";
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

interface Analysis {
  raw_analysis: string;
  urgency_level: string;
}

export default function SymptomsChecker() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  
  // Form state
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
          gender,
          duration,
          severity,
          medicalHistory,
          selectedTags: selectedTags.map((tag) => {
            // Always send English tags to the API
            const idx = SYMPTOM_TAG_KEYS.indexOf(tag);
            return idx >= 0 ? SYMPTOM_TAGS_EN[idx] : tag;
          })
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAnalysis({
        raw_analysis: data.raw_analysis || '',
        urgency_level: data.urgency_level || 'moderate',
      });
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

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'moderate': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'emergency': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case 'high': return 'bg-red-500/10 text-red-600';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600';
      case 'low': return 'bg-green-500/10 text-green-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Layout>
      <SEOHead
        title="AI Symptom Checker - Free Health Assessment"
        description="Use MediCare+ AI-powered symptom checker to get preliminary health insights. Describe your symptoms and receive AI analysis with doctor recommendations."
        keywords="AI symptom checker, online health assessment, symptom analysis, medical symptom checker, health AI tool, check symptoms online free"
        canonicalUrl="/symptoms"
        jsonLd={seoSchemas.medicalService({
          name: "AI-Powered Symptom Checker",
          description: "Describe your symptoms and get AI-powered health analysis with personalized doctor recommendations.",
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
            <p className="text-muted-foreground max-w-lg mx-auto">
              {t("symptoms.description")}
            </p>
          </motion.div>

          {/* Disclaimer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
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
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-1 mx-1 rounded ${step > s ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Symptoms Input */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-primary" />
                      {t("symptoms.describeSymptoms")}
                    </CardTitle>
                    <CardDescription>
                      {t("symptoms.tellUs")}
                    </CardDescription>
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
                        {SYMPTOM_TAG_KEYS.map((key, idx) => (
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

                    <Button 
                      onClick={() => setStep(2)} 
                      className="w-full"
                      disabled={!symptoms.trim() && selectedTags.length === 0}
                    >
                      {t("symptoms.continue")} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Additional Info */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      {t("symptoms.additionalInfo")}
                    </CardTitle>
                    <CardDescription>
                      {t("symptoms.helpAnalysis")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">{t("symptoms.yourAge")}</Label>
                        <Input
                          id="age"
                          type="number"
                          placeholder={t("symptoms.enterAge")}
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">{t("common.gender")}</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("symptoms.selectGender")} />
                          </SelectTrigger>
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
                          <SelectTrigger>
                            <SelectValue placeholder={t("symptoms.selectDuration")} />
                          </SelectTrigger>
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
                          <SelectTrigger>
                            <SelectValue placeholder={t("symptoms.selectSeverity")} />
                          </SelectTrigger>
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
                      <Textarea
                        id="history"
                        placeholder={t("symptoms.medicalHistoryPlaceholder")}
                        value={medicalHistory}
                        onChange={(e) => setMedicalHistory(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                        {t("common.back")}
                      </Button>
                      <Button onClick={handleAnalyze} disabled={isAnalyzing} className="flex-1">
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t("symptoms.analyzing")}
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4 mr-2" />
                            {t("symptoms.analyzeSymptoms")}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Results */}
            {step === 3 && analysis && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Urgency Level */}
                <Card className={`border-2 ${getUrgencyColor(analysis.urgency_level)}`}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      {analysis.urgency_level === 'high' || analysis.urgency_level === 'emergency' ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6" />
                      )}
                      <div>
                        <p className="font-semibold capitalize">{t("symptoms.urgencyLevel")}: {analysis.urgency_level}</p>
                        <p className="text-sm opacity-80">
                          {analysis.urgency_level === 'emergency' 
                            ? t("symptoms.emergency")
                            : analysis.urgency_level === 'high'
                            ? t("symptoms.high")
                            : t("symptoms.low")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      AI Analysis Report
                    </CardTitle>
                    <CardDescription>
                      Powered by MediCare++ RAG AI Engine
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-base [&_h4]:font-medium [&_ul]:space-y-1 [&_li]:text-sm [&_p]:text-sm [&_strong]:text-foreground [&_hr]:my-4 [&_hr]:border-border">
                      <ReactMarkdown>{analysis.raw_analysis}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>

                {/* Disclaimer */}
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                      <ShieldAlert className="w-5 h-5" />
                      {t("symptoms.disclaimer")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      {t("symptoms.disclaimerText")}
                    </p>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button variant="outline" onClick={resetChecker} className="flex-1">
                    {t("symptoms.checkNewSymptoms")}
                  </Button>
                  <Button onClick={() => window.location.href = '/booking'} className="flex-1">
                    {t("symptoms.bookAppointment")}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
