import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helpText?: string;
}

export function FormField({ label, error, helpText, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const helpId = helpText && inputId ? `${inputId}-help` : undefined;

  return (
    <div className="form-field">
      <label className="form-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        className={`form-input${props.className ? ` ${props.className}` : ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={[helpId, errorId].filter(Boolean).join(" ") || undefined}
      />
      {helpText ? (
        <span className="form-help" id={helpId}>
          {helpText}
        </span>
      ) : null}
      {error ? (
        <span className="form-help" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function FormLabel({ children }: { children: ReactNode }) {
  return <span className="form-label">{children}</span>;
}
