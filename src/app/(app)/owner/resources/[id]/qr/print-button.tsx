"use client";

import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="w-full">
      Print tag
    </Button>
  );
}
