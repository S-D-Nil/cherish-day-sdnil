import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, CheckCircle2, BellOff, Sparkles, Calendar, Tag } from "lucide-react";

interface GiftPromptDialogProps {
  open: boolean;
  onClose: () => void;
  personName: string;
  birthDate?: string;
  birthdayId?: string;
  existingGift?: string | null;
  onSubmit: (gift: string, birthdayId?: string) => void | Promise<void>;
  onClearOnly?: (birthdayId?: string) => void;
}

const GIFT_SUGGESTIONS = [
  "Custom Photo Frame",
  "Handwritten Letter & Cake",
  "Favorite Book / Kindle",
  "Smart Watch / Tech Gear",
  "Dinner Experience",
  "Perfume / Fragrance",
  "Gift Card",
  "Art Print / Keepsake",
];

export const GiftPromptDialog = ({
  open,
  onClose,
  personName,
  birthDate,
  birthdayId,
  existingGift,
  onSubmit,
  onClearOnly,
}: GiftPromptDialogProps) => {
  const [giftIdea, setGiftIdea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setGiftIdea(existingGift || "");
    }
  }, [open, existingGift]);

  const handleSubmit = async () => {
    if (!giftIdea.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(giftIdea.trim(), birthdayId);
      setGiftIdea("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearWithoutGift = () => {
    if (onClearOnly) {
      onClearOnly(birthdayId);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl border border-primary/30 shadow-neon-blue/20">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-accent/15 border border-accent/30 text-accent">
                <Gift className="w-5 h-5 animate-pulse" />
              </div>
              <Badge variant="outline" className="border-accent/40 text-accent text-xs font-mono">
                1-Day Before Follow-Up
              </Badge>
            </div>
            {birthDate && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3" />
                {birthDate}
              </Badge>
            )}
          </div>

          <DialogTitle className="text-2xl font-bold text-foreground pt-1 tracking-tight">
            What are you going to gift?
          </DialogTitle>

          <DialogDescription className="text-muted-foreground text-sm">
            {birthDate
              ? `${birthDate} is birthday of ${personName}. Save your gift idea or note now to stay ahead of the celebration!`
              : `Tomorrow is birthday of ${personName}. Jot down your gift plan to make their day memorable.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Note Input */}
          <div className="space-y-2">
            <label htmlFor="gift-idea-input" className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Gift Idea or Reminder Note for {personName}:
            </label>
            <Textarea
              id="gift-idea-input"
              placeholder={`e.g., Surprise with chocolate cheesecake, or order that sci-fi novel they wanted...`}
              value={giftIdea}
              onChange={(e) => setGiftIdea(e.target.value)}
              className="bg-background/70 border-primary/30 focus:border-accent text-foreground resize-none min-h-[95px] text-sm leading-relaxed"
              autoFocus
            />
          </div>

          {/* Quick Idea Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
              <Tag className="w-3 h-3 text-muted-foreground" /> Quick suggestions (click to append):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {GIFT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setGiftIdea((prev) => (prev ? `${prev}, ${suggestion}` : suggestion));
                  }}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted/30 hover:bg-accent/15 hover:text-accent border border-border transition-colors text-muted-foreground"
                >
                  +{suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Notification status info */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Submitting saves your gift note and immediately clears this notification from your tray.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              id="submit-gift-idea-btn"
              onClick={handleSubmit}
              disabled={!giftIdea.trim() || isSubmitting}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-2 py-5 shadow-neon-cyan/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? "Saving & Clearing..." : "Submit Gift & Clear Notification"}
            </Button>

            <Button
              id="dismiss-gift-prompt-btn"
              variant="outline"
              onClick={handleClearWithoutGift}
              className="border-border text-muted-foreground hover:text-foreground gap-1.5 py-5"
            >
              <BellOff className="w-4 h-4" />
              Clear Without Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

