import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogContentProps = {
  title: string;
  description: string;
  confirmLabel: string;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

const ConfirmDialogContent = ({
  title,
  description,
  confirmLabel,
  isSubmitting,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogContentProps) => {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {error && <p className="px-4 text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={() => void onConfirm()}
        >
          {isSubmitting ? "Deleting..." : confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default ConfirmDialogContent;
