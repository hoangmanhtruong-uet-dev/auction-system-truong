import { listAdminPayments } from "@/src/actions/admin-lists";

import { AdminPaymentsClient } from "./payments-client";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const payments = await listAdminPayments("all");

  return <AdminPaymentsClient initialPayments={payments} />;
}
