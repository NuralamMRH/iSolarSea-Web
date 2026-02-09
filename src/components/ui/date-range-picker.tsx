"use client";

import * as React from "react";

import { Calendar } from "@/components/ui/calendar";

export function CalendarRange({ onChange }) {
  const [range, setRange] = React.useState<{ from?: Date; to?: Date }>({});

  return (
    <Calendar
      mode="range"
      selected={range}
      onSelect={(range) => {
        setRange(range);
        onChange(range);
      }}
      numberOfMonths={2}
      className="rounded-lg border shadow-sm"
    />
  );
}
