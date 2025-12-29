import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, Upload, Image, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReceiptUploadProps {
  appointmentId: string;
  doctorFee: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReceiptUpload({ appointmentId, doctorFee, onSuccess, onCancel }: ReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Please upload an image or PDF file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${appointmentId}-${Date.now()}.${fileExt}`;
      const filePath = `${appointmentId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the file path (not public URL since bucket is private)
      const receiptPath = filePath;

      // Update appointment with receipt path
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ 
          receipt_path: receiptPath,
          payment_status: "Pending Verification"
        })
        .eq("id", appointmentId);

      if (updateError) throw updateError;

      toast.success("Receipt uploaded successfully! Awaiting verification.");
      onSuccess();
    } catch (error: any) {
      console.error("Receipt upload error:", error);
      toast.error(error.message || "Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Upload Payment Receipt
        </CardTitle>
        <CardDescription>
          Upload your payment receipt for verification. Amount to pay: <strong>Rs. {doctorFee}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        {!selectedFile ? (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              id="receipt-upload"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
            <label htmlFor="receipt-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium mb-1">Click to upload receipt</p>
              <p className="text-sm text-muted-foreground">
                Supports: JPG, PNG, PDF (max 5MB)
              </p>
            </label>
          </div>
        ) : (
          <div className="relative">
            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border">
                <img 
                  src={previewUrl} 
                  alt="Receipt preview" 
                  className="w-full max-h-64 object-contain bg-muted"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={clearFile}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Image className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Payment Instructions */}
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Payment Instructions:</strong><br />
            Send Rs. {doctorFee} to the doctor's EasyPaisa/JazzCash account and upload the receipt screenshot here.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Upload Receipt
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
