import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
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
  Clock, 
  Heart,
  Thermometer,
  Activity,
  Pill,
  ArrowRight,
  Loader2,
  ShieldAlert,
  Lightbulb
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SYMPTOM_TAGS = [
  "Headache", "Fever", "Cough", "Fatigue", "Nausea", 
  "Dizziness", "Chest Pain", "Shortness of Breath", "Back Pain",
  "Stomach Pain", "Joint Pain", "Skin Rash", "Sore Throat",
  "Muscle Aches", "Loss of Appetite", "Insomnia", "Anxiety"
];

interface Analysis {
  possible_conditions: Array<{
    name: string;
    likelihood: string;
    description: string;
  }>;
  recommendations: string[];
  urgency_level: string;
  when_to_seek_help: string;
  lifestyle_tips: string[];
}

export default function SymptomsChecker() {
  const { user } = useAuth();
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
      toast.error("Please describe your symptoms or select at least one symptom tag");
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
          selectedTags
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAnalysis(data.analysis);
      setStep(3);

      // Save submission to database if user is logged in
      if (user) {
        await supabase.from('symptom_submissions').insert({
          patient_user_id: user.id,
          symptoms_text: symptoms,
          selected_tags: selectedTags,
          age: age ? parseInt(age) : null,
          gender,
          duration,
          severity,
          medical_history: medicalHistory,
          result_condition: data.analysis.possible_conditions?.[0]?.name,
          result_advice: data.analysis.recommendations?.join('; '),
          result_confidence: data.analysis.urgency_level === 'low' ? 80 : data.analysis.urgency_level === 'moderate' ? 60 : 40
        });
      }

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
            <h1 className="text-3xl font-bold mb-2">AI Symptom Checker</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Describe your symptoms and get AI-powered health insights. 
              Remember, this is not a replacement for professional medical advice.
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
                  <strong>Medical Disclaimer:</strong> This tool provides general health information only. 
                  It is not a substitute for professional medical advice, diagnosis, or treatment. 
                  Always consult a healthcare provider for medical concerns.
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
                      Describe Your Symptoms
                    </CardTitle>
                    <CardDescription>
                      Tell us what you're experiencing. Be as specific as possible.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>What symptoms are you experiencing?</Label>
                      <Textarea
                        placeholder="E.g., I've had a persistent headache for 3 days, along with mild fever and fatigue..."
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        className="min-h-[120px] resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Quick select common symptoms</Label>
                      <div className="flex flex-wrap gap-2">
                        {SYMPTOM_TAGS.map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer transition-all hover:scale-105"
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={() => setStep(2)} 
                      className="w-full"
                      disabled={!symptoms.trim() && selectedTags.length === 0}
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
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
                      Additional Information
                    </CardTitle>
                    <CardDescription>
                      Help us provide a more accurate analysis (optional but recommended).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">Age</Label>
                        <Input
                          id="age"
                          type="number"
                          placeholder="Enter your age"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duration">How long have you had these symptoms?</Label>
                        <Select value={duration} onValueChange={setDuration}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="less-than-day">Less than a day</SelectItem>
                            <SelectItem value="1-3-days">1-3 days</SelectItem>
                            <SelectItem value="4-7-days">4-7 days</SelectItem>
                            <SelectItem value="1-2-weeks">1-2 weeks</SelectItem>
                            <SelectItem value="more-than-2-weeks">More than 2 weeks</SelectItem>
                            <SelectItem value="chronic">Ongoing/Chronic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="severity">Severity level</Label>
                        <Select value={severity} onValueChange={setSeverity}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mild">Mild - Noticeable but not disruptive</SelectItem>
                            <SelectItem value="moderate">Moderate - Affecting daily activities</SelectItem>
                            <SelectItem value="severe">Severe - Significantly impacting life</SelectItem>
                            <SelectItem value="very-severe">Very Severe - Unbearable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="history">Relevant medical history (optional)</Label>
                      <Textarea
                        id="history"
                        placeholder="E.g., diabetes, hypertension, allergies, current medications..."
                        value={medicalHistory}
                        onChange={(e) => setMedicalHistory(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                        Back
                      </Button>
                      <Button onClick={handleAnalyze} disabled={isAnalyzing} className="flex-1">
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4 mr-2" />
                            Analyze Symptoms
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
                      {analysis.urgency_level === 'emergency' ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : analysis.urgency_level === 'high' ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6" />
                      )}
                      <div>
                        <p className="font-semibold capitalize">Urgency Level: {analysis.urgency_level}</p>
                        <p className="text-sm opacity-80">
                          {analysis.urgency_level === 'emergency' 
                            ? 'Seek immediate medical attention!' 
                            : analysis.urgency_level === 'high'
                            ? 'Consider seeing a doctor soon'
                            : 'Monitor symptoms and consult if they persist'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Possible Conditions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Thermometer className="w-5 h-5 text-primary" />
                      Possible Conditions
                    </CardTitle>
                    <CardDescription>
                      Based on your symptoms, these conditions may be relevant
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.possible_conditions?.map((condition, index) => (
                      <div key={index} className="p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">{condition.name}</h4>
                          <Badge className={getLikelihoodColor(condition.likelihood)}>
                            {condition.likelihood} likelihood
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{condition.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="w-5 h-5 text-primary" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {analysis.recommendations?.map((rec, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* When to Seek Help */}
                <Card className="border-orange-500/30 bg-orange-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <Clock className="w-5 h-5" />
                      When to Seek Medical Help
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-orange-700 dark:text-orange-400">{analysis.when_to_seek_help}</p>
                  </CardContent>
                </Card>

                {/* Lifestyle Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-primary" />
                      Wellness Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.lifestyle_tips?.map((tip, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Heart className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button variant="outline" onClick={resetChecker} className="flex-1">
                    Check New Symptoms
                  </Button>
                  <Button onClick={() => window.location.href = '/booking'} className="flex-1">
                    Book Appointment
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
