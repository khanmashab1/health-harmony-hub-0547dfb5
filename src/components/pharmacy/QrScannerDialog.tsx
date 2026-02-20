import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera } from "lucide-react";

interface QrScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

export function QrScannerDialog({ open, onClose, onScan }: QrScannerDialogProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const mountId = "qr-reader";

  useEffect(() => {
    if (!open) return;

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        mountId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Extract appointment ID from URL or use raw text
          let id = decodedText;
          const verifyMatch = decodedText.match(/\/verify\/([a-f0-9-]+)/i);
          if (verifyMatch) {
            id = verifyMatch[1];
          }
          onScan(id);
          scanner.clear().catch(() => {});
          onClose();
        },
        (errorMessage) => {
          // Ignore scan errors (no QR in frame)
        }
      );

      scannerRef.current = scanner;
    }, 300);

    return () => {
      clearTimeout(timeout);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, onScan, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Scan QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at the prescription QR code
          </DialogDescription>
        </DialogHeader>
        <div id={mountId} className="w-full rounded-lg overflow-hidden" />
        <p className="text-xs text-muted-foreground text-center">
          Allow camera permission when prompted. Ensure good lighting for best results.
        </p>
      </DialogContent>
    </Dialog>
  );
}
