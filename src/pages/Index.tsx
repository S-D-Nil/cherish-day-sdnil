import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

interface DbBirthday {
  id: string;
  name: string;
  day: string;
  month: string;
  year: string;
}

const STORAGE_KEY = "birthdays";
const MIGRATED_KEY = "birthdays_migrated_to_cloud";

const Index = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [giftPromptOpen, setGiftPromptOpen] = useState(false);
  const [currentNotificationData, setCurrentNotificationData] = useState<any>(null);

  // Load birthdays from the cloud database, migrating local data on first run
  useEffect(() => {
    const loadBirthdays = async () => {
      // One-time migration: push locally saved birthdays to the cloud
      if (!localStorage.getItem(MIGRATED_KEY)) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const localBirthdays: Birthday[] = JSON.parse(stored);
            if (localBirthdays.length > 0) {
              const { error: insertError } = await supabase
                .from("birthdays")
                .insert(
                  localBirthdays.map(({ id: _id, ...rest }) => rest)
                );
              if (!insertError) {
                console.log("Migrated local birthdays to cloud");
              }
            }
          } catch (e) {
            console.error("Migration failed:", e);
          }
        }
        localStorage.setItem(MIGRATED_KEY, "1");
      }

      const { data, error } = await supabase
        .from("birthdays")
        .select("id, name, day, month, year")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load birthdays:", error);
        toast.error("Couldn't Load Birthdays", {
          description: "Your saved birthdays couldn't be reached right now.",
        });
        return;
      }
      setBirthdays(data || []);
    };

    loadBirthdays();
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
    const { id: _localId, ...newBirthday } = birthday;
    const { data, error } = await supabase
      .from("birthdays")
      .insert(newBirthday)
      .select("id, name, day, month, year")
      .single();

    if (error || !data) {
      toast.error("Couldn't Save Birthday", {
        description: "Please check your connection and try again.",
      });
      return;
    }

    setBirthdays((prev) => [...prev, data]);

    // Schedule notification for the new birthday
    if (Capacitor.isNativePlatform()) {
      await notificationService.scheduleYearlyBirthdayNotification(data);
      toast.success("Birthday Added", {
        description: "Notification scheduled for one day before",
      });
    } else {
      toast.success("Birthday Added", {
        description: `${data.name}'s birthday has been saved`,
      });
    }
  };

  const handleDeleteBirthday = async (id: string) => {
    const birthday = birthdays.find((b) => b.id === id);
    setBirthdays((prev) => prev.filter((b) => b.id !== id));

    const { error } = await supabase.from("birthdays").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't Delete Birthday", {
        description: "Please check your connection and try again.",
      });
      return;
    }

    // Cancel notification for deleted birthday
    if (Capacitor.isNativePlatform()) {
      await notificationService.cancelBirthdayNotification(id);
    }

    toast.success("Birthday Deleted", {
      description: `${birthday?.name}'s birthday has been removed`,
    });
  };

  const handleGiftSubmit = async (gift: string) => {
    if (currentNotificationData) {
      // Store gift idea with the birthday in the cloud
      const { error } = await supabase
        .from("birthdays")
        .update({ gift_idea: gift })
        .eq("id", currentNotificationData.birthdayId);

      if (error) {
        // Fall back to local storage if the cloud write fails
        const gifts = JSON.parse(localStorage.getItem("giftIdeas") || "{}");
        gifts[currentNotificationData.birthdayId] = gift;
        localStorage.setItem("giftIdeas", JSON.stringify(gifts));
      }

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
              Cherish Day — Personalized Birthday Reminder &amp; Tracker
            </h1>
            <Sparkles className="w-10 h-10 text-primary animate-glow-pulse" />
          </div>
          <p className="text-muted-foreground text-lg">
            Never forget another special day
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Save every birthday that matters and see who is celebrating next.
            Your list is kept in the cloud, so it stays in sync on every device
            you use, and a reminder arrives the day before each birthday — with
            room to jot down the gift you have in mind.
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
