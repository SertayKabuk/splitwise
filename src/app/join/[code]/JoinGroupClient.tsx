"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { getInitials } from "@/lib/initials";

interface Member {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  member_count: number;
}

interface Props {
  group: Group;
  members: Member[];
  inviteCode: string;
  isAuthenticated: boolean;
}

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

export default function JoinGroupClient({
  group,
  members,
  inviteCode,
  isAuthenticated,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/join/${inviteCode}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to join group");
      }

      const data = await res.json();
      router.push(`/groups/${data.groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">{group.name}</h1>
            {group.description && (
              <p className="text-indigo-200 mt-2 text-sm">{group.description}</p>
            )}
            <p className="text-indigo-300 text-sm mt-2">
              {group.member_count} member{group.member_count !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="p-6">
            {/* Members list */}
            {members.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Current members</h3>
                <div className="space-y-2">
                  {members.map((member) => {
                    const colorIndex = member.id.charCodeAt(0) % AVATAR_COLORS.length;
                    const color = AVATAR_COLORS[colorIndex];
                    return (
                      <div key={member.id} className="flex items-center gap-3">
                        {member.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.image}
                            alt={member.name ?? member.email}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white text-xs font-semibold`}
                          >
                            {getInitials(member.name, member.email)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {member.name ?? member.email}
                          </p>
                          {member.name && (
                            <p className="text-xs text-slate-400">{member.email}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
            )}

            {isAuthenticated ? (
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-xl transition-colors"
              >
                {loading ? "Joining..." : "Join Group"}
              </button>
            ) : (
              <div className="text-center">
                <p className="text-slate-600 text-sm mb-4">
                  Sign in to join this group
                </p>
                <button
                  onClick={() => signIn("google")}
                  className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-6 py-3 rounded-xl shadow-sm transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
