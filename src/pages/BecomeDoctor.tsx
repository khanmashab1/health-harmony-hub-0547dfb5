import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SEOHead } from "@/components/seo/SEOHead";
import { Stethoscope, CheckCircle, FileText, Award, Clock, Users, ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/layout/Layout";
import { DoctorApplicationForm } from "@/components/doctor/DoctorApplicationForm";
import { PaymentPlansSection } from "@/components/doctor/PaymentPlansSection";
import { useLanguage } from "@/hooks/useLanguage";
 
export default function BecomeDoctor() {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);
 
  const benefits = [
    {
      icon: Users,
      title: t("become.reachPatients"),
      description: t("become.reachPatientsDesc"),
    },
    {
      icon: Clock,
      title: t("become.flexibleSchedule"),
      description: t("become.flexibleScheduleDesc"),
    },
    {
      icon: Award,
      title: t("become.buildReputation"),
      description: t("become.buildReputationDesc"),
    },
    {
      icon: FileText,
      title: t("become.digitalPrescriptions"),
      description: t("become.digitalPrescriptionsDesc"),
    },
  ];
 
  const requirements = [
    t("become.req1"),
    t("become.req2"),
    t("become.req3"),
    t("become.req4"),
    t("become.req5"),
  ];
 
  const handleApplyClick = () => {
    setFormOpen(true);
  };
 
  return (
    <Layout>
      <SEOHead
        title="Join as a Doctor - Grow Your Practice Online"
        description="Register as a doctor on MediCare+. Manage appointments, digital prescriptions, patient queues, and grow your practice with our clinic management platform."
        keywords="register as doctor online, join clinic management software, doctor practice management, online clinic platform, healthcare SaaS for doctors"
        canonicalUrl="/become-doctor"
      />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <section className="container mx-auto px-4 py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Stethoscope className="w-5 h-5" />
              <span className="font-medium">{t("become.joinNetwork")}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t("become.title")} <span className="text-primary">MediCare+</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t("become.heroDesc")}
            </p>
          </motion.div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">{t("become.overview")}</span>
              </TabsTrigger>
              <TabsTrigger value="plans" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">{t("become.plans")}</span>
              </TabsTrigger>
              <TabsTrigger value="apply" className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                <span className="hidden sm:inline">{t("become.apply")}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-2xl font-bold text-center mb-8">{t("become.whyJoin")}</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                            <benefit.icon className="w-6 h-6 text-primary" />
                          </div>
                          <CardTitle className="text-lg">{benefit.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">{benefit.description}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle>{t("become.eligibility")}</CardTitle>
                    <CardDescription>{t("become.eligibilityDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              <div className="text-center">
                <Button size="lg" onClick={() => setActiveTab("plans")}>
                  {t("become.viewPlans")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="plans" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">{t("become.choosePlan")}</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    {t("become.choosePlanDesc")}
                  </p>
                </div>
                <PaymentPlansSection />
                <div className="text-center mt-8">
                  <Button size="lg" onClick={() => setActiveTab("apply")}>
                    {t("become.continueToApp")}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="apply">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle>{t("become.terms")}</CardTitle>
                    <CardDescription>{t("become.termsDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      <div className="space-y-4 text-sm text-muted-foreground">
                        <h4 className="font-semibold text-foreground">{t("become.term1Title")}</h4>
                        <p>{t("become.term1")}</p>
                        <h4 className="font-semibold text-foreground">{t("become.term2Title")}</h4>
                        <p>{t("become.term2")}</p>
                        <h4 className="font-semibold text-foreground">{t("become.term3Title")}</h4>
                        <p>{t("become.term3")}</p>
                        <h4 className="font-semibold text-foreground">{t("become.term4Title")}</h4>
                        <p>{t("become.term4")}</p>
                        <h4 className="font-semibold text-foreground">{t("become.term5Title")}</h4>
                        <p>{t("become.term5")}</p>
                        <h4 className="font-semibold text-foreground">{t("become.term6Title")}</h4>
                        <p>{t("become.term6")}</p>
                        <h4 className="font-semibold text-foreground">{t("become.term7Title")}</h4>
                        <p>{t("become.term7")}</p>
                      </div>
                    </ScrollArea>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                      />
                      <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                        {t("become.termsAccept")}
                      </Label>
                    </div>

                    <Dialog open={formOpen} onOpenChange={setFormOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="lg"
                          variant="hero"
                          className="w-full"
                          disabled={!acceptedTerms}
                          onClick={handleApplyClick}
                        >
                          <Stethoscope className="w-5 h-5 mr-2" />
                          {t("become.applyButton")}
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DoctorApplicationForm onSuccess={() => setFormOpen(false)} />
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </Layout>
  );
}
