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
        className="p-3 sm:p-4 rounded-xl border border-border/50 bg-white/50 dark:bg-card/50 hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center flex-shrink-0">
              <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm sm:text-base truncate">Dr. {doctor.profile?.name || "Unknown"}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{doctor.specialty}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground mt-1">
                <span>Rs. {doctor.fee}</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate">{doctor.city}{doctor.province ? `, ${doctor.province}` : ''}</span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  {doctor.rating || 4.0}
                </span>
                <span className="hidden sm:inline">•</span>
                <span>{doctor.experience_years || 0} yrs</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Badge className={`text-[10px] sm:text-xs ${doctor.profile?.status === "Active" ? "status-completed" : "status-pending"}`}>
              {doctor.profile?.status || "Active"}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
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
