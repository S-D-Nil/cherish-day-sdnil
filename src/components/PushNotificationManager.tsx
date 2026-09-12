import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  notificationService,
  WebNotificationPermission,
  formatBirthdayNotificationText,
  Birthday,
} from "@/services/notificationService";
import { Bell, BellRing, Sparkles, Send, Clock, CheckCircle2, AlertTriangle, Gift, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface PushNotificationManagerProps {
  birthdays?: Birthday[];
  onTriggerGiftPrompt?: (personName: string, birthdayId?: string, birthDate?: string) => void;
  onTriggerBirthdayPush?: (birthday: Birthday) => void;
}

export const PushNotificationManager = ({
  birthdays = [],
  onTriggerGiftPrompt,
  onTriggerBirthdayPush,
}: PushNotificationManagerProps) => {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<WebNotificationPermission>("default");
  const [awayTrackingEnabled, setAwayTrackingEnabled] = useState(false);
  const [awaySeconds, setAwaySeconds] = useState(0);
  const [tabVisibility, setTabVisibility] = useState<"visible" | "hidden">("visible");
  const [customTitle, setCustomTitle] = useState("Birthday Alert!");
  const [customBody, setCustomBody] = useState("Someone special has a birthday tomorrow 🎂");
  const [customTag, setCustomTag] = useState("birthday-reminder");

  // Sample person for instant test of requirement: "16/10 is birthday of Rashi"
  const samplePerson: Birthday = {
    id: "sample-rashi-test",
    name: "Rashi",
    day: "16",
    month: "10",
    year: "2000",
    gift_idea: null,
  };

  const refreshPermission = () => {
    const current = notificationService.getPermission();
    setPermission(current);
  };

  useEffect(() => {
    if (open) {
      refreshPermission();
    }
  }, [open]);

  // Request Permission
  const handleRequestPermission = async () => {
    if (!notificationService.isWebSupported()) {
      alert("unsupported: Notification API is not supported in this browser.");
      toast.error("Notifications Unsupported", {
        description: "Your browser or environment doesn't support web notifications.",
      });
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      refreshPermission();
      alert(perm);

      if (perm === "granted") {
        toast.success("Push Notifications Enabled!", {
          description: "You'll now receive browser notifications for reminders.",
        });
      } else if (perm === "denied") {
        toast.error("Permission Denied", {
          description: "Notifications are blocked in your browser settings for this site.",
        });
      }
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Could not request permission in this frame.";
      toast.error("Permission Request Error", {
        description: msg,
      });
    }
  };

  // Trigger 1-day before push notification for sample or saved person
  const handleTrigger1DayPush = async (person: Birthday) => {
    if (permission !== "granted") {
      toast.error("Permission Required", {
        description: "Please click 'Request Permission' first so notifications can appear in your phone's notification tray.",
      });
      return;
    }

    const exactText = formatBirthdayNotificationText(person.day, person.month, person.name);

    if (onTriggerBirthdayPush) {
      onTriggerBirthdayPush(person);
      return;
    }

    // Direct fallback trigger
    const success = await notificationService.sendBirthday1DayBeforeNotification(person, () => {
      if (onTriggerGiftPrompt) {
        onTriggerGiftPrompt(
          person.name,
          person.id,
          `${person.day.padStart(2, "0")}/${person.month.padStart(2, "0")}`
        );
      }
    });

    if (success) {
      toast.success("Notification Sent to Phone Tray!", {
        description: `Text: "${exactText}". Pull down your phone's navigation shade to see and tap it.`,
        duration: 7000,
      });
    }
  };

  // Reset handled status for testing
  const handleResetHandledStatus = (id: string, name: string) => {
    notificationService.resetNotificationHandled(id);
    toast.success(`Reset status for ${name}`, {
      description: "You can now trigger the yearly notification again.",
    });
  };

  // Basic notification trigger
  const handleSendExampleNotification = async () => {
    if (permission !== "granted") {
      toast.error("Permission Not Granted", {
        description: "Please click 'Request Permission' first.",
      });
      return;
    }

    const randomVal = Math.random();
    const success = await notificationService.sendWebNotification("Example notification", {
      body: String(randomVal),
      tag: "welcome message",
      icon: "/logo_centered.png",
      data: { hello: "world", generatedAt: Date.now() },
      onClick: () => {
        toast.info("You clicked the Example Notification!", {
          description: `Random payload body was: ${randomVal}`,
        });
      },
    });

    if (success) {
      toast.success("Example Notification Sent to Phone Tray!", {
        description: `Check your phone's top navigation shade for the alert.`,
      });
    }
  };

  // Custom notification test
  const handleSendCustomNotification = async () => {
    if (permission !== "granted") {
      toast.error("Permission Not Granted", {
        description: "Please click 'Request Permission' first.",
      });
      return;
    }

    const success = await notificationService.sendWebNotification(customTitle || "Cherish Day Alert", {
      body: customBody || "Special reminder notification",
      tag: customTag || "cherish-day-custom",
      icon: "/logo_centered.png",
      data: { custom: true, timestamp: Date.now() },
      onClick: () => {
        if (onTriggerGiftPrompt) {
          onTriggerGiftPrompt("Alex");
        }
      },
    });

    if (success) {
      toast.success("Custom Notification Sent to Phone Tray!");
    }
  };

  // Visibility change tracker toggle
  const handleToggleAwayTracking = (checked: boolean) => {
    if (checked) {
      if (permission !== "granted") {
        toast.error("Permission Not Granted", {
          description: "Grant notification permissions first so we can alert you when you leave.",
        });
        return;
      }

      const started = notificationService.startVisibilityTracker({
        onTick: (seconds) => {
          setAwaySeconds(seconds);
        },
        onStateChange: (state) => {
          setTabVisibility(state);
        },
      });

      if (started) {
        setAwayTrackingEnabled(true);
        toast.success("Tab Away Tracking Started", {
          description: "Switch to another tab or minimize browser to test away alerts.",
        });
      }
    } else {
      notificationService.stopVisibilityTracker();
      setAwayTrackingEnabled(false);
      setAwaySeconds(0);
      toast.info("Tab Away Tracking Stopped");
    }
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case "granted":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 gap-1 font-mono text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> GRANTED
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="destructive" className="gap-1 font-mono text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> DENIED
          </Badge>
        );
      case "unsupported":
        return (
          <Badge variant="outline" className="border-red-500/40 text-red-400 gap-1 font-mono text-xs">
            UNSUPPORTED
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1 font-mono text-xs text-amber-400 border-amber-400/30">
            DEFAULT / UNSET
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id="push-notifications-trigger-btn"
          variant="outline"
          className="border-primary/40 hover:border-accent hover:text-accent gap-2 transition-all relative"
        >
          {permission === "granted" ? (
            <BellRing className="w-4 h-4 text-primary animate-pulse" />
          ) : (
            <Bell className="w-4 h-4 text-muted-foreground" />
          )}
          <span>Push Notifications</span>
          {permission === "granted" && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-background animate-ping" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-primary/20 backdrop-blur-md">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                <BellRing className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-bold">Push Notification & Gift Reminder</DialogTitle>
            </div>
            {getPermissionBadge()}
          </div>
          <DialogDescription className="text-muted-foreground">
            Automatic 1-day before push notifications with mobile tray persistence and gift idea follow-up prompts.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="1day-push" className="w-full mt-2">
          <TabsList className="grid grid-cols-4 w-full bg-muted/40">
            <TabsTrigger value="1day-push" className="text-xs">1-Day Push</TabsTrigger>
            <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
            <TabsTrigger value="away" className="text-xs">Away Tracker</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs">Custom</TabsTrigger>
          </TabsList>

          {/* 1-DAY BEFORE PUSH TAB (MAIN FEATURE) */}
          <TabsContent value="1day-push" className="space-y-4 pt-3">
            {/* Permission status card */}
            <Card className="border-primary/20 bg-background/50">
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-primary" /> System Tray Notification Rights
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {permission === "granted"
                      ? "Push notifications authorized. Notifications appear in your mobile & desktop tray."
                      : "Permission required to display notifications in the mobile / OS notification tray."}
                  </p>
                </div>
                {permission !== "granted" && (
                  <Button
                    size="sm"
                    onClick={handleRequestPermission}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                  >
                    Enable Notifications
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Exact Notification Specification */}
            <Card className="border-accent/30 bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Sparkles className="w-4 h-4 text-accent" /> Exact Notification Specification
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Standard format sent exactly 1 day before every person's birthday:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-black/60 p-3 font-mono text-xs text-accent border border-accent/30 space-y-1">
                  <p className="text-muted-foreground text-[11px]">Format:</p>
                  <p className="font-bold">&lt;date of birth&gt; is birthday of &lt;person’s name&gt;</p>
                  <p className="text-muted-foreground text-[11px] pt-1">Example output:</p>
                  <p className="text-emerald-400 font-bold">16/10 is birthday of Rashi</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="p-2.5 rounded-lg bg-background/40 border border-border">
                    <span className="font-semibold text-foreground block">🔔 Mobile Tray Persistence</span>
                    <span>Persistent behavior (<code className="text-primary font-mono">requireInteraction: true</code> &amp; <code className="text-primary font-mono">ongoing: true</code>) guides user to tap before dismissing.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/40 border border-border">
                    <span className="font-semibold text-foreground block">🎁 Tapping Opens Gift Screen</span>
                    <span>Asks “What are you going to gift?”. Submitting saves the note and clears the notification.</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test 1-Day Notification Immediately */}
            <Card className="border-primary/20 bg-background/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Interactive 1-Day Notification Testers</span>
                  <Badge variant="outline" className="font-mono text-xs text-accent border-accent/40">1 per year rule</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Fire real notifications to see them appear in your device notification tray:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 1. Test with Example: Rashi 16/10 */}
                <div className="p-3.5 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <span>Example Persona: Rashi</span>
                      <Badge variant="secondary" className="font-mono text-xs">16/10</Badge>
                    </p>
                    <p className="text-xs font-mono text-accent mt-0.5">
                      "16/10 is birthday of Rashi"
                    </p>
                  </div>
                  <Button
                    id="test-rashi-push-btn"
                    onClick={() => handleTrigger1DayPush(samplePerson)}
                    disabled={permission !== "granted"}
                    className="shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Test Rashi Notification
                  </Button>
                </div>

                {/* 2. Test with any saved birthday */}
                {birthdays.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-primary" /> Test with your saved birthdays:
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {birthdays.map((b) => {
                        const isHandled = notificationService.isNotificationHandledThisYear(b.id);
                        const exactText = formatBirthdayNotificationText(b.day, b.month, b.name);

                        return (
                          <div
                            key={b.id}
                            className="p-2.5 rounded-lg border border-border bg-background/30 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="truncate flex-1">
                              <span className="font-semibold text-foreground">{b.name}</span>{" "}
                              <span className="font-mono text-muted-foreground">({b.day.padStart(2, "0")}/{b.month.padStart(2, "0")})</span>
                              <p className="text-[11px] font-mono text-primary truncate mt-0.5">
                                "{exactText}"
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isHandled ? (
                                <>
                                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                                    Handled
                                  </Badge>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    title="Reset handled status"
                                    onClick={() => handleResetHandledStatus(b.id, b.name)}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              ) : null}

                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-primary/30 hover:border-accent hover:text-accent"
                                onClick={() => handleTrigger1DayPush(b)}
                                disabled={permission !== "granted"}
                              >
                                Test Push
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BASIC TAB */}
          <TabsContent value="basic" className="space-y-4 pt-3">
            <Card className="border-primary/20 bg-background/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>1. Permission Control</span>
                  <span className="text-xs font-mono text-muted-foreground">Notification.requestPermission()</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Request notification rights from the browser and inspect the returned permission state.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/20 border border-border">
                  <div>
                    <p className="text-sm font-medium">Status: <span className="font-mono text-primary">{permission}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {permission === "granted" && "Notifications are authorized. You can send push alerts freely."}
                      {permission === "default" && "Browser has not yet requested permission or user hasn't responded."}
                      {permission === "denied" && "Blocked in site settings. Change permissions in your browser URL bar."}
                      {permission === "unsupported" && "Notification API is unavailable in this environment."}
                    </p>
                  </div>
                  <Button
                    id="request-permission-btn"
                    onClick={handleRequestPermission}
                    className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                  >
                    <Bell className="w-4 h-4" />
                    Request Permission
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-background/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>2. Example Notification Trigger</span>
                  <span className="text-xs font-mono text-muted-foreground">new Notification(...)</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Sends notification with random body, welcome tag, logo icon, and data object.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-black/40 p-3 font-mono text-xs text-primary/90 border border-primary/20 overflow-x-auto">
                  <code>{`new Notification("Example notification", {
  body: Math.random(),
  tag: "welcome message",
  icon: "logo_centered.png",
  data: { hello: "world" }
});`}</code>
                </div>

                <Button
                  id="send-example-notification-btn"
                  onClick={handleSendExampleNotification}
                  disabled={permission !== "granted"}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-2 py-5"
                >
                  <Send className="w-4 h-4" />
                  Trigger Example Notification
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AWAY TRACKER TAB */}
          <TabsContent value="away" className="space-y-4 pt-3">
            <Card className="border-primary/20 bg-background/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Tab Away Tracking Notification
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Uses <code>document.addEventListener("visibilitychange")</code> to count seconds away and update notification via <code>tag: "come back"</code>.
                    </CardDescription>
                  </div>
                  <Switch
                    id="away-tracker-switch"
                    checked={awayTrackingEnabled}
                    onCheckedChange={handleToggleAwayTracking}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Tracker Status:</span>
                    <Badge variant={awayTrackingEnabled ? "default" : "outline"} className={awayTrackingEnabled ? "bg-primary text-primary-foreground" : ""}>
                      {awayTrackingEnabled ? "ACTIVE (Listening for tab switch)" : "DISABLED"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Current Tab Visibility:</span>
                    <span className="text-xs font-mono uppercase text-primary font-bold">{tabVisibility}</span>
                  </div>
                  {awayTrackingEnabled && tabVisibility === "hidden" && (
                    <div className="flex items-center justify-between pt-1 text-accent font-semibold">
                      <span className="text-xs">Seconds Elapsed:</span>
                      <span className="text-sm font-mono">{awaySeconds}s</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CUSTOM TESTER TAB */}
          <TabsContent value="custom" className="space-y-4 pt-3">
            <Card className="border-primary/20 bg-background/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Custom Notification Creator</CardTitle>
                <CardDescription className="text-xs">
                  Customize title, body, and notification tag to test desktop and mobile notification behaviors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="custom-title" className="text-xs">Title</Label>
                  <Input
                    id="custom-title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Notification Title"
                    className="bg-background/80"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="custom-body" className="text-xs">Body Message</Label>
                  <Input
                    id="custom-body"
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder="Notification Body..."
                    className="bg-background/80"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="custom-tag" className="text-xs">Tag</Label>
                  <Input
                    id="custom-tag"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="e.g. welcome message or birthday"
                    className="bg-background/80"
                  />
                </div>

                <Button
                  id="send-custom-notification-btn"
                  onClick={handleSendCustomNotification}
                  disabled={permission !== "granted"}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-2 gap-2"
                >
                  <Send className="w-4 h-4" />
                  Dispatch Custom Notification
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
