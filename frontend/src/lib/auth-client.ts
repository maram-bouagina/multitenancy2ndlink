import { createAuthClient } from "better-auth/react";
import { twoFactorClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    twoFactorClient(),
    inferAdditionalFields({
      user: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        phone: { type: "string" },
        plan: { type: "string" },
        role: { type: "string" },
        userStatus: { type: "string" },
        storeId: { type: "string" },
        storeSlug: { type: "string" },
      },
    }),
  ],
});
