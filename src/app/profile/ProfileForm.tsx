"use client";

import { useState } from "react";
import Image from "next/image";
import { getInitials } from "@/lib/initials";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <h1 className="text-2xl font-bold text-foreground mb-6">Profile</h1>

      {/* Avatar + identity */}
      <Card className="mb-6">
        <CardContent className="p-6 flex items-center gap-4">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? user.email}
              width={64}
              height={64}
              className="rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xl font-semibold flex-shrink-0">
              {getInitials(user.name, user.email)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-lg">{user.name ?? "—"}</p>
            <p className="text-muted-foreground text-sm truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Signed in with Google</p>
          </div>
        </CardContent>
      </Card>

      {/* IBAN form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bank Account (IBAN)</CardTitle>
          <CardDescription>
            Your IBAN is shown to group members when they need to send you money.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase())}
                placeholder="e.g. TR00 0000 0000 0000 0000 0000 00"
                className="font-mono"
              />
            </div>

            {error && (
              <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : saved ? "Saved!" : "Save IBAN"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
