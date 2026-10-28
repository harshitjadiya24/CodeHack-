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

export function ResourceIcon({ category, className }: { category: string; className?: string }) {
  const Icon = ICONS[category] ?? Box;
  return (
    <span className={cn("grid size-12 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent", className)}>
      <Icon className="size-6" aria-hidden />
    </span>
  );
}
