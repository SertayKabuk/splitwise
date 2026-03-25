import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { randomUUID } from "crypto";
import getDb from "./db";
import type { NextAuthConfig } from "next-auth";

const config: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        const db = getDb();

        // Check if user exists
        const existing = db
          .prepare("SELECT id FROM users WHERE email = ?")
          .get(user.email) as { id: string } | undefined;

        if (!existing) {
          // Insert new user
          db.prepare(
            "INSERT OR IGNORE INTO users (id, email, name, image) VALUES (?, ?, ?, ?)"
          ).run(randomUUID(), user.email, user.name ?? null, user.image ?? null);
        } else {
          // Update existing user's name and image
          db.prepare(
            "UPDATE users SET name = ?, image = ? WHERE email = ?"
          ).run(user.name ?? null, user.image ?? null, user.email);
        }

        return true;
      } catch (err) {
        console.error("signIn callback error:", err);
        return false;
      }
    },

    async session({ session, token }) {
      if (session.user?.email) {
        try {
          const db = getDb();
          const dbUser = db
            .prepare("SELECT id FROM users WHERE email = ?")
            .get(session.user.email) as { id: string } | undefined;

          if (dbUser) {
            session.user.id = dbUser.id;
          }
        } catch (err) {
          console.error("session callback error:", err);
        }
      }
      return session;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
};

export const { auth, handlers, signIn, signOut } = NextAuth(config);
