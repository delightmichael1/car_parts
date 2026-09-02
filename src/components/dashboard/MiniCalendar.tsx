"use client";

import { Card } from "@heroui/react";

function getMonthMatrix(year: number, month: number) {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(startWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function MiniCalendar() {
  const today = new Date();
  const cells = getMonthMatrix(today.getFullYear(), today.getMonth());
  const monthLabel = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <Card.Header>
        <Card.Title>{monthLabel}</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={`h-${i}`} className="py-1 text-foreground/40">
              {label}
            </span>
          ))}
          {cells.map((day, i) => (
            <span
              key={i}
              className={
                day === today.getDate()
                  ? "rounded-full bg-primary py-1 font-semibold text-secondary"
                  : "py-1 text-foreground/70"
              }
            >
              {day ?? ""}
            </span>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
