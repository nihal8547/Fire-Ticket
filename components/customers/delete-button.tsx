"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/customers");
    } else {
      alert("Failed to delete customer.");
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDelete}
      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
    >
      <Trash2 className="h-4 w-4" /> Delete
    </Button>
  );
}
