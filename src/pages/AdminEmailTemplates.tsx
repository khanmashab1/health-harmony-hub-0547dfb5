import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Palette, Save, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/layout/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EmailTemplate {
  id: string;
  template_type: string;
  subject: string;
  clinic_name: string | null;
  clinic_logo_url: string | null;
  primary_color: string | null;
  footer_text: string | null;
  header_text: string | null;
  body_template: string;
}

const TEMPLATE_LABELS: Record<string, { label: string; description: string }> = {
  payment_confirmed: {
    label: "Payment Confirmed",
    description: "Sent when PA confirms patient payment"
  },
  payment_rejected: {
    label: "Payment Rejected",
    description: "Sent when PA rejects patient payment"
  },
  appointment_reminder: {
    label: "Appointment Reminder",
    description: "Sent before scheduled appointments"
  }
};

const TEMPLATE_VARIABLES = [
  { var: "{patient_name}", desc: "Patient's full name" },
  { var: "{doctor_name}", desc: "Doctor's name" },
  { var: "{appointment_date}", desc: "Appointment date" },
  { var: "{token_number}", desc: "Token number" },
  { var: "{rejection_reason}", desc: "Reason for rejection (rejection emails only)" },
];

export default function AdminEmailTemplates() {
  const { loading } = useRequireAuth(["admin"]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  // Fetch email templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_type");
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: async (template: Partial<EmailTemplate> & { id: string }) => {
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: template.subject,
          clinic_name: template.clinic_name,
          clinic_logo_url: template.clinic_logo_url,
          primary_color: template.primary_color,
          footer_text: template.footer_text,
          header_text: template.header_text,
          body_template: template.body_template,
        })
        .eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Template saved successfully" });
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to save", description: error.message });
    },
  });

  // Generate preview HTML
  const generatePreview = (template: EmailTemplate) => {
    const primaryColor = template.primary_color || "#0066cc";
    const clinicName = template.clinic_name || "Medical Clinic";
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: ${primaryColor}; padding: 24px; text-align: center;">
              ${template.clinic_logo_url 
                ? `<img src="${template.clinic_logo_url}" alt="${clinicName}" style="max-height: 60px; margin-bottom: 12px;">`
                : ""
              }
              <h1 style="color: white; margin: 0; font-size: 24px;">${clinicName}</h1>
              ${template.header_text ? `<p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${template.header_text}</p>` : ""}
            </div>
            
            <!-- Body -->
            <div style="padding: 32px;">
              <p style="margin: 0 0 16px 0;">Dear <strong>{patient_name}</strong>,</p>
              <p style="margin: 0 0 24px 0; line-height: 1.6; color: #333;">
                ${template.body_template
                  .replace("{token_number}", "<strong>#123</strong>")
                  .replace("{appointment_date}", "<strong>January 15, 2025</strong>")
                  .replace("{rejection_reason}", "<em>Receipt unclear</em>")
                }
              </p>
              
              <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Appointment Details:</strong></p>
                <p style="margin: 4px 0;">Date: <strong>January 15, 2025</strong></p>
                <p style="margin: 4px 0;">Token: <strong>#123</strong></p>
                <p style="margin: 4px 0;">Doctor: <strong>Dr. Sample Doctor</strong></p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                ${template.footer_text || "Thank you for choosing our clinic."}
              </p>
              <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} ${clinicName}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    setPreviewHtml(html);
  };

  if (loading || isLoading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-brand-50/20 py-8">
          <div className="container mx-auto px-4">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-brand-50/20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Email Templates</h1>
              <p className="text-muted-foreground">Customize email branding and content</p>
            </div>
          </motion.div>

          {/* Template Variables Reference */}
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Available Variables</CardTitle>
              <CardDescription>Use these placeholders in your templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_VARIABLES.map((v) => (
                  <div key={v.var} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                    <code className="text-sm font-mono text-primary">{v.var}</code>
                    <span className="text-xs text-muted-foreground">— {v.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Templates */}
          <Tabs defaultValue={templates?.[0]?.template_type || "payment_confirmed"}>
            <TabsList className="mb-6">
              {templates?.map((t) => (
                <TabsTrigger key={t.template_type} value={t.template_type}>
                  {TEMPLATE_LABELS[t.template_type]?.label || t.template_type}
                </TabsTrigger>
              ))}
            </TabsList>

            {templates?.map((template) => (
              <TabsContent key={template.id} value={template.template_type}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{TEMPLATE_LABELS[template.template_type]?.label}</CardTitle>
                          <CardDescription>{TEMPLATE_LABELS[template.template_type]?.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" onClick={() => generatePreview(template)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle>Email Preview</DialogTitle>
                              </DialogHeader>
                              <div 
                                className="border rounded-lg overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Branding Section */}
                        <div className="space-y-4">
                          <h3 className="font-medium flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            Branding
                          </h3>
                          
                          <div className="space-y-2">
                            <Label>Clinic Name</Label>
                            <Input
                              value={editingTemplate?.id === template.id 
                                ? editingTemplate.clinic_name || "" 
                                : template.clinic_name || ""
                              }
                              onChange={(e) => setEditingTemplate({
                                ...template,
                                ...editingTemplate,
                                id: template.id,
                                clinic_name: e.target.value
                              })}
                              placeholder="Medical Clinic"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Logo URL (optional)</Label>
                            <Input
                              value={editingTemplate?.id === template.id 
                                ? editingTemplate.clinic_logo_url || "" 
                                : template.clinic_logo_url || ""
                              }
                              onChange={(e) => setEditingTemplate({
                                ...template,
                                ...editingTemplate,
                                id: template.id,
                                clinic_logo_url: e.target.value
                              })}
                              placeholder="https://example.com/logo.png"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Primary Color</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                className="w-12 h-10 p-1"
                                value={editingTemplate?.id === template.id 
                                  ? editingTemplate.primary_color || "#0066cc" 
                                  : template.primary_color || "#0066cc"
                                }
                                onChange={(e) => setEditingTemplate({
                                  ...template,
                                  ...editingTemplate,
                                  id: template.id,
                                  primary_color: e.target.value
                                })}
                              />
                              <Input
                                value={editingTemplate?.id === template.id 
                                  ? editingTemplate.primary_color || "#0066cc" 
                                  : template.primary_color || "#0066cc"
                                }
                                onChange={(e) => setEditingTemplate({
                                  ...template,
                                  ...editingTemplate,
                                  id: template.id,
                                  primary_color: e.target.value
                                })}
                                placeholder="#0066cc"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="space-y-4">
                          <h3 className="font-medium flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Content
                          </h3>
                          
                          <div className="space-y-2">
                            <Label>Email Subject</Label>
                            <Input
                              value={editingTemplate?.id === template.id 
                                ? editingTemplate.subject 
                                : template.subject
                              }
                              onChange={(e) => setEditingTemplate({
                                ...template,
                                ...editingTemplate,
                                id: template.id,
                                subject: e.target.value
                              })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Header Text (optional)</Label>
                            <Input
                              value={editingTemplate?.id === template.id 
                                ? editingTemplate.header_text || "" 
                                : template.header_text || ""
                              }
                              onChange={(e) => setEditingTemplate({
                                ...template,
                                ...editingTemplate,
                                id: template.id,
                                header_text: e.target.value
                              })}
                              placeholder="Your trusted healthcare partner"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Footer Text</Label>
                            <Input
                              value={editingTemplate?.id === template.id 
                                ? editingTemplate.footer_text || "" 
                                : template.footer_text || ""
                              }
                              onChange={(e) => setEditingTemplate({
                                ...template,
                                ...editingTemplate,
                                id: template.id,
                                footer_text: e.target.value
                              })}
                              placeholder="Thank you for choosing our clinic."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Body Template */}
                      <div className="space-y-2">
                        <Label>Email Body Template</Label>
                        <Textarea
                          className="min-h-[120px] font-mono text-sm"
                          value={editingTemplate?.id === template.id 
                            ? editingTemplate.body_template 
                            : template.body_template
                          }
                          onChange={(e) => setEditingTemplate({
                            ...template,
                            ...editingTemplate,
                            id: template.id,
                            body_template: e.target.value
                          })}
                          placeholder="Use variables like {patient_name}, {token_number}, etc."
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        {editingTemplate?.id === template.id && (
                          <Button 
                            variant="outline" 
                            onClick={() => setEditingTemplate(null)}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            const toSave = editingTemplate?.id === template.id ? editingTemplate : template;
                            updateTemplate.mutate(toSave);
                          }}
                          disabled={updateTemplate.isPending}
                        >
                          {updateTemplate.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Template
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}