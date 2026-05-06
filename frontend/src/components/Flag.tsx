import { flagEmoji, countryInitials } from "@/lib/flags";

export function Flag({ country, size = "md" }: { country: string; size?: "sm" | "md" | "lg" }) {
  const emoji = flagEmoji(country);
  const sizeCls = size === "lg" ? "text-4xl h-12" : size === "sm" ? "text-lg h-6" : "text-2xl h-8";
  if (emoji) {
    return (
      <span className={`${sizeCls} leading-none`} role="img" aria-label={country}>
        {emoji}
      </span>
    );
  }
  // Initials chip fallback
  const initialsCls =
    size === "lg"
      ? "h-12 min-w-12 px-2 text-base"
      : size === "sm"
        ? "h-6 min-w-6 px-1.5 text-[10px]"
        : "h-8 min-w-8 px-1.5 text-xs";
  return (
    <span
      aria-label={country}
      title={country}
      className={`inline-flex items-center justify-center rounded-md bg-secondary font-display font-bold text-secondary-foreground ring-1 ring-border ${initialsCls}`}
    >
      {countryInitials(country)}
    </span>
  );
}
