import { requireAuth } from "@/src/lib/auth";
import { ChangePasswordClient } from "./change-password-client";

export default async function ChangePasswordPage() {
  await requireAuth();
  return <ChangePasswordClient />;
}