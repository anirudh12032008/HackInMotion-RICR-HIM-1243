import type { UserHealthProfile } from "@/types/index";

declare module "next-auth" {
  interface User {
    id: string;
    healthProfile?: UserHealthProfile;
    language?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      healthProfile?: UserHealthProfile;
      language?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    healthProfile?: UserHealthProfile;
    language?: string;
  }
}
