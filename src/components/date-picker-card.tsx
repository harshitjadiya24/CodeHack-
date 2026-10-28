"use client";

// Watermelon UI calendar-18 ("booking card calendar with a Today button"), adapted:
// only days the resource is open can be picked, and the choice posts as a hidden field.
import { useState } from "react";
import { Button } from "@/components/ui-kit/button";
import { Calendar } from "@/components/ui-kit/calendar";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui-kit/card";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function DatePickerCard({ name, minDate, openWeekdays }: { name: string; minDate: string; openWeekdays: number[] }) {
  const [y, m, d] = minDate.split("-").map(Number);
  const first = new Date(y, m - 1, d);
  const isOpen = (day: Date) => openWeekdays.includes(day.getDay()) && day >= first;
  const firstOpen = (() => {
    const day = new Date(first);
    for (let i = 0; i < 14 && !isOpen(day); i++) day.setDate(day.getDate() + 1);
    return day;
  })();
  const [selected, setSelected] = useState<Date | undefined>(firstOpen);
  const [month, setMonth] = useState<Date>(firstOpen);

  return (
    <Card className="gap-3 rounded-lg border-border bg-card py-4 shadow-none">
      <input type="hidden" name={name} value={selected ? iso(selected) : ""} required />
      <CardHeader className="px-4">
        <CardTitle className="text-sm">Pick a day</CardTitle>
        <CardDescription className="text-xs">{selected ? selected.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : "Greyed-out days are closed"}</CardDescription>
        <CardAction>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-md px-3 text-[13px]"
            onClick={() => {
              setMonth(firstOpen);
              setSelected(firstOpen);
            }}
          >
            Earliest
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={setSelected}
          disabled={(day) => !isOpen(day)}
          className="mx-auto bg-transparent p-0 [--cell-size:2.1rem]"
        />
      </CardContent>
    </Card>
  );
}
