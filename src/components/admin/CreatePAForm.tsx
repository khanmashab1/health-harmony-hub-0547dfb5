import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const createPASchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().max(20).optional(),
});

type CreatePAFormValues = z.infer<typeof createPASchema>;

interface CreatePAFormProps {
  onSuccess: () => void;
}

export function CreatePAForm({ onSuccess }: CreatePAFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreatePAFormValues>({
    resolver: zodResolver(createPASchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      phone: "",
    },
  });

  const onSubmit = async (values: CreatePAFormValues) => {
    setIsLoading(true);
    try {
      // Create auth user with PA role
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
            role: "pa",
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Wait for trigger to create profile
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update profile with phone
      if (values.phone) {
        await supabase
          .from("profiles")
          .update({ phone: values.phone })
          .eq("id", authData.user.id);
      }

      toast({
        title: "PA created successfully",
        description: `${values.name} has been added as a Personal Assistant.`,
      });

      onSuccess();
    } catch (error: any) {
      console.error("Create PA error:", error);
      toast({
        variant: "destructive",
        title: "Failed to create PA",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle>Create PA Account</DialogTitle>
          <DialogDescription>
            Create a new Personal Assistant account
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="pa@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password *</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Min 6 characters"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+92-300-1234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isLoading} variant="hero">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create PA"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
