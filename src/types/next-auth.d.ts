import { UserHealthProfile } from "@/types/index";

declare module "next-auth" {
  interface User {
    id: string;
    healthProfile?: UserHealthProfile;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      healthProfile?: UserHealthProfile;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    healthProfile?: UserHealthProfile;
  }
}
