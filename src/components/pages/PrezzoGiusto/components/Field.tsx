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
