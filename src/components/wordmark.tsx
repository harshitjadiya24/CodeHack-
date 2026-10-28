import { cn } from "@/lib/utils";

/** The name, set wide and heavy in lowercase: the only logo Saajha needs. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("text-[22px] font-[850] leading-none tracking-[-0.03em] [font-stretch:120%]", className)}>saajha</span>;
}
