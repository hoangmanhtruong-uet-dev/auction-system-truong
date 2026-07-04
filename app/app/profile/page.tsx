import { notFound } from "next/navigation";

import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";

import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    // Should not happen because middleware redirects, but as a safety net
    notFound();
  }

  const [auctionsCreated, bidsPlaced, auctionsWinning] = await Promise.all([
    prisma.auction.count({
      where: {
        sellerId: user.id,
        deletedAt: null,
      },
    }),
    prisma.bid.count({
      where: {
        bidderId: user.id,
        deletedAt: null,
      },
    }),
    prisma.auction.count({
      where: {
        winnerId: user.id,
        status: "ACTIVE",
        deletedAt: null,
      },
    }),
  ]);

  return (
    <ProfileClient
      user={user}
      stats={{
        auctionsCreated,
        bidsPlaced,
        auctionsWinning,
      }}
    />
  );
}