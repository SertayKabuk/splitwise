"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Member, Group } from "./types";
import { Avatar } from "./Avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, Copy, Check, Pencil, UserPlus, Trash2, Share2 } from "lucide-react";
import Link from "next/link";

interface Props {
  members: Member[];
  group: Group;
  currentUserId: string;
}

export function MembersTab({ members, group, currentUserId }: Props) {
  const router = useRouter();
  const isCreator = group.created_by === currentUserId;

  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [showAddPlaceholder, setShowAddPlaceholder] = useState(false);
  const [placeholderName, setPlaceholderName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const [removingPlaceholder, setRemovingPlaceholder] = useState<Member | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const handleAddPlaceholder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = placeholderName.trim();
    if (!name) {
      setAddError("Name is required");
      return;
    }
    setAddLoading(true);
    setAddError("");
    try {
      const res = await fetch(`/api/groups/${group.id}/placeholders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to add placeholder");
      }
      setPlaceholderName("");
      setShowAddPlaceholder(false);
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!removingPlaceholder) return;
    setRemoveLoading(true);
    setRemoveError("");
    try {
      const res = await fetch(
        `/api/groups/${group.id}/placeholders/${removingPlaceholder.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to remove placeholder");
      }
      setRemovingPlaceholder(null);
      setViewingMember(null);
      router.refresh();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRemoveLoading(false);
    }
  };

  const claimUrlFor = (code: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/claim/${code}` : `/claim/${code}`;

  const shareMessageFor = (memberName: string | null, url: string) =>
    `Hey${memberName ? ` ${memberName}` : ""}! I'm tracking shared expenses for "${group.name}" on GroupSplit. Tap to claim your spot: ${url}`;

  const handleShare = async (member: Member) => {
    if (!member.claim_code) return;
    const url = claimUrlFor(member.claim_code);
    const text = shareMessageFor(member.name, url);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Join ${group.name} on GroupSplit`,
          text,
          url,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3">
      {isCreator && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setAddError("");
              setShowAddPlaceholder(true);
            }}
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Placeholder
          </Button>
        </div>
      )}

      {members.map((member) => (
        <button
          key={member.id}
          onClick={() => setViewingMember(member)}
          className="w-full bg-card rounded-xl border border-border p-4 flex items-center gap-4 hover:border-primary/30 hover:bg-accent/30 transition-colors text-left"
        >
          <Avatar member={member} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground">
                {member.name ?? (member.is_placeholder ? "Unnamed placeholder" : member.email)}
              </p>
              {member.id === currentUserId && (
                <Badge variant="secondary" className="text-xs">You</Badge>
              )}
              {member.id === group.created_by && (
                <Badge className="text-xs bg-amber-500 hover:bg-amber-600 text-white">Creator</Badge>
              )}
              {member.is_placeholder && (
                <Badge variant="outline" className="text-xs">Placeholder</Badge>
              )}
            </div>
            {member.is_placeholder ? (
              <p className="text-sm text-muted-foreground italic">Not yet claimed</p>
            ) : (
              <p className="text-sm text-muted-foreground">{member.email}</p>
            )}
            {!member.is_placeholder && (
              member.iban ? (
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{member.iban}</p>
              ) : (
                <p className="text-xs text-muted-foreground/50 mt-0.5">No IBAN set</p>
              )
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
        </button>
      ))}

      {/* Add Placeholder Modal */}
      <Dialog open={showAddPlaceholder} onOpenChange={setShowAddPlaceholder}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Placeholder Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPlaceholder} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={placeholderName}
                onChange={(e) => setPlaceholderName(e.target.value)}
                placeholder="e.g., Alex"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                A placeholder lets you split expenses with someone before they join. You can share a
                claim link later so they can take over the account.
              </p>
            </div>
            {addError && (
              <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">{addError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddPlaceholder(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={addLoading} className="flex-1">
                {addLoading ? "Adding..." : "Add Placeholder"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Member Profile Modal */}
      <Dialog open={!!viewingMember} onOpenChange={(open) => !open && setViewingMember(null)}>
        <DialogContent className="max-w-sm">
          {viewingMember && (
            <>
              <div className="flex flex-col items-center text-center mb-4">
                <Avatar member={viewingMember} size="lg" />
                <div className="mt-3">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-foreground">
                      {viewingMember.name ?? (viewingMember.is_placeholder ? "Unnamed placeholder" : viewingMember.email)}
                    </h2>
                    {viewingMember.id === currentUserId && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                    {viewingMember.id === group.created_by && (
                      <Badge className="text-xs bg-amber-500 hover:bg-amber-600 text-white">Creator</Badge>
                    )}
                    {viewingMember.is_placeholder && (
                      <Badge variant="outline" className="text-xs">Placeholder</Badge>
                    )}
                  </div>
                  {!viewingMember.is_placeholder && (
                    <p className="text-sm text-muted-foreground mt-0.5">{viewingMember.email}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {viewingMember.is_placeholder ? "Added" : "Joined"}{" "}
                    {new Date(viewingMember.joined_at * 1000).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {viewingMember.is_placeholder && viewingMember.claim_code && isCreator && (
                  <div className="bg-muted rounded-xl p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      Claim link
                    </p>
                    <p className="font-mono text-xs text-foreground break-all">
                      {claimUrlFor(viewingMember.claim_code)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Share this with {viewingMember.name ?? "the person"} so they can sign in and
                      take over the placeholder.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(claimUrlFor(viewingMember.claim_code!));
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="h-7 text-xs text-primary hover:text-primary gap-1.5 px-0"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedLink ? "Copied!" : "Copy link"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShare(viewingMember)}
                        className="h-7 text-xs text-primary hover:text-primary gap-1.5 px-0"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share invite
                      </Button>
                    </div>
                  </div>
                )}
                {!viewingMember.is_placeholder && (
                  viewingMember.iban ? (
                    <div className="bg-muted rounded-xl p-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">IBAN</p>
                      <p className="font-mono text-sm text-foreground break-all">{viewingMember.iban}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(viewingMember.iban!);
                          setCopiedIban(true);
                          setTimeout(() => setCopiedIban(false), 2000);
                        }}
                        className="mt-2 h-7 text-xs text-primary hover:text-primary gap-1.5 px-0"
                      >
                        {copiedIban ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedIban ? "Copied!" : "Copy IBAN"}
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-muted rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground">No IBAN set</p>
                    </div>
                  )
                )}
                {viewingMember.id === currentUserId && (
                  <Button variant="outline" asChild className="w-full gap-2">
                    <Link href="/profile">
                      <Pencil className="w-4 h-4" />
                      Edit Profile
                    </Link>
                  </Button>
                )}
                {viewingMember.is_placeholder && isCreator && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRemoveError("");
                      setRemovingPlaceholder(viewingMember);
                    }}
                    className="w-full gap-2 text-destructive hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Placeholder
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Modal */}
      <Dialog open={!!removingPlaceholder} onOpenChange={(open) => !open && setRemovingPlaceholder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove placeholder?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Remove{" "}
              <span className="font-semibold text-foreground">
                {removingPlaceholder?.name ?? "this placeholder"}
              </span>{" "}
              from the group? This only works if they have no expenses or settlements attached.
            </p>
            {removeError && (
              <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">{removeError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setRemovingPlaceholder(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRemove} disabled={removeLoading} className="flex-1">
                {removeLoading ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
