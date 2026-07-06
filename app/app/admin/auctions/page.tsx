import { listAdminAuctions, type AdminAuction } from "@/src/actions/admin-auctions";
import { AdminAuctionsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminAuctionsPage() {
  let auctions: AdminAuction[] | null = null;
  let error: string | undefined;

  try {
    const result = await listAdminAuctions();
    auctions = result.data;
  } catch (e) {
    console.error("Admin auctions page error:", e);
    error = "Không thể tải danh sách đấu giá";
  }

  return <AdminAuctionsClient initialAuctions={auctions} error={error} />;
}
