import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// Stessa resa di components/ui/input, per i select nativi letti da FormData
export const selectClassName =
  "flex h-10 w-full rounded-md border border-blueText bg-white px-2 py-2 text-sm text-blueText focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orangeHover";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  labelClassName?: string;
  children?: React.ReactNode;
};

export const Field = ({
  label,
  hint,
  labelClassName,
  className,
  children,
  ...props
}: FieldProps) => (
  <label className={cn("mb-4 block", className)}>
    <span className={cn("mb-1.5 block text-xs font-semibold", labelClassName)}>
      {label}
    </span>
    {children ?? <Input {...props} />}
    {hint && <span className="mt-1 block text-[11px] opacity-70">{hint}</span>}
  </label>
);

export const FormError = ({ message }: { message: string }) =>
  message ? (
    <p
      className="mb-4 rounded-md bg-[#fff1ec] p-3 text-xs text-[#a72e28]"
      role="alert"
    >
      {message}
    </p>
  ) : null;

const PHONE_PREFIX = "+39";

// Solo le cifre del numero, senza prefisso: anche se si incolla "+39 333 123 4567"
const phoneDigits = (value: string) =>
  value
    .replace(/^\s*(?:\+|00)\s*39/, "")
    .replace(/\D/g, "")
    .slice(0, 10);

/**
 * Cellulare italiano: prefisso +39 fisso e solo cifre (9 o 10). Nel form arriva come
 * "<name>" = "+39<cifre>".
 * onValueChange: chiamata dopo ogni modifica, quando il campo mostra già il valore filtrato.
 */
export const PhoneField = ({
  label = "Cellulare",
  name,
  defaultValue = "",
  onValueChange,
}: {
  label?: string;
  name: string;
  defaultValue?: string;
  onValueChange?: () => void;
}) => {
  const [digits, setDigits] = useState(() => phoneDigits(defaultValue));

  useEffect(() => {
    onValueChange?.();
  }, [digits, onValueChange]);

  return (
    <Field label={label}>
      <div className="relative">
        <b
          className="absolute inset-y-px left-px grid w-12 place-items-center rounded-l-md bg-background2 text-sm "
          aria-hidden="true"
        >
          {PHONE_PREFIX}
        </b>
        <input
          type="tel"
          inputMode="numeric"
          aria-label={`${label}, prefisso ${PHONE_PREFIX}`}
          value={digits}
          onChange={(event) => setDigits(phoneDigits(event.target.value))}
          placeholder="3331234567"
          pattern="\d{9,10}"
          required
          autoComplete="tel-national"
          className="flex h-10 w-full rounded-md border border-blueText bg-white py-2 pl-14 pr-3 text-sm text-blueText placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orangeHover"
        />
        <input
          type="hidden"
          name={name}
          value={digits ? `${PHONE_PREFIX}${digits}` : ""}
        />
      </div>
    </Field>
  );
};
