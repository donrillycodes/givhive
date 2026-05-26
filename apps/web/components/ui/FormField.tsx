"use client";

import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// FormField — one shared shell for every text/select/textarea/password input
// in the dashboard.
//
// Visual refresh: 44px height, 12px radius, white surface on a warm-border
// outline, soft focus ring matching the brand green.

export const inputClass =
  "w-full px-4 h-12 text-[14px] border-[1.5px] border-[rgba(13,46,28,0.14)] rounded-xl bg-[#fbfaf5] text-ink " +
  "hover:border-[rgba(13,46,28,0.22)] " +
  "focus:outline-none focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-[rgba(45,158,100,0.14)] " +
  "placeholder:text-ink-subtle transition-all duration-150";

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function FieldShell({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold text-ink-soft"
        >
          {label}
          {required && <span className="text-amber-600 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

// ---------- TextField ----------

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      hint,
      error,
      required,
      containerClassName,
      leftIcon,
      rightSlot,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const fieldId = id ?? props.name;
    return (
      <FieldShell
        label={label}
        hint={hint}
        error={error}
        required={required}
        className={containerClassName}
        htmlFor={fieldId}
      >
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={fieldId}
            required={required}
            className={cn(
              inputClass,
              leftIcon && "pl-10",
              rightSlot && "pr-11",
              error &&
                "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100",
              className,
            )}
            {...props}
          />
          {rightSlot && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2">
              {rightSlot}
            </span>
          )}
        </div>
      </FieldShell>
    );
  },
);
TextField.displayName = "TextField";

// ---------- PasswordField ----------

type PasswordFieldProps = Omit<TextFieldProps, "type">;

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <TextField
        ref={ref}
        type={visible ? "text" : "password"}
        rightSlot={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="p-1.5 rounded-lg text-ink-subtle hover:text-ink-soft hover:bg-[rgba(13,46,28,0.05)] transition-colors"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        }
        {...props}
      />
    );
  },
);
PasswordField.displayName = "PasswordField";

// ---------- TextareaField ----------

interface TextareaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export const TextareaField = forwardRef<
  HTMLTextAreaElement,
  TextareaFieldProps
>(
  (
    {
      label,
      hint,
      error,
      required,
      containerClassName,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const fieldId = id ?? props.name;
    return (
      <FieldShell
        label={label}
        hint={hint}
        error={error}
        required={required}
        className={containerClassName}
        htmlFor={fieldId}
      >
        <textarea
          ref={ref}
          id={fieldId}
          required={required}
          className={cn(
            inputClass,
            "h-auto py-3 leading-relaxed resize-y min-h-[110px]",
            error &&
              "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100",
            className,
          )}
          rows={props.rows ?? 4}
          {...props}
        />
      </FieldShell>
    );
  },
);
TextareaField.displayName = "TextareaField";

// ---------- SelectField ----------

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  options: SelectOption[];
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    {
      label,
      hint,
      error,
      required,
      containerClassName,
      options,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const fieldId = id ?? props.name;
    return (
      <FieldShell
        label={label}
        hint={hint}
        error={error}
        required={required}
        className={containerClassName}
        htmlFor={fieldId}
      >
        <select
          ref={ref}
          id={fieldId}
          required={required}
          className={cn(
            inputClass,
            "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23687177%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.85rem_center] pr-9",
            error &&
              "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100",
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  },
);
SelectField.displayName = "SelectField";

// ---------- CheckboxField ----------

interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const fieldId = id ?? props.name;
    return (
      <label
        htmlFor={fieldId}
        className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-xl bg-green-50 border border-green-100 hover:border-green-200 transition-colors"
      >
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          className={cn(
            "mt-0.5 w-4 h-4 rounded border border-border-default text-brand-green focus:ring-2 focus:ring-brand-green/30 accent-[#1a7a4a]",
            className,
          )}
          {...props}
        />
        <span className="flex flex-col">
          <span className="text-[13px] font-semibold text-ink">{label}</span>
          {description && (
            <span className="text-xs text-ink-muted mt-0.5">{description}</span>
          )}
        </span>
      </label>
    );
  },
);
CheckboxField.displayName = "CheckboxField";
