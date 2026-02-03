import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
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
  Loader2,
  Info,
  ExternalLink,
  Users
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
import { DoctorDetailsDialog } from "@/components/booking/DoctorDetailsDialog";
import { DoctorSearchFilter } from "@/components/booking/DoctorSearchFilter";
import { DoctorScheduleDisplay } from "@/components/booking/DoctorScheduleDisplay";

interface Doctor {
  user_id: string;
  specialty: string;
  rating: number | null;
  experience_years: number | null;
  fee: number;
  city: string | null;
  province: string | null;
  max_patients_per_day: number;
  bio: string | null;
  degree: string | null;
  qualifications: string | null;
  consultation_duration: number | null;
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
  const doctorIdParam = searchParams.get("doctorId");
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
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsDoctor, setDetailsDoctor] = useState<Doctor | null>(null);
  const [doctorPreloaded, setDoctorPreloaded] = useState(false);
  const [selectedPatientType, setSelectedPatientType] = useState<"self" | string>("self");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("rating");

  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Pre-fetch doctor if doctorId is provided in URL
  const { data: preSelectedDoctor, isLoading: loadingPreSelectedDoctor } = useQuery({
    queryKey: ["preselected-doctor", doctorIdParam],
    queryFn: async () => {
      if (!doctorIdParam) return null;
      
      const { data: doctorData, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("user_id", doctorIdParam)
        .single();
      
      if (error) throw error;

      // Fetch profile name
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", doctorIdParam)
        .single();

      return {
        ...doctorData,
        profile: profileData
      } as Doctor;
    },
    enabled: !!doctorIdParam,
  });

  // Fetch managed patients for patient selection
  const { data: managedPatients } = useQuery({
    queryKey: ["managed-patients-booking", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("managed_patients")
        .select("*")
        .eq("manager_user_id", user!.id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch doctors based on filters - MUST be called unconditionally (before any returns)
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

  // Fetch available slots for selected doctor and date - MUST be called unconditionally
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

  // Create appointment mutation - MUST be called unconditionally
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

  // Auto-select doctor and skip to date step when doctor is preloaded
  useEffect(() => {
    if (preSelectedDoctor && !doctorPreloaded) {
      setSelectedDoctor(preSelectedDoctor);
      setProvince(preSelectedDoctor.province || "");
      setCity(preSelectedDoctor.city || "");
      setSpecialty(preSelectedDoctor.specialty || "");
      setStep(4); // Skip directly to date selection
      setDoctorPreloaded(true);
    }
  }, [preSelectedDoctor, doctorPreloaded]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to book an appointment",
      });
      const redirectUrl = doctorIdParam 
        ? `/booking?doctorId=${doctorIdParam}` 
        : "/booking";
      navigate(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  }, [user, loading, navigate, toast, doctorIdParam]);

  useEffect(() => {
    if (profile) {
      setPatientName(profile.name || "");
      setPatientPhone(profile.phone || "");
    }
    if (user) {
      setPatientEmail(user.email || "");
    }
  }, [profile, user]);

  // Show loading while checking auth or preloading doctor
  if (loading || (doctorIdParam && loadingPreSelectedDoctor)) {
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

  // Filter and sort doctors
  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];
    
    let filtered = [...doctors];
    
    // Search by name
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.profile?.name?.toLowerCase().includes(query) ||
        doc.specialty.toLowerCase().includes(query)
      );
    }
    
    // Filter by minimum rating
    if (minRating > 0) {
      filtered = filtered.filter(doc => (doc.rating || 0) >= minRating);
    }
    
    // Sort
    switch (sortBy) {
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "experience":
        filtered.sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));
        break;
      case "fee-low":
        filtered.sort((a, b) => a.fee - b.fee);
        break;
      case "fee-high":
        filtered.sort((a, b) => b.fee - a.fee);
        break;
      case "name":
        filtered.sort((a, b) => 
          (a.profile?.name || "").localeCompare(b.profile?.name || "")
        );
        break;
    }
    
    return filtered;
  }, [doctors, searchQuery, minRating, sortBy]);

  const hasActiveFilters = searchQuery !== "" || minRating > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setMinRating(0);
  };

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
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {steps.map((s, index) => (
                <button
                  key={s.id}
                  onClick={() => {
                    // Allow going back to completed steps
                    if (s.id < step) setStep(s.id);
                  }}
                  disabled={s.id > step}
                  className="flex items-center cursor-pointer disabled:cursor-not-allowed"
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all shrink-0 ${
                    step >= s.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  } ${s.id < step ? "hover:ring-2 hover:ring-primary/50" : ""}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`hidden sm:block w-8 md:w-12 lg:w-24 h-1 mx-1 md:mx-2 rounded transition-all ${
                      step > s.id ? "bg-primary" : "bg-muted"
                    }`} />
                  )}
                </button>
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
                      <Label className="text-base font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Select Province
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                        {PROVINCES.map((p) => (
                          <button
                            key={p}
                            onClick={() => { setProvince(p); setCity(""); }}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                              province === p
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <p className="font-medium text-sm">{p}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    {province && (
                      <div>
                        <Label className="text-base font-medium flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          Select City
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 max-h-[300px] overflow-y-auto">
                          {(CITIES[province] || []).map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                setCity(c);
                                // Auto-advance to next step
                                setTimeout(() => setStep(2), 200);
                              }}
                              className={`p-3 rounded-xl border-2 text-left transition-all ${
                                city === c
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <p className="font-medium text-sm">{c}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Specialty */}
                {step === 2 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {SPECIALTIES.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => {
                          setSpecialty(s.name);
                          // Auto-advance to next step
                          setTimeout(() => setStep(3), 200);
                        }}
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
                    {/* Search and Filter */}
                    <DoctorSearchFilter
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      minRating={minRating}
                      onMinRatingChange={setMinRating}
                      sortBy={sortBy}
                      onSortByChange={setSortBy}
                      onClearFilters={clearFilters}
                      hasActiveFilters={hasActiveFilters}
                    />

                    {loadingDoctors ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : filteredDoctors && filteredDoctors.length > 0 ? (
                      filteredDoctors.map((doc) => (
                        <button
                          key={doc.user_id}
                          onClick={() => setSelectedDoctor(doc)}
                          className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all ${
                            selectedDoctor?.user_id === doc.user_id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-sm sm:text-base truncate">Dr. {doc.profile?.name || "Doctor"}</h3>
                                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{doc.specialty}</p>
                                  {doc.degree && (
                                    <p className="text-xs text-primary font-medium">{doc.degree}</p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm sm:text-lg font-bold text-primary">Rs. {doc.fee}</p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground">per visit</p>
                                </div>
                              </div>
                              
                              {/* Stats Row */}
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                                  {doc.rating || 4.5}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                  {doc.experience_years || 0} yrs
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="truncate max-w-[80px] sm:max-w-none">{doc.city}</span>
                                </span>
                              </div>

                              {/* Links */}
                              <div className="flex items-center gap-3 mt-2">
                                <Link
                                  to={`/doctor/${doc.user_id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-[10px] sm:text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Full Profile
                                </Link>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailsDoctor(doc);
                                    setDetailsDialogOpen(true);
                                  }}
                                  className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground hover:text-primary"
                                >
                                  <Info className="w-3 h-3" />
                                  Quick View
                                </button>
                              </div>

                              {/* Schedule Display */}
                              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                <DoctorScheduleDisplay 
                                  doctorId={doc.user_id} 
                                  compact={true}
                                />
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No doctors found for the selected criteria</p>
                        <p className="text-sm">Try adjusting your filters or selecting a different specialty</p>
                        {hasActiveFilters && (
                          <Button variant="link" onClick={clearFilters} className="mt-2">
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Date Selection */}
                {step === 4 && (
                  <div className="space-y-6">
                    {/* Selected Doctor Summary Card */}
                    {selectedDoctor && (
                      <div className="p-4 rounded-xl border bg-muted/50 space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              Dr. {selectedDoctor.profile?.name || "Doctor"}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5" />
                                {selectedDoctor.specialty}
                              </span>
                              <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                {selectedDoctor.rating || 4.0}
                              </span>
                              <span className="font-medium text-primary">
                                Rs. {selectedDoctor.fee}
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setDoctorPreloaded(false);
                              setStep(3);
                            }}
                          >
                            Change
                          </Button>
                        </div>
                        
                        {/* Full Schedule Display */}
                        <DoctorScheduleDisplay 
                          doctorId={selectedDoctor.user_id} 
                          consultationDuration={selectedDoctor.consultation_duration}
                        />
                      </div>
                    )}

                    {/* Calendar */}
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
                  </div>
                )}

                {/* Step 5: Payment & Details */}
                {step === 5 && (
                  <div className="space-y-6">
                    {/* Patient Selection */}
                    {managedPatients && managedPatients.length > 0 && (
                      <div>
                        <Label className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Booking for
                        </Label>
                        <Select 
                          value={selectedPatientType} 
                          onValueChange={(value) => {
                            setSelectedPatientType(value);
                            if (value === "self") {
                              setPatientName(profile?.name || "");
                              setPatientPhone(profile?.phone || "");
                            } else {
                              const patient = managedPatients.find(p => p.id === value);
                              if (patient) {
                                setPatientName(patient.patient_name);
                                // Keep phone from profile as managed patients don't have separate phones
                                setPatientPhone(profile?.phone || "");
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select patient" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="self">
                              <span className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Myself ({profile?.name || "Self"})
                              </span>
                            </SelectItem>
                            {managedPatients.map((patient) => (
                              <SelectItem key={patient.id} value={patient.id}>
                                <span className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  {patient.patient_name} ({patient.relationship})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

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
                          placeholder="Patient full name"
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

      {/* Doctor Details Dialog */}
      <DoctorDetailsDialog
        doctor={detailsDoctor}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onSelect={(doc) => setSelectedDoctor(doc as Doctor)}
      />
    </Layout>
  );
}
