import type { Tone } from "@/components/ui";
import type { Enums } from "@/lib/database.types";

export const BOOKING_STATUS: Record<Enums<"booking_status">, { label: string; tone: Tone }> = {
  requested: { label: "Awaiting owner", tone: "warn" },
  in_draw: { label: "In Fair Draw", tone: "saffron" },
  waitlisted: { label: "Waitlisted", tone: "info" },
  approved: { label: "Approved", tone: "ok" },
  rejected: { label: "Declined", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  checked_in: { label: "In use", tone: "accent" },
  overdue: { label: "Overdue", tone: "danger" },
  returned: { label: "Returned · owner verifying", tone: "info" },
  closed: { label: "Closed", tone: "neutral" },
};

export const ACTION_LABEL: Record<string, string> = {
  "booking.requested": "Request submitted",
  "booking.in_draw": "Entered Fair Draw",
  "booking.waitlisted": "Waitlisted",
  "booking.approved": "Approved",
  "booking.rejected": "Declined",
  "booking.cancelled": "Cancelled",
  "booking.checked_in": "Checked in",
  "booking.overdue": "Marked overdue",
  "booking.returned": "Returned",
  "booking.closed": "Closed after verification",
  "handover.check_in": "Check-in condition recorded",
  "handover.return": "Return condition recorded",
  "handover.attendant_confirmed": "Attendant confirmed handover",
  "incident.reported": "Incident reported",
  "incident.decided": "Incident decided",
};
