import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, Trash2, Loader2, UserCog, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const createPASchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().max(20).optional(),
});

type CreatePAFormValues = z.infer<typeof createPASchema>;

interface PAAssignmentWithProfile {
  id: string;
  pa_user_id: string;
  doctor_user_id: string;
  created_at: string;
  profile?: {
    id: string;
    name: string | null;
    phone: string | null;
    status: string;
  };
}

interface PAManagementPanelProps {
  doctorId: string;
}

export function PAManagementPanel({ doctorId }: PAManagementPanelProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreatePAFormValues>({
    resolver: zodResolver(createPASchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      phone: "",
    },
  });

  // Fetch PA assignments for this doctor
  const { data: assignments, isLoading } = useQuery<PAAssignmentWithProfile[]>({
    queryKey: ["doctor-pa-assignments", doctorId],
    queryFn: async () => {
      const { data: assignmentData, error } = await supabase
        .from("pa_assignments")
        .select("*")
        .eq("doctor_user_id", doctorId);
      if (error) throw error;

      // Fetch PA profiles
      const paIds = assignmentData?.map(a => a.pa_user_id) || [];
      if (paIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, phone, status")
          .in("id", paIds);

        return assignmentData?.map(a => ({
          ...a,
          profile: profiles?.find(p => p.id === a.pa_user_id),
        })) as PAAssignmentWithProfile[];
      }
      return assignmentData as PAAssignmentWithProfile[];
    },
    enabled: !!doctorId,
  });

  const createPAMutation = useMutation({
    mutationFn: async (values: CreatePAFormValues) => {
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

      // Create PA assignment
      const { error: assignError } = await supabase
        .from("pa_assignments")
        .insert({
          pa_user_id: authData.user.id,
          doctor_user_id: doctorId,
        });

      if (assignError) throw assignError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-pa-assignments"] });
      toast({
        title: "PA created and assigned",
        description: "The PA has been created and assigned to you.",
      });
      setCreateOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create PA",
        description: error.message,
      });
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("pa_assignments")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-pa-assignments"] });
      toast({ title: "PA removed from your team" });
    },
  });

  const onSubmit = async (values: CreatePAFormValues) => {
    setIsCreating(true);
    await createPAMutation.mutateAsync(values);
    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <Card variant="glass" className="border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="border-border/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-900/10 dark:to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              My Personal Assistants
            </CardTitle>
            <CardDescription>Manage your assigned PAs</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Add PA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <DialogHeader>
                    <DialogTitle>Create New PA</DialogTitle>
                    <DialogDescription>
                      Create a new Personal Assistant account and assign them to your team
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
                    <Button type="submit" disabled={isCreating} variant="hero">
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create & Assign PA"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {assignments && assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <UserCog className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{assignment.profile?.name || "Unnamed PA"}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {assignment.profile?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {assignment.profile.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={assignment.profile?.status === "Active" ? "default" : "secondary"}
                    className={assignment.profile?.status === "Active" ? "bg-green-500" : ""}
                  >
                    {assignment.profile?.status || "Active"}
                  </Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove PA?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove {assignment.profile?.name} from your team. They will no longer be able to manage your appointments.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteAssignment.mutate(assignment.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
              <UserCog className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No PAs assigned yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add a PA to help manage your appointments</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
