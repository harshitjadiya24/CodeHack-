"use client";

// Watermelon UI tabs-1: segmented tabs where the active tab lifts onto a white pill.
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui-kit/tabs";

export function BookingTabs({ active, history, counts }: { active: ReactNode; history: ReactNode; counts: [number, number] }) {
  return (
    <Tabs defaultValue="active" className="gap-5">
      <TabsList className="h-auto rounded-[22px] bg-muted px-1 py-1.5">
        <TabsTrigger value="active" className="rounded-xl px-5 py-2.5 text-[15px] font-semibold data-[state=active]:bg-accent data-[state=active]:text-accent-ink">
          Active and upcoming <span className="ml-1.5 text-subtle">{counts[0]}</span>
        </TabsTrigger>
        <TabsTrigger value="history" className="rounded-xl px-5 py-2.5 text-[15px] font-semibold data-[state=active]:bg-accent data-[state=active]:text-accent-ink">
          History <span className="ml-1.5 text-subtle">{counts[1]}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active">{active}</TabsContent>
      <TabsContent value="history">{history}</TabsContent>
    </Tabs>
  );
}
