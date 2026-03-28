"use client";

import { useState } from "react";
import type { Member, Group } from "./types";
import { Avatar } from "./Avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ChevronRight, Copy, Check, Pencil } from "lucide-react";
import Link from "next/link";

interface Props {
  members: Member[];
  group: Group;
  currentUserId: string;
}

export function MembersTab({ members, group, currentUserId }: Props) {
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [copiedIban, setCopiedIban] = useState(false);

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <button
          key={member.id}
          onClick={() => setViewingMember(member)}
          className="w-full bg-card rounded-xl border border-border p-4 flex items-center gap-4 hover:border-primary/30 hover:bg-accent/30 transition-colors text-left"
        >
          <Avatar member={member} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground">{member.name ?? member.email}</p>
              {member.id === currentUserId && (
                <Badge variant="secondary" className="text-xs">You</Badge>
              )}
              {member.id === group.created_by && (
                <Badge className="text-xs bg-amber-500 hover:bg-amber-600 text-white">Creator</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{member.email}</p>
            {member.iban ? (
              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{member.iban}</p>
            ) : (
              <p className="text-xs text-muted-foreground/50 mt-0.5">No IBAN set</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
        </button>
      ))}

      {/* Member Profile Modal */}
      <Dialog open={!!viewingMember} onOpenChange={(open) => !open && setViewingMember(null)}>
        <DialogContent className="max-w-sm">
          {viewingMember && (
            <>
              <div className="flex flex-col items-center text-center mb-4">
                <Avatar member={viewingMember} size="lg" />
                <div className="mt-3">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-foreground">{viewingMember.name ?? viewingMember.email}</h2>
                    {viewingMember.id === currentUserId && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                    {viewingMember.id === group.created_by && (
                      <Badge className="text-xs bg-amber-500 hover:bg-amber-600 text-white">Creator</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{viewingMember.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Joined{" "}
                    {new Date(viewingMember.joined_at * 1000).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {viewingMember.iban ? (
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
                )}
                {viewingMember.id === currentUserId && (
                  <Button variant="outline" asChild className="w-full gap-2">
                    <Link href="/profile">
                      <Pencil className="w-4 h-4" />
                      Edit Profile
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
