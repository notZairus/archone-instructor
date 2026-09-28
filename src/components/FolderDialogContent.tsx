import { useState, type FormEvent } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type FolderFormValues = {
  name: string;
  description: string;
  targetFileNamePrefix: string;
};

type FolderDialogContentProps = {
  title: string;
  description: string;
  submitLabel: string;
  initialValues: FolderFormValues;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (values: FolderFormValues) => void | Promise<void>;
  onCancel: () => void;
};

const FolderDialogContent = ({
  title,
  description,
  submitLabel,
  initialValues,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
}: FolderDialogContentProps) => {
  const [values, setValues] = useState(initialValues);

  const updateValue = (key: keyof FolderFormValues, value: string) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      targetFileNamePrefix: values.targetFileNamePrefix.trim(),
    });
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={values.name}
              onChange={(event) => updateValue("name", event.target.value)}
              placeholder="e.g. Final Projects"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="folder-description">Description</Label>
            <Textarea
              id="folder-description"
              value={values.description}
              onChange={(event) =>
                updateValue("description", event.target.value)
              }
              placeholder="What belongs in this folder?"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-file-name-prefix">
              Target file name prefix
            </Label>
            <Input
              id="target-file-name-prefix"
              value={values.targetFileNamePrefix}
              onChange={(event) =>
                updateValue("targetFileNamePrefix", event.target.value)
              }
              placeholder="e.g. project-"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default FolderDialogContent;
