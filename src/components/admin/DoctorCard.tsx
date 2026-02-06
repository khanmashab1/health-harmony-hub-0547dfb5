import { useState } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Star, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
import { EditDoctorForm } from "./EditDoctorForm";

interface Doctor {
  user_id: string;
  specialty: string;
  fee: number;
  province: string | null;
  city: string | null;
  experience_years: number | null;
  bio: string | null;
  max_patients_per_day: number;
  easypaisa_number: string | null;
  rating: number | null;
  profile?: {
    name: string | null;
    phone: string | null;
    status: string;
  };
}

interface DoctorCardProps {
  doctor: Doctor;
  onEdit: () => void;
  onDelete: (userId: string) => void;
  isDeleting?: boolean;
}

export function DoctorCard({ doctor, onEdit, onDelete, isDeleting }: DoctorCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/50 dark:bg-card/50 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-semibold">Dr. {doctor.profile?.name || "Unknown"}</p>
            <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span>Rs. {doctor.fee}</span>
              <span>•</span>
              <span>{doctor.city}, {doctor.province}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                {doctor.rating || 4.0}
              </span>
              <span>•</span>
              <span>{doctor.experience_years || 0} yrs exp</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={doctor.profile?.status === "Active" ? "status-completed" : "status-pending"}>
            {doctor.profile?.status || "Active"}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Doctor
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive font-medium"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Permanently Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <EditDoctorForm
            doctor={doctor}
            onSuccess={() => {
              setEditOpen(false);
              onEdit();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Permanently Delete Doctor
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to <strong>permanently delete</strong> Dr. {doctor.profile?.name || "Unknown"}?
              </p>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-sm">
                <p className="font-semibold mb-1">⚠️ This action is irreversible!</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Doctor's account will be permanently removed</li>
                  <li>All appointments and medical records will be deleted</li>
                  <li>Reviews, schedules, and PA assignments will be removed</li>
                  <li>This data cannot be recovered</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(doctor.user_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
