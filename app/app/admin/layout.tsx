import { redirect } from "next/navigation";

import { requireAdminAreaAccess, isAuthorizationError } from "@/src/lib/authorization";

import { AdminShell } from "./_components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminAreaAccess();

  if (isAuthorizationError(user)) {
    redirect(user.code === "UNAUTHENTICATED" ? "/auth/login" : "/");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
