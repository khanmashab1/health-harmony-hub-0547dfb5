import { useState, useEffect } from "react";
import { Wallet, Save, Loader2, Building2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentSettingsCardProps {
  userId: string | undefined;
  doctorInfo: {
    easypaisa_number?: string | null;
    jazzcash_number?: string | null;
    bank_name?: string | null;
    bank_account_number?: string | null;
    bank_account_title?: string | null;
  } | null | undefined;
}

export function PaymentSettingsCard({ userId, doctorInfo }: PaymentSettingsCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [easypaisa, setEasypaisa] = useState("");
  const [jazzcash, setJazzcash] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankTitle, setBankTitle] = useState("");

  useEffect(() => {
    if (doctorInfo) {
      setEasypaisa(doctorInfo.easypaisa_number || "");
      setJazzcash(doctorInfo.jazzcash_number || "");
      setBankName(doctorInfo.bank_name || "");
      setBankAccount(doctorInfo.bank_account_number || "");
      setBankTitle(doctorInfo.bank_account_title || "");
    }
  }, [doctorInfo]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not found");

      const { error } = await supabase
        .from("doctors")
        .update({
          easypaisa_number: easypaisa.trim() || null,
          jazzcash_number: jazzcash.trim() || null,
          bank_name: bankName.trim() || null,
          bank_account_number: bankAccount.trim() || null,
          bank_account_title: bankTitle.trim() || null,
        })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-info"] });
      toast({ title: "Payment settings saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save payment settings", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card variant="glass" className="border-white/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-brand-500" />
          Payment Methods
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          Configure your payment details. These will be shown to patients when they book online payment appointments.
        </p>

        {/* Mobile Wallets Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            <span>Mobile Wallets</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="easypaisa" className="font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Easypaisa Number
              </Label>
              <Input
                id="easypaisa"
                type="tel"
                value={easypaisa}
                onChange={(e) => setEasypaisa(e.target.value)}
                placeholder="03XX-XXXXXXX"
                className="border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jazzcash" className="font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                JazzCash Number
              </Label>
              <Input
                id="jazzcash"
                type="tel"
                value={jazzcash}
                onChange={(e) => setJazzcash(e.target.value)}
                placeholder="03XX-XXXXXXX"
                className="border-border/50"
              />
            </div>
          </div>
        </div>

        {/* Bank Details Section */}
        <div className="space-y-4 pt-4 border-t border-border/30">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span>Bank Account Details</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName" className="font-medium">Bank Name</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., HBL, MCB, UBL"
                className="border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankTitle" className="font-medium">Account Holder Name</Label>
              <Input
                id="bankTitle"
                value={bankTitle}
                onChange={(e) => setBankTitle(e.target.value)}
                placeholder="Name as on bank account"
                className="border-border/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankAccount" className="font-medium">Account Number / IBAN</Label>
            <Input
              id="bankAccount"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="Enter account number or IBAN"
              className="border-border/50"
            />
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          variant="hero"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Payment Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
