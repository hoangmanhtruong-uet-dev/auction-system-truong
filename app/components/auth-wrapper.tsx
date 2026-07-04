import { getCurrentUser } from "@/src/lib/auth";
import { AuthStatus } from "./auth-status";

export async function AuthWrapper() {
  const user = await getCurrentUser();
  return <AuthStatus user={user} />;
}