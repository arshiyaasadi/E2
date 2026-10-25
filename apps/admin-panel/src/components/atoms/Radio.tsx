/**
 * @level atom
 * @spacing internal: gap-atom-md (fieldset, label), gap-pad-atom-md (options wrapper), mt-pad-atom-xs (radio input), gap-pad-atom-xs (hint text) | external: none
 */
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  layout?: "vertical" | "horizontal";
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  error,
  layout = "vertical",
}: RadioGroupProps) {
  return (
    <fieldset className="flex flex-col gap-atom-md">
      {label && (
        <legend className="text-sm font-medium text-foreground">{label}</legend>
      )}
      <div
        className={cn(
          "flex gap-pad-atom-md",
          layout === "vertical" ? "flex-col" : "flex-row flex-wrap",
        )}
      >
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-start gap-atom-md",
              opt.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={opt.disabled}
              onChange={() => onChange?.(opt.value)}
              className="mt-pad-atom-xs size-4 shrink-0 accent-primary"
            />
            <div className="flex flex-col gap-pad-atom-xs">
              <span className="text-sm text-foreground">{opt.label}</span>
              {opt.hint && <span className="text-xs text-muted">{opt.hint}</span>}
            </div>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </fieldset>
  );
}
