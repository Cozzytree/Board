import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  trustedOrigins: [process.env.ALLOWED_ORIGIN!],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username()],
});
