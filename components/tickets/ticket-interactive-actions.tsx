"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TICKET_STATUS } from "@/lib/utils";
import { Send, Trash2 } from "lucide-react";

const statusFlow = ["NEW", "ASSIGNED", "IN_PROGRESS", "PENDING_PARTS", "RESOLVED", "CLOSED"];

export function TicketStatusButtons({ ticketId, currentStatus }: { ticketId: string; currentStatus: string }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "RESOLVED" ? { resolvedDate: new Date().toISOString() } : {}),
        }),
      });
      router.refresh();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {statusFlow
        .filter((s) => s !== currentStatus)
        .map((s) => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            disabled={updating}
            onClick={() => updateStatus(s)}
          >
            Move to {TICKET_STATUS[s as keyof typeof TICKET_STATUS]?.label || s}
          </Button>
        ))}
    </div>
  );
}

export function TicketCommentBox({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      setComment("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex gap-2 pt-2 border-t border-gray-100">
      <Textarea
        placeholder="Add a comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="flex-1 resize-none"
      />
      <Button
        onClick={addComment}
        disabled={!comment.trim() || submitting}
        size="icon"
        className="self-end h-10 w-10"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TicketTechnicianAssigner({
  ticketId,
  currentTechnicianId,
  currentStatus,
  technicians,
}: {
  ticketId: string;
  currentTechnicianId?: string | null;
  currentStatus: string;
  technicians: { id: string; name: string; email?: string | null; role?: string }[];
}) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);

  const assignTechnician = async (technicianId: string) => {
    setAssigning(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId,
          status: currentStatus === "NEW" ? "ASSIGNED" : currentStatus,
        }),
      });
      router.refresh();
    } finally {
      setAssigning(false);
    }
  };

  return (
    <SearchableSelect
      options={technicians.map((t) => ({
        value: t.id,
        label: t.name,
        description: t.email || undefined,
        badge: t.role || undefined,
      }))}
      value={currentTechnicianId || ""}
      onValueChange={assignTechnician}
      disabled={assigning}
      placeholder="Unassigned (search tech...)"
      searchPlaceholder="Search technician..."
      allowClear
    />
  );
}

export function TicketDeleteButton({
  ticketId,
  ticketNumber,
}: {
  ticketId: string;
  ticketNumber: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ticket ${ticketNumber}?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/tickets");
      } else {
        alert("Failed to delete ticket.");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={deleting}
      onClick={handleDelete}
      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
    >
      <Trash2 className="h-4 w-4" /> Delete Ticket
    </Button>
  );
}
