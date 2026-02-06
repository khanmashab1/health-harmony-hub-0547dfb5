import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  Star, 
  Clock, 
  MapPin, 
  Stethoscope, 
  GraduationCap,
  Calendar,
  User,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";

interface DoctorWithProfile {
  user_id: string;
  specialty: string;
  fee: number;
  rating: number | null;
  experience_years: number | null;
  city: string | null;
  province: string | null;
  bio: string | null;
  degree: string | null;
  qualifications: string | null;
  image_path: string | null;
  profile: { name: string | null } | null;
}

export default function OurDoctors() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");

  const { data: doctors, isLoading } = useQuery({
    queryKey: ["all-doctors"],
    queryFn: async () => {
      const { data: doctorData, error } = await supabase
        .from("doctors")
        .select("*")
        .order("rating", { ascending: false });

      if (error) throw error;

      // Fetch profile names for all doctors
      const doctorIds = doctorData.map((d) => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", doctorIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return doctorData.map((d) => ({
        ...d,
        profile: profileMap.get(d.user_id) || null,
      })) as DoctorWithProfile[];
    },
  });

  // Get unique specialties and cities for filters
  const specialties = [...new Set(doctors?.map((d) => d.specialty) || [])];
  const cities = [...new Set(doctors?.map((d) => d.city).filter(Boolean) || [])];

  // Filter doctors
  const filteredDoctors = doctors?.filter((doctor) => {
    const name = doctor.profile?.name?.toLowerCase() || "";
    const specialty = doctor.specialty.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = name.includes(query) || specialty.includes(query);
    const matchesSpecialty = selectedSpecialty === "all" || doctor.specialty === selectedSpecialty;
    const matchesCity = selectedCity === "all" || doctor.city === selectedCity;
    
    return matchesSearch && matchesSpecialty && matchesCity;
  });

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    return supabase.storage.from("avatars").getPublicUrl(imagePath).data.publicUrl;
  };

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-[var(--gradient-hero)]" />
          <div className="absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5">
              <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
              Trusted Healthcare Professionals
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Our <span className="text-primary">Doctors</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Meet our team of experienced and qualified doctors committed to providing
              the best healthcare services across Pakistan
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by doctor name or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base rounded-full border-border/60 bg-background/80 backdrop-blur-sm"
              />
            </div>
          </div>
        </section>

        {/* Filters & Content */}
        <section className="container mx-auto px-4 py-8">
          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>Filter by:</span>
            </div>
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c!}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(selectedSpecialty !== "all" || selectedCity !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSpecialty("all");
                  setSelectedCity("all");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Results Count */}
          <p className="text-sm text-muted-foreground mb-6">
            Showing {filteredDoctors?.length || 0} doctor{filteredDoctors?.length !== 1 ? "s" : ""}
          </p>

          {/* Doctor Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : filteredDoctors && filteredDoctors.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doctor) => (
                <DoctorCard 
                  key={doctor.user_id} 
                  doctor={doctor} 
                  imageUrl={getImageUrl(doctor.image_path)}
                  onViewProfile={() => navigate(`/doctor/${doctor.user_id}`)}
                  onBookNow={() => navigate(`/booking?doctorId=${doctor.user_id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <User className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Doctors Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters to find what you are looking for.
              </p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function DoctorCard({ 
  doctor, 
  imageUrl, 
  onViewProfile, 
  onBookNow 
}: { 
  doctor: DoctorWithProfile; 
  imageUrl: string | null;
  onViewProfile: () => void;
  onBookNow: () => void;
}) {
  return (
    <Card variant="interactive" className="overflow-hidden group">
      <CardContent className="p-0">
        {/* Top colored strip */}
        <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />
        
        <div className="p-6">
          {/* Doctor Info */}
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="w-16 h-16 ring-2 ring-primary/10">
              <AvatarImage src={imageUrl || undefined} alt={doctor.profile?.name || "Doctor"} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {doctor.profile?.name?.charAt(0)?.toUpperCase() || "D"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">
                Dr. {doctor.profile?.name || "Doctor"}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                <Stethoscope className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="truncate">{doctor.specialty}</span>
              </div>
              {doctor.degree && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{doctor.degree}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold">{doctor.rating || "4.0"}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{doctor.experience_years || 0} yrs</span>
            </div>
            {doctor.city && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{doctor.city}</span>
              </div>
            )}
          </div>

          {/* Bio snippet */}
          {doctor.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {doctor.bio}
            </p>
          )}

          {/* Fee & Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground">Consultation Fee</p>
              <p className="text-lg font-bold text-primary">Rs. {doctor.fee}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onViewProfile}>
                View Profile
              </Button>
              <Button size="sm" onClick={onBookNow}>
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Book
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
