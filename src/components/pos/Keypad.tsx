"use client";

import { PointerEvent } from "react";
import { MdBackspace } from "react-icons/md";

export function Keypad({
  onDigit,
  onDecimal,
  onBackspace,
  onClear,
  onSubmit,
  submitLabel = "Enter",
  allowDecimal = false,
}: {
  onDigit: (digit: string) => void;
  onDecimal?: () => void;
  onBackspace: () => void;
  onClear?: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  allowDecimal?: boolean;
}) {
  const press = (fn: () => void) => (event: PointerEvent) => {
    event.preventDefault();
    fn();
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="flex select-none flex-col gap-2 touch-manipulation">
      <div className="grid grid-cols-3 gap-2">
        {digits.map((digit) => (
          <button
            key={digit}
            type="button"
            onPointerDown={press(() => onDigit(digit))}
            className="flex min-h-16 items-center justify-center rounded-2xl bg-black/5 text-2xl font-semibold text-secondary transition active:scale-95 active:bg-black/10"
          >
            {digit}
          </button>
        ))}

        {allowDecimal && onDecimal ? (
          <button
            type="button"
            onPointerDown={press(onDecimal)}
            className="flex min-h-16 items-center justify-center rounded-2xl bg-black/5 text-2xl font-semibold text-secondary transition active:scale-95 active:bg-black/10"
          >
            .
          </button>
        ) : (
          <span className="min-h-16" />
        )}

        <button
          type="button"
          onPointerDown={press(() => onDigit("0"))}
          className="flex min-h-16 items-center justify-center rounded-2xl bg-black/5 text-2xl font-semibold text-secondary transition active:scale-95 active:bg-black/10"
        >
          0
        </button>

        <button
          type="button"
          aria-label="Backspace"
          onPointerDown={press(onBackspace)}
          className="flex min-h-16 items-center justify-center rounded-2xl bg-black/5 text-2xl text-secondary transition active:scale-95 active:bg-black/10"
        >
          <MdBackspace className="h-6 w-6" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {onClear ? (
          <button
            type="button"
            onPointerDown={press(onClear)}
            className="flex min-h-14 items-center justify-center rounded-2xl bg-black/5 text-sm font-semibold text-secondary/60 transition active:scale-95 active:bg-black/10"
          >
            Clear
          </button>
        ) : null}
        <button
          type="button"
          onPointerDown={press(onSubmit)}
          className={`flex min-h-14 items-center justify-center rounded-2xl bg-primary text-base font-bold text-secondary shadow-sm transition active:scale-95 ${onClear ? "" : "col-span-2"}`}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}