import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, isBefore, startOfToday } from "date-fns";
import { 
  MapPin, 
  Stethoscope, 
  User, 
  Calendar as CalendarIcon, 
  CreditCard, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Banknote,
  Smartphone,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROVINCES, CITIES, SPECIALTIES } from "@/lib/constants";

interface Doctor {
  user_id: string;
  specialty: string;
  rating: number | null;
  experience_years: number | null;
  fee: number;
  city: string | null;
  province: string | null;
  max_patients_per_day: number;
  profile?: { name: string | null };
}

const steps = [
  { id: 1, title: "Location", icon: MapPin },
  { id: 2, title: "Specialty", icon: Stethoscope },
  { id: 3, title: "Doctor", icon: User },
  { id: 4, title: "Date", icon: CalendarIcon },
  { id: 5, title: "Payment", icon: CreditCard },
  { id: 6, title: "Confirm", icon: CheckCircle2 },
];

export default function Booking() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [specialty, setSpecialty] = useState(searchParams.get("specialty") || "");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Online">("Cash");
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to book an appointment",
      });
      navigate("/auth?redirect=/booking");
    }
  }, [user, loading, navigate, toast]);

  useEffect(() => {
    if (profile) {
      setPatientName(profile.name || "");
      setPatientPhone(profile.phone || "");
    }
    if (user) {
      setPatientEmail(user.email || "");
    }
  }, [profile, user]);

  // Show loading while checking auth
  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  // Fetch doctors based on filters
  const { data: doctors, isLoading: loadingDoctors } = useQuery({
    queryKey: ["doctors", province, city, specialty],
    queryFn: async () => {
      let query = supabase.from("doctors").select("*");
      
      if (province) query = query.eq("province", province);
      if (city) query = query.eq("city", city);
      if (specialty) query = query.eq("specialty", specialty);
      
      const { data, error } = await query;
      if (error) throw error;

      // Fetch profile names
      const userIds = data?.map(d => d.user_id) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);
        
        return data?.map(doc => ({
          ...doc,
          profile: profiles?.find(p => p.id === doc.user_id)
        })) as Doctor[];
      }
      return data as Doctor[];
    },
    enabled: step >= 3,
  });

  // Fetch available slots for selected doctor and date
  const { data: availableSlots } = useQuery({
    queryKey: ["slots", selectedDoctor?.user_id, selectedDate?.toISOString()],
    queryFn: async () => {
      if (!selectedDoctor || !selectedDate) return 0;
      
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_doctor_id: selectedDoctor.user_id,
        p_date: format(selectedDate, "yyyy-MM-dd"),
      });
      
      if (error) throw error;
      return data as number;
    },
    enabled: !!selectedDoctor && !!selectedDate,
  });

  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: async () => {
      if (!selectedDoctor || !selectedDate || !user) {
        throw new Error("Missing required data");
      }

      // Allocate token
      const { data: tokenNumber, error: tokenError } = await supabase.rpc("allocate_token", {
        p_doctor_id: selectedDoctor.user_id,
        p_date: format(selectedDate, "yyyy-MM-dd"),
      });

      if (tokenError) throw tokenError;

      // Create appointment
      const { data, error } = await supabase.from("appointments").insert({
        patient_user_id: user.id,
        doctor_user_id: selectedDoctor.user_id,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        token_number: tokenNumber,
        department: selectedDoctor.specialty,
        reason,
        status: paymentMethod === "Online" ? "Pending" : "Upcoming",
        payment_method: paymentMethod,
        payment_status: paymentMethod === "Online" ? "Pending" : "NA",
        patient_full_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone,
      }).select().single();

      if (error) throw error;

      // Send confirmation email via edge function
      if (patientEmail) {
        try {
          await supabase.functions.invoke("send-appointment-notification", {
            body: { appointmentId: data.id, type: "confirmation" },
          });
        } catch (emailError) {
          console.error("Failed to send confirmation email:", emailError);
          // Don't fail the booking if email fails
        }
      }

      return { appointment: data, tokenNumber };
    },
    onSuccess: (data) => {
      toast({
        title: "Appointment Booked!",
        description: `Your token number is ${data.tokenNumber}. A confirmation email has been sent.`,
      });
      navigate(`/token/${data.appointment.id}`);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error.message,
      });
    },
  });

  const handleNext = () => {
    if (step < 6) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Please sign in",
        description: "You need to be signed in to book an appointment",
      });
      navigate("/auth");
      return;
    }
    
    setIsSubmitting(true);
    await createAppointment.mutateAsync();
    setIsSubmitting(false);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return province && city;
      case 2: return specialty;
      case 3: return selectedDoctor;
      case 4: return selectedDate && availableSlots && availableSlots > 0;
      case 5: return paymentMethod && patientName && patientPhone;
      default: return true;
    }
  };

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Progress Stepper */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((s, index) => (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                    step >= s.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`hidden sm:block w-12 lg:w-24 h-1 mx-2 rounded transition-all ${
                      step > s.id ? "bg-primary" : "bg-muted"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <h2 className="text-xl font-bold">{steps[step - 1].title}</h2>
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="elevated" className="p-6">
                {/* Step 1: Location */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <Label>Province</Label>
                      <Select value={province} onValueChange={(v) => { setProvince(v); setCity(""); }}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVINCES.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>City</Label>
                      <Select value={city} onValueChange={setCity} disabled={!province}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {(CITIES[province] || []).map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Step 2: Specialty */}
                {step === 2 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {SPECIALTIES.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => setSpecialty(s.name)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          specialty === s.name
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Stethoscope className={`w-8 h-8 mb-2 ${specialty === s.name ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-medium text-sm">{s.name}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 3: Doctor Selection */}
                {step === 3 && (
                  <div className="space-y-4">
                    {loadingDoctors ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : doctors && doctors.length > 0 ? (
                      doctors.map((doc) => (
                        <button
                          key={doc.user_id}
                          onClick={() => setSelectedDoctor(doc)}
                          className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                            selectedDoctor?.user_id === doc.user_id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-8 h-8 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">Dr. {doc.profile?.name || "Doctor"}</h3>
                              <p className="text-sm text-muted-foreground">{doc.specialty}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  {doc.rating || 4.5}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {doc.experience_years || 0} yrs exp
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {doc.city}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">Rs. {doc.fee}</p>
                              <p className="text-xs text-muted-foreground">per visit</p>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No doctors found for the selected criteria</p>
                        <p className="text-sm">Try selecting a different location or specialty</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Date Selection */}
                {step === 4 && (
                  <div className="flex flex-col items-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => isBefore(date, startOfToday())}
                      className="rounded-lg border"
                    />
                    {selectedDate && (
                      <div className="mt-4 p-4 rounded-lg bg-muted w-full max-w-sm">
                        <p className="text-center">
                          <span className="font-medium">Selected: </span>
                          {format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </p>
                        {availableSlots !== undefined && (
                          <p className={`text-center mt-2 ${availableSlots > 0 ? "text-green-600" : "text-red-600"}`}>
                            {availableSlots > 0 
                              ? `${availableSlots} slots available`
                              : "No slots available for this date"
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Payment & Details */}
                {step === 5 && (
                  <div className="space-y-6">
                    <div>
                      <Label>Payment Method</Label>
                      <RadioGroup
                        value={paymentMethod}
                        onValueChange={(v) => setPaymentMethod(v as "Cash" | "Online")}
                        className="grid grid-cols-2 gap-4 mt-2"
                      >
                        <div>
                          <RadioGroupItem value="Cash" id="cash" className="peer sr-only" />
                          <Label
                            htmlFor="cash"
                            className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <Banknote className="mb-3 h-8 w-8" />
                            <span className="font-medium">Pay at Clinic</span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="Online" id="online" className="peer sr-only" />
                          <Label
                            htmlFor="online"
                            className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <Smartphone className="mb-3 h-8 w-8" />
                            <span className="font-medium">Online Payment</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Full Name *</Label>
                        <Input
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder="Your full name"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>Phone Number *</Label>
                        <Input
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          placeholder="+92 300 1234567"
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Reason for Visit (Optional)</Label>
                      <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Describe your symptoms or reason for visit..."
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}

                {/* Step 6: Confirmation */}
                {step === 6 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
                      <h3 className="text-xl font-bold">Review Your Booking</h3>
                    </div>
                    <div className="grid gap-4 p-4 bg-muted rounded-xl">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Doctor</span>
                        <span className="font-medium">Dr. {selectedDoctor?.profile?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Specialty</span>
                        <span className="font-medium">{selectedDoctor?.specialty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">{selectedDate && format(selectedDate, "MMMM d, yyyy")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-medium">{city}, {province}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment</span>
                        <span className="font-medium">{paymentMethod}</span>
                      </div>
                      <div className="flex justify-between border-t pt-4">
                        <span className="text-muted-foreground">Fee</span>
                        <span className="font-bold text-lg text-primary">Rs. {selectedDoctor?.fee}</span>
                      </div>
                    </div>
                    {paymentMethod === "Online" && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>Note:</strong> After booking, you'll need to upload payment receipt. 
                          Your appointment will be confirmed once payment is verified.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {step < 6 ? (
              <Button
                variant="hero"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                variant="hero"
                onClick={handleSubmit}
                disabled={isSubmitting || !user}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm Booking
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
