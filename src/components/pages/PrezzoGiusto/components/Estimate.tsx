import { cn } from "@/lib/utils";
import {
  ESTIMATE_DISCLAIMER,
  ESTIMATE_METHOD,
  estimateLabel,
  type Estimate,
} from "../utils/estimate";

export const EstimatePrice = ({
  estimate,
  pending = false,
  className,
}: {
  estimate: Estimate | null;
  pending?: boolean;
  className?: string;
}) =>
  estimate === null ? (
    <div className={cn("text-xl font-semibold", className)}>
      {pending ? "In elaborazione" : "Stima non disponibile"}
    </div>
  ) : (
    <div
      className={cn(
        "text-3xl font-semibold leading-tight tracking-tighter md:text-4xl",
        className
      )}
    >
      {estimateLabel(estimate)}
      <small className="ml-2 text-sm font-normal tracking-normal opacity-80">
        / anno · indicativo
      </small>
    </div>
  );

export const EstimateNotice = ({
  showMethod = true,
  className,
}: {
  showMethod?: boolean;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-lg border-l-4 border-orange bg-background2 px-4 py-3 text-[11px] leading-relaxed text-text",
      className
    )}
  >
    <p className="!opacity-100">{ESTIMATE_DISCLAIMER}</p>
    {showMethod && <p className="mt-1.5 opacity-80">{ESTIMATE_METHOD}</p>}
  </div>
);
