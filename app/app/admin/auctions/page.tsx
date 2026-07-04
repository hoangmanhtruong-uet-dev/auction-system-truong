import { listAdminAuctions } from "@/src/actions/admin-auctions";

type AdminAuctionsClientProps = {
  initialAuctions: Array<{ id: string | number; name?: string }> | null;
};

function AdminAuctionsClient({ initialAuctions }: AdminAuctionsClientProps) {
  if (!initialAuctions || initialAuctions.length === 0) {
    return <div>No auctions found.</div>;
  }

  return (
    <div>
      {initialAuctions.map((auction) => (
        <div key={auction.id}>{auction.name ?? "Auction"}</div>
      ))}
    </div>
  );
}

export default async function AdminAuctionsPage() {
  const { data: auctions } = await listAdminAuctions();

  return <AdminAuctionsClient initialAuctions={auctions} />;
}