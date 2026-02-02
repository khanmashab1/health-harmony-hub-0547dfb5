import { useState, useEffect } from "react";
import { Video, Upload, RefreshCw, Link as LinkIcon, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function VideoPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch current video settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");
      if (error) throw error;
      return data?.reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value;
        return acc;
      }, {} as Record<string, string | null>) || {};
    },
  });

  useEffect(() => {
    if (settings) {
      setVideoUrl(settings.intro_video_url || "");
      setVideoTitle(settings.intro_video_title || "");
      setVideoDescription(settings.intro_video_description || "");
    }
  }, [settings]);

  const upsertSetting = async (key: string, value: string | null) => {
    // Try to update first
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("setting_key", key)
      .single();
    
    if (existing) {
      const { error } = await supabase
        .from("site_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("site_settings")
        .insert({ setting_key: key, setting_value: value });
      if (error) throw error;
    }
  };

  const saveVideoSettings = useMutation({
    mutationFn: async () => {
      await Promise.all([
        upsertSetting("intro_video_url", videoUrl || null),
        upsertSetting("intro_video_title", videoTitle || null),
        upsertSetting("intro_video_description", videoDescription || null),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: "Video settings saved" });
    },
    onError: (error: any) => {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    },
  });

  const handleVideoUpload = async () => {
    if (!videoFile) return;
    setUploading(true);
    try {
      const fileName = `intro-video-${Date.now()}.${videoFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("hero-slides")
        .upload(fileName, videoFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("hero-slides")
        .getPublicUrl(fileName);

      setVideoUrl(publicUrl);
      await upsertSetting("intro_video_url", publicUrl);
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: "Video uploaded successfully" });
      setVideoFile(null);
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const resetVideo = async () => {
    await Promise.all([
      upsertSetting("intro_video_url", null),
      upsertSetting("intro_video_title", null),
      upsertSetting("intro_video_description", null),
    ]);
    setVideoUrl("");
    setVideoTitle("");
    setVideoDescription("");
    queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    toast({ title: "Video reset to default" });
  };

  // Extract YouTube video ID for embed
  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  };

  const isYouTubeUrl = (url: string) => {
    return url.includes("youtube.com") || url.includes("youtu.be");
  };

  if (isLoading) {
    return (
      <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          Intro Video Settings
        </CardTitle>
        <CardDescription>Add an intro video to display on the home page</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="url" className="gap-2">
              <LinkIcon className="w-4 h-4" />
              URL / YouTube
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label>Video URL (YouTube or direct link)</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-muted-foreground">
                Paste a YouTube URL or direct video link (.mp4, .webm)
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label>Upload Video File</Label>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
              <Button 
                onClick={handleVideoUpload} 
                disabled={!videoFile || uploading}
                size="sm"
                className="mt-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Video"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Recommended: MP4 format, max 50MB for best performance
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Video Preview */}
        {videoUrl && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="aspect-video rounded-lg overflow-hidden bg-muted border">
              {isYouTubeUrl(videoUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(videoUrl) || ""}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-cover"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          </div>
        )}

        {/* Title and Description */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Video Title</Label>
            <Input
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="About Our Healthcare Services"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Video Description</Label>
            <Textarea
              value={videoDescription}
              onChange={(e) => setVideoDescription(e.target.value)}
              placeholder="Learn more about how we provide quality healthcare..."
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button onClick={() => saveVideoSettings.mutate()} disabled={saveVideoSettings.isPending}>
            {saveVideoSettings.isPending ? "Saving..." : "Save Video Settings"}
          </Button>
          {videoUrl && (
            <Button variant="outline" onClick={resetVideo}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
