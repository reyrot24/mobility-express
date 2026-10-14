import { cn } from "@/lib/utils";

type Props = React.HTMLAttributes<HTMLDivElement>;

export const Eyebrow = ({ className, ...props }: Props) => (
  <div
    className={cn(
      "mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] before:size-[7px] before:rounded-full before:border-[1.5px] before:border-current before:content-['']",
      className
    )}
    {...props}
  />
);

export const Panel = ({ className, ...props }: Props) => (
  <div
    className={cn(
      "rounded-xl border border-[#e0e2ed] bg-background1 p-6 dark:border-white/10",
      className
    )}
    {...props}
  />
);

export const DarkCard = ({ className, ...props }: Props) => (
  <div
    className={cn(
      "rounded-xl bg-blueText p-8 text-white dark:bg-blueBgLight [&_p]:text-[#d8dcf5]",
      className
    )}
    {...props}
  />
);

export const Notice = ({ className, ...props }: Props) => (
  <div
    className={cn(
      "rounded-xl border border-[#f0d8c3] bg-background2 px-5 py-4 text-xs dark:border-white/10 [&_strong]:block",
      className
    )}
    {...props}
  />
);

export const Badge = ({
  outline = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { outline?: boolean }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
      outline
        ? "border border-[#d5d8e6] dark:border-white/20"
        : "bg-[#fff0e3] text-[#913900] dark:bg-orange dark:text-white",
      className
    )}
    {...props}
  />
);

export const TextButton = ({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className={cn(
      "text-xs underline underline-offset-4 hover:text-orangeHover",
      className
    )}
    {...props}
  />
);

export const DetailLine = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex justify-between gap-6 border-b border-[#e0e2ed] py-3 text-xs dark:border-white/10">
    <span className="opacity-70">{label}</span>
    <strong className="min-w-0 break-words text-right">{children}</strong>
  </div>
);

export const EmptyState = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-dashed border-[#ced1e2] px-6 py-14 text-center dark:border-white/20">
    <h3 className="mb-2 text-lg font-bold">{title}</h3>
    <div className="mx-auto max-w-md text-xs opacity-80">{children}</div>
  </div>
);
