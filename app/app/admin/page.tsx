import { requireAdmin } from "@/src/lib/auth";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  // Admin client no longer requires user prop - may re-add when admin features are implemented
  await requireAdmin();
  return <AdminClient />;
}
