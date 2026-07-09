import { getCurrentUser } from "@/src/lib/auth";
import { hasPermission } from "@/src/lib/rbac";
import { SellerAccessGate } from "@/app/auctions/new/seller-access-gate";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const user = await getCurrentUser();

  if (!hasPermission(user, "auctions.create")) {
    return <SellerAccessGate user={user} />;
  }

  return <InventoryClient />;
}
