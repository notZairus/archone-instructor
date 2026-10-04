import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { updateClassroom } from "@/lib/db";
import type { Classroom } from "@/types/global";

type ClassEditDialogProps = {
  classroom: Classroom;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (classroom: Classroom) => void;
};

export function ClassEditDialog({
  classroom,
  open,
  onOpenChange,
  onSaved,
}: ClassEditDialogProps) {
  const [name, setName] = useState(classroom.name);
  const [description, setDescription] = useState(classroom.description);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      toast.error("Classroom name is required.");
      return;
    }

    setIsSaving(true);

    try {
      const updatedClassroom = await updateClassroom(
        classroom.$id,
        trimmedName,
        trimmedDescription,
      );
      onSaved(updatedClassroom);
      onOpenChange(false);
      toast.success("Classroom updated.");
    } catch {
      toast.error("Could not update classroom.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit classroom</DialogTitle>
          <DialogDescription>
            Update the classroom name and description.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-4">
          <div className="space-y-2">
            <label htmlFor="classroom-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="classroom-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="classroom-description"
              className="text-sm font-medium"
            >
              Description
            </label>
            <Textarea
              id="classroom-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
