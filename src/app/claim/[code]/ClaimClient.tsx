"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

interface Props {
  code: string;
  placeholderName: string;
  groups: Array<{ id: string; name: string }>;
  isAuthenticated: boolean;
}

export default function ClaimClient({ code, placeholderName, groups, isAuthenticated }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = () => {
    signIn("google", { callbackUrl: `/claim/${code}` });
  };

  const handleClaim = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/claim/${code}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to claim");
      }
      const data = await res.json();
      router.push(data.groupId ? `/groups/${data.groupId}` : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl">
                <UserPlus className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Claim your spot</h1>
              <p className="text-muted-foreground">
                You&apos;ve been added as{" "}
                <span className="font-semibold text-foreground">{placeholderName}</span>. Sign in to
                take over this identity and start tracking your share.
              </p>
            </div>

            {groups.length > 0 && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Group{groups.length !== 1 ? "s" : ""}
                </p>
                <ul className="space-y-1">
                  {groups.map((g) => (
                    <li key={g.id} className="text-sm font-medium text-foreground">
                      {g.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            {isAuthenticated ? (
              <Button onClick={handleClaim} disabled={loading} className="w-full">
                {loading ? "Claiming..." : "Claim this identity"}
              </Button>
            ) : (
              <Button onClick={handleSignIn} variant="outline" size="lg" className="w-full gap-3">
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
                Sign in with Google to claim
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
