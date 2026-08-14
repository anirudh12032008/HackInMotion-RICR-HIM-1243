import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      await connectDB();
      const user = await User.findOne({ email: credentials.email.toLowerCase() });
      // No password on file means this account was created via Google —
      // it has nothing for bcrypt to compare against.
      if (!user || !user.password) return null;

      const valid = await bcrypt.compare(credentials.password, user.password);
      if (!valid) return null;

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        healthProfile: user.healthProfile,
        language: user.language,
      };
    },
  }),
];

// Google sign-in only registers when credentials are configured, so the
// app still runs (and the credentials flow still works) without them.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // First sign-in via Google: there's no adapter persisting accounts,
      // so find-or-create the Mongo user by email ourselves, here, once.
      // Matching by email intentionally links a Google sign-in to an
      // existing credentials account with the same address.
      if (user && account?.provider === "google" && user.email) {
        await connectDB();
        const email = user.email.toLowerCase();
        let dbUser = await User.findOne({ email });
        if (!dbUser) {
          dbUser = await User.create({ name: user.name || "New user", email });
        }
        token.userId = dbUser._id.toString();
        token.healthProfile = dbUser.healthProfile;
        token.language = dbUser.language;
        return token;
      }

      if (user) {
        token.userId = user.id;
        token.healthProfile = user.healthProfile;
        token.language = user.language;
      }
      if (trigger === "update" && session?.healthProfile) {
        token.healthProfile = session.healthProfile;
      }
      if (trigger === "update" && session?.language) {
        token.language = session.language;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.healthProfile = token.healthProfile;
        session.user.language = token.language;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
