"use client";

import * as React from "react"
import { format, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  value?: string | Date;
  onChange?: (dateStr: string) => void;
  className?: string;
  placeholder?: string;
  disabledDates?: any;
}

export function DatePicker({ value, onChange, className, placeholder = "Pick a date", disabledDates }: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (value) {
      return typeof value === 'string' ? parseISO(value) : value;
    }
    return undefined;
  });

  // Sync internal state if value prop changes
  React.useEffect(() => {
    if (value) {
      setDate(typeof value === 'string' ? parseISO(value) : value);
    } else {
      setDate(undefined);
    }
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (onChange) {
      // Format as YYYY-MM-DD
      onChange(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"secondary"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={disabledDates}
        />
      </PopoverContent>
    </Popover>
  )
}
