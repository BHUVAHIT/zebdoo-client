import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export const PageHeader = ({
  title,
  subtitle,
  eyebrow = "Super Admin",
  backTo,
  backLabel = "Back",
  action,
}) => (
  <header className="tp-admin-theme relative overflow-hidden rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-[0_24px_42px_-34px_rgba(15,23,42,0.55)] sm:p-8">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-[#eef2ff] via-[#f8fafc] to-[#e0e7ff]"
    />

    <div className="relative flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4f46e5]">{eyebrow}</p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#111827] sm:text-4xl">
          {title}
        </h1>
        <p className="text-sm text-[#6b7280] sm:text-base">{subtitle}</p>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}

      {backTo ? (
        <Link
          to={backTo}
          className="group inline-flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#1f2937] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c7d2fe] hover:text-[#3730a3]"
        >
          <ChevronLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>{backLabel}</span>
        </Link>
      ) : null}
    </div>
  </header>
);

export const FormSection = ({ title, description, children }) => (
  <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.55)] sm:p-6">
    <div className="space-y-1">
      <h2 className="text-lg font-bold text-[#111827]">{title}</h2>
      {description ? <p className="text-sm text-[#6b7280]">{description}</p> : null}
    </div>
    <div className="my-4 h-px w-full bg-gradient-to-r from-[#e5e7eb] via-[#eef2ff] to-[#e5e7eb]" />
    {children}
  </section>
);

const Label = ({ htmlFor, text, required = false }) => (
  <label
    htmlFor={htmlFor}
    className="mb-2 inline-flex text-sm font-semibold tracking-[-0.01em] text-[#111827]"
  >
    {text}
    {required ? <span className="ml-1 text-[#dc2626]">*</span> : null}
  </label>
);

const ErrorText = ({ id, error }) =>
  error ? (
    <p id={id} className="mt-2 text-xs font-semibold text-[#dc2626]" role="alert">
      {error}
    </p>
  ) : null;

export const InputField = ({
  id,
  label,
  error,
  required = false,
  className,
  inputClassName,
  ...inputProps
}) => {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className={cn("w-full", className)}>
      <Label htmlFor={id} text={label} required={required} />
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          "w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2.5 text-sm text-[#111827] shadow-sm outline-none transition-all duration-200 placeholder:text-[#9ca3af] focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e533] disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#94a3b8]",
          inputClassName
        )}
        {...inputProps}
      />
      <ErrorText id={errorId} error={error} />
    </div>
  );
};

export const SelectField = ({
  id,
  label,
  error,
  required = false,
  className,
  children,
  ...selectProps
}) => {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className={cn("w-full", className)}>
      <Label htmlFor={id} text={label} required={required} />
      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className="w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2.5 text-sm text-[#111827] shadow-sm outline-none transition-all duration-200 focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e533] disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#94a3b8]"
        {...selectProps}
      >
        {children}
      </select>
      <ErrorText id={errorId} error={error} />
    </div>
  );
};

export const ToggleTabs = ({ legend, name, value, options, onChange, segmented = false }) => (
  <fieldset className="space-y-2" aria-label={legend}>
    <legend className="mb-2 text-sm font-semibold text-[#111827]">{legend}</legend>
    <div
      className={cn(
        "grid gap-2",
        segmented
          ? "rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-1 sm:grid-cols-2"
          : "grid-cols-2 sm:grid-cols-4"
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;

        if (segmented) {
          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                selected
                  ? "bg-white text-[#3730a3] shadow-[0_8px_20px_-16px_rgba(79,70,229,0.75)]"
                  : "text-[#64748b] hover:text-[#1f2937]"
              )}
              onClick={() => onChange?.(option.value)}
            >
              {option.label}
            </button>
          );
        }

        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-bold tracking-wide transition-all duration-200",
              selected
                ? "border-[#4f46e5] bg-[#eef2ff] text-[#3730a3]"
                : "border-[#d1d5db] bg-white text-[#475569] hover:-translate-y-0.5 hover:border-[#a5b4fc]"
            )}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
    <input type="hidden" name={name} value={value || ""} readOnly />
  </fieldset>
);

export const ActionBar = ({
  busy,
  saveLabel,
  onCancel,
  cancelLabel = "Cancel",
  disabled,
}) => (
  <div className="sticky bottom-2 z-20 mt-2 rounded-2xl border border-[#e5e7eb] bg-white/95 p-3 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.55)] backdrop-blur sm:bottom-4 sm:p-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={disabled || busy}
        className="w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-sm font-semibold text-[#334155] transition-colors duration-200 hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={disabled || busy}
        className="w-full rounded-xl bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_22px_-18px_rgba(79,70,229,0.95)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Saving..." : saveLabel}
      </button>
    </div>
  </div>
);
