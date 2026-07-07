import { formatDateTime } from "@/lib/utils";
import { listAdminAuditLogs } from "@/src/actions/admin-lists";

import { AdminDataTable, TableEmptyState } from "../_components/admin-data-table";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  const logs = await listAdminAuditLogs();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Audit Logs</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Nhật ký quản trị</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Read-only audit trail từ bảng audit_logs. Các reason được lấy từ metadata adminReason nếu có.
        </p>
      </div>

      <AdminDataTable>
        {logs.length === 0 ? (
          <TableEmptyState title="Chưa có audit log" description="Các thao tác quản trị sẽ được ghi lại tại đây." />
        ) : (
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target type/id</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Created at</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{log.actorName}</p>
                    <p className="text-xs text-muted-foreground">{log.actorEmail ?? "system"}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{log.targetType}</p>
                    <p className="font-mono text-xs text-muted-foreground">{log.targetId}</p>
                  </td>
                  <td className="max-w-sm px-4 py-3 text-muted-foreground">{log.reason ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminDataTable>
    </div>
  );
}
