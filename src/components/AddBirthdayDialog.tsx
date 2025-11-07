import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Birthday {
  id: string;
  name: string;
  day: string;
  month: string;
  year: string;
}

interface AddBirthdayDialogProps {
  onAdd: (birthday: Birthday) => void;
}

export const AddBirthdayDialog = ({ onAdd }: AddBirthdayDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !day || !month || !year) {
      toast.error("Missing Information", {
        description: "Please fill in all fields",
      });
      return;
    }

    const birthday: Birthday = {
      id: Date.now().toString(),
      name: name.trim(),
      day,
      month,
      year,
    };

    onAdd(birthday);
    toast.success("Birthday Added", {
      description: `${name}'s birthday has been saved`,
    });

    // Reset form
    setName("");
    setDay("");
    setMonth("");
    setYear("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon-blue hover:shadow-neon-cyan transition-all duration-300 hover:scale-105 h-14 text-lg font-semibold"
          size="lg"
        >
          <Plus className="mr-2 h-6 w-6" />
          Add Birthday
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-2 border-primary shadow-neon-blue">
        <DialogHeader>
          <DialogTitle className="text-2xl text-foreground">Add New Birthday</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the details of the birthday you want to remember
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter person's name"
              className="bg-input border-2 border-primary/50 focus:border-primary text-foreground h-12"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="day" className="text-foreground">Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="bg-input border-2 border-primary/50 focus:border-primary text-foreground h-12">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent className="bg-card border-2 border-primary">
                  {days.map((d) => (
                    <SelectItem key={d} value={d} className="text-foreground">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month" className="text-foreground">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="bg-input border-2 border-primary/50 focus:border-primary text-foreground h-12">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="bg-card border-2 border-primary">
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-foreground">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year" className="text-foreground">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="bg-input border-2 border-primary/50 focus:border-primary text-foreground h-12">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="bg-card border-2 border-primary max-h-60">
                  {years.map((y) => (
                    <SelectItem key={y} value={y} className="text-foreground">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all duration-300 hover:shadow-neon-blue"
          >
            Save Birthday
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
