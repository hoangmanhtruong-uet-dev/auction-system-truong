
import { notFound } from "next/navigation";

import { getAuctionById } from "@/src/actions/auction";
import { getCurrentUser } from "@/src/lib/auth";

import AuctionDetailClient from "./auction-detail-client";

export default async function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, currentUser] = await Promise.all([getAuctionById(id), getCurrentUser()]);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <AuctionDetailClient
      auction={result.data}
      currentUser={currentUser}
    />
  );
}
