import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// Entry point — bounce to the app or to sign-in. Middleware already gates this
// route, so an unauthenticated visitor is normally redirected before reaching here.
export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  redirect(session ? "/dashboard" : "/sign-in");
}
