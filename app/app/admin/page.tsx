import { requireAdmin } from "@/src/lib/auth";
import { AdminClient } from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Admin client no longer requires user prop - may re-add when admin features are implemented
  await requireAdmin();
  return <AdminClient />;
}
