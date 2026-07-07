import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { listAdminNotifications } from "@/src/actions/admin-lists";

import { AdminDataTable, TableEmptyState } from "../_components/admin-data-table";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const notifications = await listAdminNotifications();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Notifications</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Thông báo hệ thống</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Read-only view cho notification đã gửi. Chưa thêm broadcast/action mới vì backend chưa có flow tương ứng.
        </p>
      </div>

      <AdminDataTable>
        {notifications.length === 0 ? (
          <TableEmptyState title="Chưa có notification" description="Thông báo tạo bởi hệ thống sẽ hiển thị tại đây." />
        ) : (
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Auction</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Created at</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {notifications.map((notification) => (
                <tr key={notification.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{notification.profile.fullName}</p>
                    <p className="text-xs text-muted-foreground">{notification.profile.email}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">{notification.type}</td>
                  <td className="max-w-md px-4 py-3">
                    <p className="font-medium">{notification.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{notification.message}</p>
                  </td>
                  <td className="px-4 py-3">
                    {notification.auction ? (
                      <Link href={`/auctions/${notification.auction.id}`} className="font-medium hover:underline">
                        {notification.auction.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="rounded-md">
                      {notification.readAt ? "Đã đọc" : "Chưa đọc"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(notification.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminDataTable>
    </div>
  );
}
