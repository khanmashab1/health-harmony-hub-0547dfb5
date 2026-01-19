import { useState, useRef } from "react";
import { Settings, Users, TrendingUp, Activity, CheckCircle2, Save, Edit2, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DoctorSettingsPanelProps {
  doctorInfo: {
    user_id: string;
    specialty: string;
    degree?: string | null;
    qualifications?: string | null;
    bio?: string | null;
    max_patients_per_day?: number;
    fee?: number;
    experience_years?: number;
    rating?: number;
    image_path?: string | null;
  } | null | undefined;
  userId: string | undefined;
  profileName?: string | null;
}

export function DoctorSettingsPanel({ doctorInfo, userId, profileName }: DoctorSettingsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [degree, setDegree] = useState(doctorInfo?.degree || "");
  const [qualifications, setQualifications] = useState(doctorInfo?.qualifications || "");
  const [bio, setBio] = useState(doctorInfo?.bio || "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not found");
      const { error } = await supabase
        .from("doctors")
        .update({
          degree: degree.trim() || null,
          qualifications: qualifications.trim() || null,
          bio: bio.trim() || null,
        })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-info"] });
      toast({ title: "Profile updated successfully" });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 5MB", variant: "destructive" });
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // Upload to avatars bucket with doctor prefix
      const fileExt = file.name.split(".").pop();
      const fileName = `doctor-${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);

      // Update doctors table with image path
      const { error: updateError } = await supabase
        .from("doctors")
        .update({ image_path: urlData.publicUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["doctor-info"] });
      toast({ title: "Profile photo updated successfully" });
    } catch (error: any) {
      console.error("Photo upload error:", error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCancel = () => {
    setDegree(doctorInfo?.degree || "");
    setQualifications(doctorInfo?.qualifications || "");
    setBio(doctorInfo?.bio || "");
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Photo Card */}
      <Card variant="glass" className="border-white/50">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-500" />
            Profile Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-white shadow-xl">
                <AvatarImage src={doctorInfo?.image_path || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-brand-100 to-brand-200 text-2xl font-bold text-brand-600">
                  {profileName?.charAt(0)?.toUpperCase() || "D"}
                </AvatarFallback>
              </Avatar>
              {isUploadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Update your profile photo</h3>
              <p className="text-sm text-muted-foreground">
                This photo will be displayed to patients when they book appointments.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card variant="glass" className="border-white/50">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-500" />
            Practice Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Max Patients/Day", value: doctorInfo?.max_patients_per_day || 30, icon: Users },
              { label: "Consultation Fee", value: `Rs. ${doctorInfo?.fee || 500}`, icon: TrendingUp },
              { label: "Experience", value: `${doctorInfo?.experience_years || 0} years`, icon: Activity },
              { label: "Rating", value: `${doctorInfo?.rating || 4.0} ⭐`, icon: CheckCircle2 },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="w-4 h-4 text-brand-500" />
                  <p className="text-sm text-muted-foreground font-medium">{item.label}</p>
                </div>
                <p className="font-bold text-xl">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editable Profile Card */}
      <Card variant="glass" className="border-white/50">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-brand-500" />
              Professional Profile
            </CardTitle>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="degree" className="font-medium">Degree</Label>
              {isEditing ? (
                <Input
                  id="degree"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="e.g., MBBS, MD, FCPS"
                  className="border-border/50"
                />
              ) : (
                <p className="text-muted-foreground p-2 rounded-lg bg-muted/30 min-h-10">
                  {doctorInfo?.degree || "Not specified"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualifications" className="font-medium">Additional Qualifications</Label>
              {isEditing ? (
                <Input
                  id="qualifications"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="e.g., MRCP (UK), Fellow American College"
                  className="border-border/50"
                />
              ) : (
                <p className="text-muted-foreground p-2 rounded-lg bg-muted/30 min-h-10">
                  {doctorInfo?.qualifications || "Not specified"}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="font-medium">Bio / About Me</Label>
            {isEditing ? (
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a brief introduction about yourself, your experience, and areas of expertise..."
                rows={4}
                className="border-border/50 resize-none"
              />
            ) : (
              <p className="text-muted-foreground p-3 rounded-lg bg-muted/30 min-h-24 whitespace-pre-wrap">
                {doctorInfo?.bio || "No bio provided. Click 'Edit Profile' to add your professional bio."}
              </p>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={() => updateProfile.mutate()} 
                disabled={updateProfile.isPending}
                variant="hero"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}