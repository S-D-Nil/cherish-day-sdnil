import { useState, useEffect } from "react";
import { PasswordLock } from "@/components/PasswordLock";
import { AddBirthdayDialog } from "@/components/AddBirthdayDialog";
import { BirthdayList } from "@/components/BirthdayList";
import { GiftPromptDialog } from "@/components/GiftPromptDialog";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { notificationService } from "@/services/notificationService";
import { Capacitor } from "@capacitor/core";

interface Birthday {
  id: string;
  name: string;
  day: string;
  month: string;
  year: string;
}

const STORAGE_KEY = "birthdays";

const Index = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [giftPromptOpen, setGiftPromptOpen] = useState(false);
  const [currentNotificationData, setCurrentNotificationData] = useState<any>(null);

  // Load birthdays from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setBirthdays(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load birthdays:", e);
      }
    }
  }, []);

  // Request notification permissions and setup listener
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      notificationService.requestPermissions();
      
      notificationService.setupNotificationListener((notificationData) => {
        setCurrentNotificationData(notificationData);
        setGiftPromptOpen(true);
      });
    }
  }, []);

  // Save birthdays to localStorage
  useEffect(() => {
    if (birthdays.length > 0 || localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(birthdays));
    }
  }, [birthdays]);

  // Check for upcoming birthdays on unlock
  useEffect(() => {
    if (isUnlocked && birthdays.length > 0) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      birthdays.forEach((birthday) => {
        const birthdayDate = new Date(
          today.getFullYear(),
          parseInt(birthday.month) - 1,
          parseInt(birthday.day)
        );

        // Check if birthday is today
        if (
          birthdayDate.getDate() === today.getDate() &&
          birthdayDate.getMonth() === today.getMonth()
        ) {
          toast.success(`🎉 Birthday Today!`, {
            description: `${birthday.name}'s birthday is today!`,
            duration: 10000,
          });
        }
        // Check if birthday is tomorrow
        else if (
          birthdayDate.getDate() === tomorrow.getDate() &&
          birthdayDate.getMonth() === tomorrow.getMonth()
        ) {
          toast.info(`⏰ Birthday Reminder`, {
            description: `${birthday.name}'s birthday is tomorrow (${birthday.day}/${birthday.month})!`,
            duration: 8000,
          });
        }
      });
    }
  }, [isUnlocked, birthdays]);

  const handleAddBirthday = async (birthday: Birthday) => {
    const updatedBirthdays = [...birthdays, birthday];
    setBirthdays(updatedBirthdays);
    
    // Schedule notification for the new birthday
    if (Capacitor.isNativePlatform()) {
      await notificationService.scheduleYearlyBirthdayNotification(birthday);
      toast.success("Birthday Added", {
        description: "Notification scheduled for one day before",
      });
    }
  };

  const handleDeleteBirthday = async (id: string) => {
    const birthday = birthdays.find((b) => b.id === id);
    setBirthdays(birthdays.filter((b) => b.id !== id));
    
    // Cancel notification for deleted birthday
    if (Capacitor.isNativePlatform()) {
      await notificationService.cancelBirthdayNotification(id);
    }
    
    toast.success("Birthday Deleted", {
      description: `${birthday?.name}'s birthday has been removed`,
    });
  };

  const handleGiftSubmit = (gift: string) => {
    if (currentNotificationData) {
      // Store gift idea in localStorage
      const gifts = JSON.parse(localStorage.getItem("giftIdeas") || "{}");
      gifts[currentNotificationData.birthdayId] = gift;
      localStorage.setItem("giftIdeas", JSON.stringify(gifts));
      
      toast.success("Gift Idea Saved", {
        description: `Gift for ${currentNotificationData.personName}: ${gift}`,
      });
    }
  };

  if (!isUnlocked) {
    return <PasswordLock onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="min-h-screen bg-background p-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-slide-up">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="w-10 h-10 text-accent animate-glow-pulse" />
            <h1 className="text-4xl font-bold text-foreground">
              Cherish Day
            </h1>
            <Sparkles className="w-10 h-10 text-primary animate-glow-pulse" />
          </div>
          <p className="text-muted-foreground text-lg">
            Never forget another special day
          </p>
        </div>

        {/* Add Birthday Button */}
        <div className="flex justify-center">
          <AddBirthdayDialog onAdd={handleAddBirthday} />
        </div>

        {/* Birthday List */}
        <BirthdayList birthdays={birthdays} onDelete={handleDeleteBirthday} />
      </div>

      {/* Gift Prompt Dialog */}
      <GiftPromptDialog
        open={giftPromptOpen}
        onClose={() => setGiftPromptOpen(false)}
        personName={currentNotificationData?.personName || ""}
        onSubmit={handleGiftSubmit}
      />
    </div>
  );
};

export default Index;
