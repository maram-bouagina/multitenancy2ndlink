import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { Pool } from "pg";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },

  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? {
          facebook: {
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
          },
        }
      : {}),
  },

  plugins: [
    twoFactor({
      issuer: "MultiTenancy E-Commerce",
    }),
  ],

  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: true,
        input: true,
      },
      lastName: {
        type: "string",
        required: true,
        input: true,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      plan: {
        type: "string",
        defaultValue: "free",
        input: true,
      },
      role: {
        type: "string",
        defaultValue: "staff",
        input: true,
      },
      userStatus: {
        type: "string",
        defaultValue: "active",
        input: true,
      },
      storeId: {
        type: "string",
        required: false,
        input: true,
      },
      storeSlug: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24, // 24 hours
    updateAge: 60 * 60, // update session every hour
    cookieCache: {
      enabled: false,
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "facebook"],
    },
  },

  // Sync: when Better Auth creates a user, also create a matching record
  // so the Go backend can find the user in the appropriate table.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            if (user.role === "customer" && user.storeId) {
              // Look up the tenant for this store
              const tenantResult = await pool.query(
                `SELECT "tenant_id" FROM public.store_slug_index WHERE "store_id" = $1 LIMIT 1`,
                [user.storeId]
              );
              if (tenantResult.rows.length > 0) {
                const tenantId = tenantResult.rows[0].tenant_id;
                const schema = `tenant_${tenantId}`;
                await pool.query(
                  `INSERT INTO "${schema}".clients
                     (id, store_id, email, password_hash, first_name, last_name, phone, status, email_verified, accepts_marketing, created_at, updated_at)
                   VALUES ($1, $2::uuid, $3, 'better-auth-managed', $4, $5, $6, 'active', false, false, NOW(), NOW())
                   ON CONFLICT (id) DO NOTHING`,
                  [
                    user.id,
                    user.storeId,
                    user.email,
                    user.firstName || user.name?.split(" ")[0] || "",
                    user.lastName || user.name?.split(" ").slice(1).join(" ") || "",
                    user.phone || null,
                  ]
                );
              }
            } else if (user.role === "merchant" || user.role === "admin") {
              // Tenant-capable account — sync to tenants table
              await pool.query(
                `INSERT INTO public.tenants (id, email, password_hash, first_name, last_name, phone, plan, status, email_verified, created_at, updated_at)
                 VALUES ($1, $2, 'better-auth-managed', $3, $4, $5, $6, 'active', false, NOW(), NOW())
                 ON CONFLICT (email) DO NOTHING`,
                [
                  user.id,
                  user.email,
                  user.firstName || user.name?.split(" ")[0] || "",
                  user.lastName || user.name?.split(" ").slice(1).join(" ") || "",
                  user.phone || null,
                  user.plan || "free",
                ]
              );
            }
          } catch (e) {
            console.error("Failed to sync user record:", e);
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
