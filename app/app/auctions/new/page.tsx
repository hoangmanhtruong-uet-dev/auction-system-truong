import { getCurrentUser } from "@/src/lib/auth";
import { hasPermission } from "@/src/lib/rbac";
import { NewAuctionClient } from "./new-auction-client";
import { SellerAccessGate } from "./seller-access-gate";

export default async function NewAuctionPage() {
  const user = await getCurrentUser();

  if (!hasPermission(user, "auctions.create")) {
    return <SellerAccessGate user={user} />;
  }

  return <NewAuctionClient />;
}
