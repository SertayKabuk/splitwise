"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function DeleteGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to delete group");
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to delete group");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
        <span className="text-xs text-muted-foreground">Delete group?</span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={loading}
          className="h-6 text-xs px-2"
        >
          {loading ? "..." : "Yes"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirming(false)}
          className="h-6 text-xs px-2"
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => { e.preventDefault(); setConfirming(true); }}
      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      title="Delete group"
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
