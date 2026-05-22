import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { randomUUID } from "crypto";
import { getUserByEmail, createUser, updateUserProfile } from "./repositories/userRepository";
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
        // Check if user exists
        const existing = getUserByEmail(user.email);

        if (!existing) {
          // Insert new user
          createUser({
            id: randomUUID(),
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
          });
        } else {
          // Update existing user's name and image
          updateUserProfile(user.email, {
            name: user.name ?? null,
            image: user.image ?? null,
          });
        }

        return true;
      } catch (err) {
        console.error("signIn callback error:", err);
        return false;
      }
    },

    async session({ session }) {
      if (session.user?.email) {
        try {
          const dbUser = getUserByEmail(session.user.email);

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
