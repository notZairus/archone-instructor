import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteClassroom } from "@/lib/db";
import type { Classroom } from "@/types/global";
import { useNavigate } from "react-router";

type DeleteClassDialogProps = {
  classroom: Classroom;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (classroomId: string) => void;
};

export function DeleteClassDialog({
  classroom,
  open,
  onOpenChange,
  onDeleted,
}: DeleteClassDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmationText = `Delete ${classroom.name}`;
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setConfirmation("");
      setIsDeleting(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (confirmation !== confirmationText) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteClassroom(classroom.$id);
      onDeleted(classroom.$id);
      onOpenChange(false);
      toast.success("Classroom deleted.");
    } catch {
      toast.error("Could not delete classroom.");
    } finally {
      setIsDeleting(false);
      navigate(-1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete classroom</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Type{" "}
            <span className="font-medium text-foreground">
              {confirmationText}
            </span>{" "}
            to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="px-4">
          <label htmlFor="delete-classroom-confirmation" className="sr-only">
            Confirmation text
          </label>
          <Input
            id="delete-classroom-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={confirmationText}
            disabled={isDeleting}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={confirmation !== confirmationText || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete classroom"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
