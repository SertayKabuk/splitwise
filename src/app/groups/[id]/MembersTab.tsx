"use client";

import { useState } from "react";
import type { Member, Group } from "./types";
import { Avatar } from "./Avatar";

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
          className="w-full bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors text-left"
        >
          <Avatar member={member} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-900">{member.name ?? member.email}</p>
              {member.id === currentUserId && (
                <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">You</span>
              )}
              {member.id === group.created_by && (
                <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">Creator</span>
              )}
            </div>
            <p className="text-sm text-slate-500">{member.email}</p>
            {member.iban ? (
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{member.iban}</p>
            ) : (
              <p className="text-xs text-slate-300 mt-0.5">No IBAN set</p>
            )}
          </div>
          <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ))}

      {/* Member Profile Modal */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingMember(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <button
              onClick={() => setViewingMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar member={viewingMember} size="lg" />
              <div className="mt-3">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-slate-900">{viewingMember.name ?? viewingMember.email}</h2>
                  {viewingMember.id === currentUserId && (
                    <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">You</span>
                  )}
                  {viewingMember.id === group.created_by && (
                    <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">Creator</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{viewingMember.email}</p>
                <p className="text-xs text-slate-400 mt-0.5">
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
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">IBAN</p>
                  <p className="font-mono text-sm text-slate-800 break-all">{viewingMember.iban}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(viewingMember.iban!);
                      setCopiedIban(true);
                      setTimeout(() => setCopiedIban(false), 2000);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copiedIban ? "Copied!" : "Copy IBAN"}
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-slate-400">No IBAN set</p>
                </div>
              )}
              {viewingMember.id === currentUserId && (
                <a
                  href="/profile"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-slate-200 text-slate-600 font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
