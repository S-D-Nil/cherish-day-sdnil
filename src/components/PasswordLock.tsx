import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

interface PasswordLockProps {
  onUnlock: () => void;
}

const CORRECT_PASSWORD = "playcity2332";
const RECOVERY_DATE = "16/10";

export const PasswordLock = ({ onUnlock }: PasswordLockProps) => {
  const [password, setPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState("");

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      toast.success("Access Granted", {
        description: "Welcome to Birthday Reminder",
      });
      setTimeout(() => onUnlock(), 500);
    } else {
      toast.error("Access Denied", {
        description: "Incorrect password",
      });
      setPassword("");
    }
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryInput === RECOVERY_DATE) {
      toast.success("Password Retrieved", {
        description: `Your password is: ${CORRECT_PASSWORD}`,
      });
      setShowForgot(false);
      setRecoveryInput("");
    } else {
      toast.error("Incorrect Date", {
        description: "That's not the special date",
      });
      setRecoveryInput("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 animate-pulse" />
      
      <div className="relative z-10 w-full max-w-md p-8 animate-slide-up">
        <div className="bg-card border-2 border-primary rounded-2xl p-8 shadow-neon-blue animate-glow-pulse">
          {/* Lock Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <Lock className="w-20 h-20 text-primary animate-neon-flicker" />
              <div className="absolute inset-0 blur-xl bg-primary/50 animate-glow-pulse" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center mb-2 text-foreground">
            Birthday Reminder
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Enter password to access
          </p>

          {/* Password Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="relative">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-input border-2 border-primary/50 focus:border-primary text-foreground placeholder:text-muted-foreground h-12 text-center text-lg tracking-widest transition-all duration-300 focus:shadow-neon-blue"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all duration-300 hover:shadow-neon-blue hover:scale-105"
            >
              <Unlock className="mr-2 h-5 w-5" />
              Unlock
            </Button>
          </form>

          {/* Forgot Password */}
          <button
            onClick={() => setShowForgot(true)}
            className="w-full mt-6 text-accent hover:text-accent/80 transition-colors text-sm underline"
          >
            Forgot Password?
          </button>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgot} onOpenChange={setShowForgot}>
        <DialogContent className="bg-card border-2 border-accent shadow-neon-cyan">
          <DialogHeader>
            <DialogTitle className="text-2xl text-foreground">Password Recovery</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              When is your special someone's birthday?
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecoverySubmit} className="space-y-4 mt-4">
            <Input
              type="text"
              value={recoveryInput}
              onChange={(e) => setRecoveryInput(e.target.value)}
              placeholder="DD/MM"
              className="bg-input border-2 border-accent/50 focus:border-accent text-foreground h-12 text-center text-lg"
              maxLength={5}
            />
            <Button
              type="submit"
              className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            >
              Retrieve Password
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
