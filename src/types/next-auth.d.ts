import type { DefaultSession } from "next-auth";

// session.user.id = UUID interno (public.app_users.id), usado em todo o app.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
