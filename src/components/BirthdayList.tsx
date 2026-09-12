import { Trash2, Calendar, Cake, Gift, BellRing, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notificationService } from "@/services/notificationService";

export interface Birthday {
  id: string;
  name: string;
  day: string;
  month: string;
  year: string;
  gift_idea?: string | null;
}

interface BirthdayListProps {
  birthdays: Birthday[];
  onDelete: (id: string) => void;
  onTriggerTestNotification?: (birthday: Birthday) => void;
  onOpenGiftModal?: (birthday: Birthday) => void;
}

export const BirthdayList = ({
  birthdays,
  onDelete,
  onTriggerTestNotification,
  onOpenGiftModal,
}: BirthdayListProps) => {
  const getNextBirthday = (birthday: Birthday) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const birthdayThisYear = new Date(currentYear, parseInt(birthday.month) - 1, parseInt(birthday.day));
    
    if (birthdayThisYear < today) {
      return new Date(currentYear + 1, parseInt(birthday.month) - 1, parseInt(birthday.day));
    }
    return birthdayThisYear;
  };

  const getDaysUntil = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diff = date.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getAge = (birthday: Birthday) => {
    const today = new Date();
    const birthYear = parseInt(birthday.year);
    const birthMonth = parseInt(birthday.month) - 1;
    const birthDay = parseInt(birthday.day);
    
    let age = today.getFullYear() - birthYear;
    if (today.getMonth() < birthMonth || (today.getMonth() === birthMonth && today.getDate() < birthDay)) {
      age--;
    }
    return age;
  };

  const sortedBirthdays = [...birthdays].sort((a, b) => {
    const nextA = getNextBirthday(a);
    const nextB = getNextBirthday(b);
    return nextA.getTime() - nextB.getTime();
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (birthdays.length === 0) {
    return (
      <Card className="bg-card border-2 border-primary/30 p-12 text-center shadow-neon-blue/30">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground text-lg">No birthdays added yet</p>
        <p className="text-muted-foreground text-sm mt-2">Start adding birthdays to never forget them!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Cake className="w-7 h-7 text-accent" />
          Upcoming Birthdays
        </h2>
        <span className="text-xs text-muted-foreground font-mono">
          Each person receives 1 persistent push notification exactly 1 day before
        </span>
      </div>

      <div className="space-y-3">
        {sortedBirthdays.map((birthday, index) => {
          const nextBirthday = getNextBirthday(birthday);
          const daysUntil = getDaysUntil(nextBirthday);
          const age = getAge(birthday);
          const isToday = daysUntil === 0;
          const isTomorrow = daysUntil === 1;
          const isHandled = notificationService.isNotificationHandledThisYear(birthday.id);

          return (
            <Card 
              key={birthday.id}
              className={`bg-card border-2 ${
                isToday
                  ? 'border-accent animate-glow-pulse shadow-neon-cyan'
                  : isTomorrow
                  ? 'border-primary shadow-neon-blue/40 ring-1 ring-primary/40'
                  : 'border-primary/50 hover:border-primary'
              } p-4 transition-all duration-300 hover:shadow-neon-blue group animate-slide-up`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                      {birthday.name}
                    </h3>
                    <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                      {birthday.day.padStart(2, '0')}/{birthday.month.padStart(2, '0')}
                    </Badge>
                    {isHandled ? (
                      <Badge variant="secondary" className="text-[11px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> Notified & Handled
                      </Badge>
                    ) : isTomorrow ? (
                      <Badge className="text-[11px] bg-accent/20 text-accent border-accent/40 animate-pulse flex items-center gap-1 font-mono">
                        <BellRing className="w-3 h-3" /> 1 Day Away!
                      </Badge>
                    ) : null}
                  </div>

                  <p className="text-muted-foreground text-sm">
                    {monthNames[parseInt(birthday.month) - 1]} {birthday.day}, {birthday.year}
                  </p>

                  <div className="flex items-center gap-2 text-xs">
                    {isToday ? (
                      <span className="text-accent font-semibold animate-neon-flicker">
                        🎉 Today! (Age: {age})
                      </span>
                    ) : isTomorrow ? (
                      <span className="text-accent font-semibold flex items-center gap-1">
                        ⏰ Tomorrow! 1-Day Before Alert Active (Age: {age + 1})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        In {daysUntil} days (Age: {age + 1})
                      </span>
                    )}
                  </div>

                  {/* Saved Gift Idea / Note display */}
                  {birthday.gift_idea ? (
                    <div className="mt-2 pt-1">
                      <div className="inline-flex items-center gap-1.5 text-xs text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-md">
                        <Gift className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="font-medium text-foreground">Gift note:</span>
                        <span className="text-accent-foreground truncate max-w-xs">{birthday.gift_idea}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Quick actions: Test Push, Gift Note, Delete */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {onTriggerTestNotification && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTriggerTestNotification(birthday)}
                      title={`Send 1-day before push notification: ${birthday.day.padStart(2, '0')}/${birthday.month.padStart(2, '0')} is birthday of ${birthday.name}`}
                      className="border-primary/40 hover:border-accent hover:text-accent text-xs h-9 px-2.5 gap-1.5 font-mono"
                    >
                      <BellRing className="w-3.5 h-3.5 text-accent" />
                      <span className="hidden sm:inline">Test Push</span>
                    </Button>
                  )}

                  {onOpenGiftModal && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenGiftModal(birthday)}
                      title="Open gift reminder prompt"
                      className="bg-primary/10 hover:bg-primary/20 text-primary hover:text-accent text-xs h-9 px-2.5 gap-1.5"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{birthday.gift_idea ? "Edit Gift" : "Gift Note"}</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete birthday for ${birthday.name}`}
                    onClick={() => onDelete(birthday.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors h-9 w-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

