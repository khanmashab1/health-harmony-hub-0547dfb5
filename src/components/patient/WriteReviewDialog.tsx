import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WriteReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  doctorId?: string | null;
  editReview?: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
}

export function WriteReviewDialog({ open, onOpenChange, userId, userName, doctorId, editReview }: WriteReviewDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isEditing = !!editReview;

  useEffect(() => {
    if (editReview) {
      setRating(editReview.rating);
      setComment(editReview.comment || "");
    } else {
      setRating(5);
      setComment("");
    }
  }, [editReview, open]);

  const createReview = useMutation({
    mutationFn: async () => {
      // Check for rate limiting - max 1 review per day (only for new reviews)
      if (!isEditing) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: existingReviews, error: checkError } = await supabase
          .from("reviews")
          .select("id, created_at")
          .eq("patient_user_id", userId)
          .gte("created_at", today.toISOString());

        if (checkError) throw checkError;

        if (existingReviews && existingReviews.length > 0) {
          throw new Error("You can only submit one review per day. Please try again tomorrow.");
        }
      }

      // Validate comment length
      if (comment.trim().length < 3) {
        throw new Error("Comment must be at least 3 characters long.");
      }

      if (comment.trim().length > 500) {
        throw new Error("Comment must be less than 500 characters.");
      }

      if (isEditing) {
        const { error } = await supabase
          .from("reviews")
          .update({
            rating,
            comment: comment.trim(),
          })
          .eq("id", editReview.id)
          .eq("patient_user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").insert({
          patient_user_id: userId,
          doctor_user_id: doctorId || null,
          display_name: userName || "Anonymous",
          rating,
          comment: comment.trim(),
          status: "Pending",
          source: "internal",
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["approved-reviews"] });
      toast({
        title: isEditing ? "Review Updated" : "Review Submitted",
        description: isEditing 
          ? "Your review has been updated." 
          : "Your review has been submitted and is pending approval.",
      });
      setRating(5);
      setComment("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: isEditing ? "Failed to update review" : "Failed to submit review",
        description: error.message,
      });
    },
  });

  const deleteReview = useMutation({
    mutationFn: async () => {
      if (!editReview) return;
      
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", editReview.id)
        .eq("patient_user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["approved-reviews"] });
      toast({
        title: "Review Deleted",
        description: "Your review has been deleted.",
      });
      setDeleteDialogOpen(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete review",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReview.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Review" : "Write a Review"}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Update your review. Note: Only pending reviews can be edited."
                : "Share your experience with our healthcare services. Your review will be visible after admin approval."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoveredRating || rating)
                          ? "text-amber-500 fill-amber-500"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Your Review</Label>
              <Textarea
                id="comment"
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {comment.length}/500 characters
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createReview.isPending || comment.trim().length < 3}
                >
                  {createReview.isPending ? "Saving..." : isEditing ? "Update Review" : "Submit Review"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReview.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReview.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}