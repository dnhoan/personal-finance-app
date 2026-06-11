import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Better Auth runs on the Node runtime (Drizzle/neon Pool + ws).
export const { GET, POST } = toNextJsHandler(auth);
