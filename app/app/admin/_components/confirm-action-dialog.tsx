"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  variant = "default",
  requireReason = false,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  requireReason?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (requireReason && reason.trim().length < 5) {
      setError("Lý do phải có ít nhất 5 ký tự.");
      return;
    }

    startTransition(async () => {
      try {
        await onConfirm(requireReason ? reason.trim() : undefined);
        setReason("");
        setError("");
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể thực hiện thao tác.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {requireReason ? (
          <div className="space-y-2 py-2">
            <Label htmlFor="admin-action-reason">Lý do</Label>
            <Textarea
              id="admin-action-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError("");
              }}
              placeholder="Nhập lý do thao tác..."
              rows={4}
            />
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Đóng
          </Button>
          <Button variant={variant} onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Đang xử lý..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
