"use client";

import * as React from "react";

import { Calendar } from "@/components/ui/calendar";

export function SelectCalenderDate({ onChange }) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={() => {
        setDate;
        onChange;
      }}
      className="rounded-md border shadow-sm"
      captionLayout="dropdown"
    />
  );
}
