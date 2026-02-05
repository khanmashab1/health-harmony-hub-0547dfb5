import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Sparkles } from "lucide-react";
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

interface PaymentPlansSectionProps {
  onSelectPlan?: (plan: PaymentPlan) => void;
  selectedPlanId?: string;
}

export function PaymentPlansSection({ onSelectPlan, selectedPlanId }: PaymentPlansSectionProps) {
  const { data: plans, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-24 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-muted rounded mb-4" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!plans?.length) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-muted-foreground">No payment plans available at the moment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card
            className={`relative h-full flex flex-col transition-all duration-200 hover:shadow-lg ${
              plan.is_popular
                ? "ring-2 ring-primary shadow-lg scale-[1.02]"
                : "hover:-translate-y-1"
            } ${selectedPlanId === plan.id ? "ring-2 ring-primary bg-primary/5" : ""}`}
          >
            {plan.is_popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground shadow-md">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-2 pt-6">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              {plan.description && (
                <CardDescription>{plan.description}</CardDescription>
              )}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold text-primary">Free</span>
                  ) : (
                    <>
                      <span className="text-lg text-muted-foreground">PKR</span>
                      <span className="text-4xl font-bold text-primary">
                        {plan.price.toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
                {plan.price > 0 && (
                  <span className="text-sm text-muted-foreground">
                    per {plan.billing_period}
                  </span>
                )}
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {onSelectPlan && (
                <Button
                  variant={plan.is_popular ? "default" : "outline"}
                  className="w-full"
                  onClick={() => onSelectPlan(plan)}
                >
                  {selectedPlanId === plan.id ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    <>
                      {plan.is_popular && <Sparkles className="w-4 h-4 mr-2" />}
                      Choose {plan.name}
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
