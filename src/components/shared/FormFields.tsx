"use client";

import {
  ChangeEvent,
  Children,
  FocusEvent,
  InputHTMLAttributes,
  isValidElement,
  ReactElement,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { Input, ListBox, Select, TextArea } from "@heroui/react";
import { Key } from "react-aria-components";

export function Field({
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-sm font-medium text-secondary">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-rose-600">{error}</span>
      ) : null}
      {!error && hint ? (
        <span className="text-xs text-secondary/45">{hint}</span>
      ) : null}
    </div>
  );
}

export const inputFieldClass =
  "min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm text-secondary outline-none transition placeholder:text-secondary/40 focus:border-primary";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <Input
      {...rest}
      variant="secondary"
      className={`${inputFieldClass} ${className ?? ""}`}
    />
  );
}

export function TextAreaInput(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const { className, ...rest } = props;
  return (
    <TextArea
      {...rest}
      variant="secondary"
      className={`${inputFieldClass} min-h-24 py-3 ${className ?? ""}`}
    />
  );
}

type OptionElement = ReactElement<{
  value?: string | number;
  children?: ReactNode;
}>;

export function SelectInput(props: {
  name?: string;
  value?: string | number | readonly string[];
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (event: FocusEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  children?: ReactNode;
}) {
  const {
    className,
    triggerClassName,
    children,
    value,
    onChange,
    onBlur,
    name,
    disabled,
    placeholder = "Select…",
  } = props;

  const options = Children.toArray(children)
    .filter(
      (child): child is OptionElement =>
        isValidElement(child) && child.type === "option",
    )
    .filter((option) => String(option.props.value ?? "") !== "");

  const selectedKey = value ? String(value) : null;

  const synthesizeChange = (key: Key | null) => {
    const stringValue = key == null ? "" : String(key);
    const event = {
      target: { name, value: stringValue },
    } as unknown as ChangeEvent<HTMLSelectElement>;
    onChange?.(event);
  };

  const synthesizeBlur = () => {
    if (onBlur) {
      const event = {
        target: { name },
      } as unknown as FocusEvent<HTMLSelectElement>;
      onBlur(event);
    }
  };

  return (
    <Select
      name={name}
      isDisabled={disabled}
      selectedKey={selectedKey}
      onSelectionChange={(key) => {
        synthesizeChange(key);
        synthesizeBlur();
      }}
      placeholder={placeholder}
      className={className}
      variant="secondary"
      fullWidth
    >
      <Select.Trigger
        className={`${inputFieldClass} min-h-12 rounded-xl border border-black/10 bg-white px-4 text-black ${triggerClassName ?? ""}`}
      >
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => {
            const optionValue = String(option.props.value ?? "");
            return (
              <ListBox.Item
                key={optionValue}
                id={optionValue}
                textValue={String(option.props.children ?? "")}
                className="text-black"
              >
                {option.props.children}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            );
          })}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
