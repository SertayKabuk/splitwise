"use client";

import { useState } from "react";
import Image from "next/image";
import { getInitials } from "@/lib/initials";

interface Props {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    iban: string | null;
  };
}

export default function ProfileForm({ user }: Props) {
  const [iban, setIban] = useState(user.iban ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iban }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Profile</h1>

      {/* Avatar + identity */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 flex items-center gap-4">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? user.email}
            width={64}
            height={64}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
            {getInitials(user.name, user.email)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-lg">{user.name ?? "—"}</p>
          <p className="text-slate-500 text-sm truncate">{user.email}</p>
          <p className="text-xs text-slate-400 mt-0.5">Signed in with Google</p>
        </div>
      </div>

      {/* IBAN form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Bank Account (IBAN)</h2>
        <p className="text-sm text-slate-500 mb-4">
          Your IBAN is shown to group members when they need to send you money.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              IBAN
            </label>
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              placeholder="e.g. TR00 0000 0000 0000 0000 0000 00"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "Saving..." : saved ? "Saved!" : "Save IBAN"}
          </button>
        </form>
      </div>
    </main>
  );
}
