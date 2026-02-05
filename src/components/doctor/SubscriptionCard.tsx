import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Check, ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface PaymentPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_period: string;
  features: string[];
  is_popular: boolean;
  sort_order: number;
}

interface SubscriptionCardProps {
  userId: string | undefined;
  currentPlan: {
    id: string;
    name: string;
    price: number;
    billing_period: string;
  } | null;
}

export function SubscriptionCard({ userId, currentPlan }: SubscriptionCardProps) {
  const [showPlansDialog, setShowPlansDialog] = useState(false);

  const { data: plans } = useQuery({
    queryKey: ["doctor-payment-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_payment_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as PaymentPlan[];
    },
  });

  const currentPlanDetails = plans?.find(p => p.id === currentPlan?.id);

  return (
    <>
      <Card variant="glass" className="border-white/50">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-brand-500" />
            Subscription Plan
          </CardTitle>
          <CardDescription>
            Manage your subscription and view available plans
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {currentPlan ? (
            <div className="space-y-6">
              {/* Current Plan Display */}
              <div className="flex items-start justify-between p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Crown className="w-3 h-3 mr-1" />
                      Current Plan
                    </Badge>
                  </div>
                  <h3 className="text-xl font-bold">{currentPlan.name}</h3>
                  <p className="text-muted-foreground">
                    {currentPlan.price === 0 ? (
                      "Free"
                    ) : (
                      <>PKR {currentPlan.price.toLocaleString()} / {currentPlan.billing_period}</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-50 dark:bg-green-900/20">
                    Active
                  </Badge>
                </div>
              </div>

              {/* Current Plan Features */}
              {currentPlanDetails?.features && currentPlanDetails.features.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Included Features</h4>
                  <ul className="grid gap-2">
                    {currentPlanDetails.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Upgrade Button */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowPlansDialog(true)}
              >
                View All Plans
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Crown className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">No Active Plan</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You don't have an active subscription plan.
                </p>
              </div>
              <Button onClick={() => setShowPlansDialog(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                View Available Plans
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans Dialog */}
      <Dialog open={showPlansDialog} onOpenChange={setShowPlansDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Subscription Plans
            </DialogTitle>
            <DialogDescription>
              Choose a plan that best fits your practice needs
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 py-4">
            {plans?.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`relative h-full flex flex-col transition-all duration-200 ${
                    plan.is_popular
                      ? "ring-2 ring-primary shadow-lg"
                      : currentPlan?.id === plan.id
                      ? "ring-2 ring-green-500 bg-green-50/50 dark:bg-green-900/10"
                      : "hover:shadow-md"
                  }`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground shadow-md">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {currentPlan?.id === plan.id && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-green-500 text-white shadow-md">
                        <Check className="w-3 h-3 mr-1" />
                        Current
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2 pt-6">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.description && (
                      <CardDescription className="text-xs">{plan.description}</CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    <div className="text-center mb-4">
                      <div className="flex items-baseline justify-center gap-1">
                        {plan.price === 0 ? (
                          <span className="text-3xl font-bold text-primary">Free</span>
                        ) : (
                          <>
                            <span className="text-sm text-muted-foreground">PKR</span>
                            <span className="text-3xl font-bold text-primary">
                              {plan.price.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                      {plan.price > 0 && (
                        <span className="text-xs text-muted-foreground">
                          per {plan.billing_period}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2 flex-1 mb-4">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-xs">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={currentPlan?.id === plan.id ? "outline" : plan.is_popular ? "default" : "outline"}
                      className="w-full"
                      disabled={currentPlan?.id === plan.id}
                    >
                      {currentPlan?.id === plan.id ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Current Plan
                        </>
                      ) : (
                        <>
                          {plan.is_popular && <Sparkles className="w-4 h-4 mr-2" />}
                          {currentPlan ? "Upgrade" : "Select"} Plan
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            To change your subscription, please contact support.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
