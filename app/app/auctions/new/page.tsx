import { getCurrentUser } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import { NewAuctionClient } from "./new-auction-client";

export default async function NewAuctionPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?redirect=/auctions/new");
  }

  return <NewAuctionClient />;
}
