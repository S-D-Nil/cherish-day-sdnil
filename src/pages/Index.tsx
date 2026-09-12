import { useState, useEffect } from "react";
import { AddBirthdayDialog } from "@/components/AddBirthdayDialog";
import { BirthdayList, Birthday } from "@/components/BirthdayList";
import { PasswordLock } from "@/components/PasswordLock";
import { GiftPromptDialog } from "@/components/GiftPromptDialog";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import {
  notificationService,
  formatBirthdayNotificationText,
} from "@/services/notificationService";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "cherish_day_birthdays";
const MIGRATED_KEY = "cherish_day_migrated_to_cloud";

const Index = () => {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [giftPromptOpen, setGiftPromptOpen] = useState(false);
  const [currentNotificationData, setCurrentNotificationData] = useState<{
    birthdayId: string;
    personName: string;
    birthDate?: string;
    existingGift?: string;
  } | null>(null);

  // Load birthdays from Supabase (with one-time migration from localStorage if exists)
  useEffect(() => {
    const loadBirthdays = async () => {
      // Check if local migration is needed
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
        .select("id, name, day, month, year, gift_idea")
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

  // Request notification permissions and setup listener for native and service worker taps
  useEffect(() => {
    // Check if opened via notification click in phone navigation tray
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("openGift") === "true") {
        const birthdayId = params.get("birthdayId") || "";
        const personName = params.get("name") || "";
        const birthDate = params.get("date") || "";
        setCurrentNotificationData({
          birthdayId,
          personName,
          birthDate,
        });
        setGiftPromptOpen(true);
      }
    }

    // Register service worker so phone navigation tray push notifications work
    notificationService.registerServiceWorker();

    notificationService.setupNotificationListener((notificationData) => {
      if (notificationData) {
        setCurrentNotificationData(notificationData as {
          birthdayId: string;
          personName: string;
          birthDate?: string;
          existingGift?: string;
        });
        setGiftPromptOpen(true);
      }
    });

    if (Capacitor.isNativePlatform()) {
      notificationService.requestPermissions();
    }
  }, []);

  // Schedule native notifications when birthdays change
  useEffect(() => {
    if (Capacitor.isNativePlatform() && birthdays.length > 0) {
      notificationService.rescheduleAllNotifications(birthdays);
    }
  }, [birthdays]);

  // Check for upcoming birthdays on unlock: specifically 1-day before alerts
  useEffect(() => {
    if (isUnlocked && birthdays.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      birthdays.forEach((birthday) => {
        const currentYear = today.getFullYear();
        let targetBirthday = new Date(
          currentYear,
          parseInt(birthday.month, 10) - 1,
          parseInt(birthday.day, 10),
          0,
          0,
          0
        );

        if (targetBirthday.getTime() < today.getTime()) {
          targetBirthday = new Date(
            currentYear + 1,
            parseInt(birthday.month, 10) - 1,
            parseInt(birthday.day, 10),
            0,
            0,
            0
          );
        }

        const diffDays = Math.round(
          (targetBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Exactly 1 Day Before birthday
        if (diffDays === 1) {
          const isHandled = notificationService.isNotificationHandledThisYear(birthday.id);
          const exactText = formatBirthdayNotificationText(birthday.day, birthday.month, birthday.name);

          if (!isHandled) {
            toast.info(`🔔 1-Day Before Birthday Alert`, {
              description: exactText,
              duration: 9000,
              action: {
                label: "Gift Note",
                onClick: () => {
                  setCurrentNotificationData({
                    birthdayId: birthday.id,
                    personName: birthday.name,
                    birthDate: `${birthday.day.padStart(2, "0")}/${birthday.month.padStart(2, "0")}`,
                    existingGift: birthday.gift_idea || undefined,
                  });
                  setGiftPromptOpen(true);
                },
              },
            });

            // Dispatch real push notification to mobile / OS notification tray
            if (notificationService.isWebSupported() && Notification.permission === "granted") {
              notificationService.sendBirthday1DayBeforeNotification(birthday, () => {
                setCurrentNotificationData({
                  birthdayId: birthday.id,
                  personName: birthday.name,
                  birthDate: `${birthday.day.padStart(2, "0")}/${birthday.month.padStart(2, "0")}`,
                  existingGift: birthday.gift_idea || undefined,
                });
                setGiftPromptOpen(true);
              });
            }
          }
        }
        // Birthday is Today
        else if (diffDays === 0) {
          toast.success(`🎉 Birthday Today!`, {
            description: `${birthday.name}'s birthday is today!`,
            duration: 8000,
          });
        }
      });
    }
  }, [isUnlocked, birthdays]);

  // Direct trigger function for testing or manual push
  const handleTriggerPushNotification = async (birthday: Birthday) => {
    const success = await notificationService.sendBirthday1DayBeforeNotification(birthday, () => {
      setCurrentNotificationData({
        birthdayId: birthday.id,
        personName: birthday.name,
        birthDate: `${birthday.day.padStart(2, "0")}/${birthday.month.padStart(2, "0")}`,
        existingGift: birthday.gift_idea || undefined,
      });
      setGiftPromptOpen(true);
    });

    const exactText = formatBirthdayNotificationText(birthday.day, birthday.month, birthday.name);
    if (success) {
      toast.success("1-Day Before Notification Sent to Navigation Tray!", {
        description: `"${exactText}" is now in your device's notification tray / navigation shade.`,
        duration: 7000,
      });
    } else {
      toast.info("Notification Requested", {
        description: `Permission might be needed. If blocked, tap below to open the gift screen.`,
        action: {
          label: "Open Gift Screen",
          onClick: () => {
            setCurrentNotificationData({
              birthdayId: birthday.id,
              personName: birthday.name,
              birthDate: `${birthday.day.padStart(2, "0")}/${birthday.month.padStart(2, "0")}`,
              existingGift: birthday.gift_idea || undefined,
            });
            setGiftPromptOpen(true);
          },
        },
      });
    }
  };

  const handleAddBirthday = async (birthday: Birthday) => {
    const { id: _localId, ...newBirthday } = birthday;
    const { data, error } = await supabase
      .from("birthdays")
      .insert(newBirthday)
      .select("id, name, day, month, year, gift_idea")
      .single();

    if (error || !data) {
      toast.error("Couldn't Save Birthday", {
        description: "Please check your connection and try again.",
      });
      return;
    }

    setBirthdays((prev) => [...prev, data]);

    // Schedule notification for the new birthday on native
    if (Capacitor.isNativePlatform()) {
      await notificationService.scheduleYearlyBirthdayNotification(data);
      toast.success("Birthday Added", {
        description: "1-day before yearly push notification scheduled",
      });
    } else {
      toast.success("Birthday Added", {
        description: `${data.name}'s birthday has been saved (${data.day.padStart(2, "0")}/${data.month.padStart(2, "0")})`,
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

  // Submission handler for gift note follow-up
  const handleGiftSubmit = async (gift: string, birthdayId?: string) => {
    const targetId = birthdayId || currentNotificationData?.birthdayId;
    const personName = currentNotificationData?.personName || "Person";

    if (targetId) {
      // Store gift idea with the birthday in Supabase cloud
      const { error } = await supabase
        .from("birthdays")
        .update({ gift_idea: gift })
        .eq("id", targetId);

      if (error) {
        // Local fallback
        const gifts = JSON.parse(localStorage.getItem("giftIdeas") || "{}");
        gifts[targetId] = gift;
        localStorage.setItem("giftIdeas", JSON.stringify(gifts));
      }

      // Update local react state immediately
      setBirthdays((prev) =>
        prev.map((b) => (b.id === targetId ? { ...b, gift_idea: gift } : b))
      );

      // Mark notification as handled for the current year
      notificationService.markNotificationHandled(targetId, gift);

      // Dismiss / clear notification from notification tray
      await notificationService.clearNotificationForBirthday(targetId);

      toast.success("Gift Idea Saved & Notification Cleared", {
        description: `Gift note for ${personName} recorded. Yearly alert marked complete!`,
      });
    } else {
      toast.success("Gift Idea Saved", {
        description: `Idea for ${personName}: ${gift}`,
      });
    }

    setGiftPromptOpen(false);
  };

  // Clear notification without saving a note
  const handleClearOnly = async (birthdayId?: string) => {
    const targetId = birthdayId || currentNotificationData?.birthdayId;
    if (targetId) {
      notificationService.markNotificationHandled(targetId);
      await notificationService.clearNotificationForBirthday(targetId);
      toast.info("Notification Cleared", {
        description: "Notification dismissed and marked handled for this year.",
      });
    }
    setGiftPromptOpen(false);
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
        <div className="text-center space-y-3 pt-6">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="w-9 h-9 text-accent animate-glow-pulse" />
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Cherish Day
            </h1>
            <Sparkles className="w-9 h-9 text-primary animate-glow-pulse" />
          </div>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Persistent 1-day before push notifications with gift reminder notes
          </p>
        </div>

        {/* Action Buttons: Add Birthday & Push Notifications Manager */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <AddBirthdayDialog onAdd={handleAddBirthday} />
          <PushNotificationManager
            birthdays={birthdays}
            onTriggerGiftPrompt={(personName, birthdayId, birthDate) => {
              const b = birthdays.find((item) => item.id === birthdayId);
              setCurrentNotificationData({
                personName,
                birthdayId: birthdayId || "",
                birthDate: birthDate,
                existingGift: b?.gift_idea || undefined,
              });
              setGiftPromptOpen(true);
            }}
            onTriggerBirthdayPush={handleTriggerPushNotification}
          />
        </div>

        {/* Birthday List */}
        <BirthdayList
          birthdays={birthdays}
          onDelete={handleDeleteBirthday}
          onTriggerTestNotification={handleTriggerPushNotification}
          onOpenGiftModal={(b) => {
            setCurrentNotificationData({
              birthdayId: b.id,
              personName: b.name,
              birthDate: `${b.day.padStart(2, "0")}/${b.month.padStart(2, "0")}`,
              existingGift: b.gift_idea || undefined,
            });
            setGiftPromptOpen(true);
          }}
        />
      </div>

      {/* Dedicated Gift Reminder Prompt Dialog */}
      <GiftPromptDialog
        open={giftPromptOpen}
        onClose={() => setGiftPromptOpen(false)}
        personName={currentNotificationData?.personName || ""}
        birthDate={currentNotificationData?.birthDate}
        birthdayId={currentNotificationData?.birthdayId}
        existingGift={currentNotificationData?.existingGift}
        onSubmit={handleGiftSubmit}
        onClearOnly={handleClearOnly}
      />
    </div>
  );
};

export default Index;
