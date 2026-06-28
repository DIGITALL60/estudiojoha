import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CustomCalendarProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  allowedDaysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
}

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAYS_SHORT = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

export default function CustomCalendar({ selectedDate, onSelect, allowedDaysOfWeek }: CustomCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const initialDate = selectedDate ? new Date(selectedDate + "T00:00:00") : today;
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const generateDays = () => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const days = [];
    const firstDay = start.getDay();
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= end.getDate(); i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }
    
    return days;
  };

  const formatISO = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const days = generateDays();

  return (
    <div className="bg-background border border-border/50 rounded-sm p-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-1 hover:bg-accent/10 rounded-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button onClick={handleNextMonth} className="p-1 hover:bg-accent/10 rounded-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-[10px] font-bold text-muted-foreground">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="h-8" />;
          
          const dateISO = formatISO(date);
          const isSelected = selectedDate === dateISO;
          const isPast = date < today;
          
          // If allowedDaysOfWeek is empty, we assume they didn't configure schedules yet, so we disable everything just in case,
          // OR we can leave it open. But the requirement is "only show the days that can be booked".
          // If they have no schedules, they can't be booked.
          const isAllowedDay = allowedDaysOfWeek.includes(date.getDay());
          
          const disabled = isPast || !isAllowedDay;

          return (
            <button
              key={dateISO}
              disabled={disabled}
              onClick={() => onSelect(dateISO)}
              className={`h-8 w-full rounded-sm text-xs flex items-center justify-center transition-colors
                ${isSelected ? 'bg-primary text-primary-foreground font-bold' : ''}
                ${!isSelected && !disabled ? 'text-white bg-accent/20 hover:bg-primary/40 font-medium border border-border/50' : ''}
                ${disabled ? 'text-muted-foreground/30 cursor-not-allowed opacity-50' : ''}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
