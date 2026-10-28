import { Box, Camera, Cpu, DoorOpen, Flame, Glasses, Mic, Printer, Activity, Wrench, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "3D Printing": Printer,
  "Laser Cutting": Flame,
  Workspace: Wrench,
  "Test & Measurement": Activity,
  Fabrication: Zap,
  Electronics: Cpu,
  Media: Camera,
  XR: Glasses,
  Compute: Cpu,
  Rooms: DoorOpen,
  Audio: Mic,
};

// Each kind of thing keeps one pastel everywhere, so a camera always looks like a camera's tag.
const TONES = ["tone-sky", "tone-sage", "tone-butter", "tone-rose"] as const;
const FIXED: Record<string, (typeof TONES)[number]> = {
  "3D Printing": "tone-sky",
  "Laser Cutting": "tone-rose",
  Workspace: "tone-sage",
  "Test & Measurement": "tone-sage",
  Fabrication: "tone-rose",
  Electronics: "tone-sky",
  Media: "tone-butter",
  XR: "tone-sky",
  Compute: "tone-sage",
  Rooms: "tone-rose",
  Audio: "tone-butter",
};

export function categoryTone(category: string) {
  return FIXED[category] ?? TONES[[...category].reduce((h, c) => h + c.charCodeAt(0), 0) % TONES.length];
}

export function ResourceIcon({ category, className }: { category: string; className?: string }) {
  const Icon = ICONS[category] ?? Box;
  return (
    <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", categoryTone(category), className)}>
      <Icon className="size-6" aria-hidden />
    </span>
  );
}

export function categoryIcon(category: string) {
  return ICONS[category] ?? Box;
}
