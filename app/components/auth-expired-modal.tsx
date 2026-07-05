"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function AuthExpiredModal({
  open,
  message = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
}: {
  open: boolean;
  message?: string;
}) {
  const router = useRouter();

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Cần đăng nhập lại
          </DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => router.push("/auth/login")}>
            <LogIn className="mr-2 h-4 w-4" />
            Đăng nhập để tiếp tục
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}