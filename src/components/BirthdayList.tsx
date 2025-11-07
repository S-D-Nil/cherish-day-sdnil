import { Trash2, Calendar, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Birthday {
  id: string;
  name: string;
  day: string;
  month: string;
  year: string;
}

interface BirthdayListProps {
  birthdays: Birthday[];
  onDelete: (id: string) => void;
}

export const BirthdayList = ({ birthdays, onDelete }: BirthdayListProps) => {
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
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Cake className="w-7 h-7 text-accent" />
        Upcoming Birthdays
      </h2>
      <div className="space-y-3">
        {sortedBirthdays.map((birthday, index) => {
          const nextBirthday = getNextBirthday(birthday);
          const daysUntil = getDaysUntil(nextBirthday);
          const age = getAge(birthday);
          const isToday = daysUntil === 0;
          const isTomorrow = daysUntil === 1;

          return (
            <Card 
              key={birthday.id}
              className={`bg-card border-2 ${isToday ? 'border-accent animate-glow-pulse shadow-neon-cyan' : 'border-primary/50 hover:border-primary'} p-4 transition-all duration-300 hover:shadow-neon-blue group animate-slide-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                    {birthday.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {monthNames[parseInt(birthday.month) - 1]} {birthday.day}, {birthday.year}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {isToday ? (
                      <span className="text-accent font-semibold animate-neon-flicker">
                        🎉 Today! (Age: {age})
                      </span>
                    ) : isTomorrow ? (
                      <span className="text-accent font-semibold">
                        ⏰ Tomorrow (Age: {age + 1})
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        In {daysUntil} days (Age: {age + 1})
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(birthday.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
