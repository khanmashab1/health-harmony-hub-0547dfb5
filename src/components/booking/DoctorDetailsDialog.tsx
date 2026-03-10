import { Star, Clock, MapPin, Award, GraduationCap, Stethoscope, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/hooks/useLanguage";

interface Doctor {
  user_id: string;
  specialty: string;
  rating: number | null;
  experience_years: number | null;
  fee: number;
  city: string | null;
  province: string | null;
  bio: string | null;
  degree: string | null;
  qualifications: string | null;
  clinic_address?: string | null;
  google_maps_link?: string | null;
  profile?: { name: string | null };
}

interface DoctorDetailsDialogProps {
  doctor: Doctor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (doctor: Doctor) => void;
}

export function DoctorDetailsDialog({ doctor, open, onOpenChange, onSelect }: DoctorDetailsDialogProps) {
  const { t } = useLanguage();
  
  if (!doctor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Dr. {doctor.profile?.name || t("common.doctor")}</h3>
              <p className="text-sm text-muted-foreground font-normal">{doctor.specialty}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stats Row */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold">{doctor.rating || 4.5}</span>
              <span className="text-muted-foreground">{t("common.rating")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-semibold">{doctor.experience_years || 0}</span>
              <span className="text-muted-foreground">{t("common.years")} {t("common.experience")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{doctor.city}, {doctor.province}</span>
            </div>
          </div>

          <Separator />

          {/* Qualifications */}
          {(doctor.degree || doctor.qualifications) && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                {t("common.qualifications")}
              </h4>
              {doctor.degree && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    <Award className="w-3 h-3 mr-1" />
                    {doctor.degree}
                  </Badge>
                </div>
              )}
              {doctor.qualifications && (
                <p className="text-sm text-muted-foreground">{doctor.qualifications}</p>
              )}
            </div>
          )}

          {/* Bio */}
          {doctor.bio && (
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                {t("common.about")}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{doctor.bio}</p>
            </div>
          )}

          {/* Fee */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("common.fee")}</span>
              <span className="text-2xl font-bold text-primary">Rs. {doctor.fee}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          <Button 
            variant="hero" 
            className="flex-1" 
            onClick={() => {
              onSelect(doctor);
              onOpenChange(false);
            }}
          >
            {t("booking.selectThisDoctor")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
