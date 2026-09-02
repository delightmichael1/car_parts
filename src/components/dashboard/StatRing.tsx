"use client";

import { ProgressCircle } from "@heroui/react";

interface StatRingProps {
  label: string;
  value: number; // 0-100
  amount: string;
  color?: "accent" | "success" | "warning" | "danger";
}

export function StatRing({
  label,
  value,
  amount,
  color = "accent",
}: StatRingProps) {
  return (
    <div className="flex items-center gap-3">
      <ProgressCircle aria-label={label} value={value} color={color}>
        <ProgressCircle.Track>
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
      <div>
        <p className="text-sm font-semibold">{Math.round(value)}%</p>
        <p className="text-xs text-foreground/60">{label}</p>
        <p className="text-xs text-foreground/40">{amount}</p>
      </div>
    </div>
  );
}
