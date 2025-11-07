import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";

interface GiftPromptDialogProps {
  open: boolean;
  onClose: () => void;
  personName: string;
  onSubmit: (gift: string) => void;
}

export const GiftPromptDialog = ({
  open,
  onClose,
  personName,
  onSubmit,
}: GiftPromptDialogProps) => {
  const [giftIdea, setGiftIdea] = useState("");

  const handleSubmit = () => {
    if (giftIdea.trim()) {
      onSubmit(giftIdea);
      setGiftIdea("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md border-accent/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Gift className="w-5 h-5 text-accent animate-glow-pulse" />
            Gift Reminder
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            What are you going to gift {personName}?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Input
            placeholder="Enter your gift idea..."
            value={giftIdea}
            onChange={(e) => setGiftIdea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="bg-background/50 border-accent/20 focus:border-accent text-foreground"
            autoFocus
          />
          <Button
            onClick={handleSubmit}
            className="w-full bg-accent hover:bg-accent/80 text-background"
            disabled={!giftIdea.trim()}
          >
            Save Gift Idea
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
