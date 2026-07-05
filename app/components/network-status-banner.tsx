"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, WifiOff, Wifi, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertTitle } from "@/components/ui/alert";
import * as React from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";

interface NetworkStatusBannerProps {
  showReconnectNotice?: boolean;
  onReconnect?: () => void;
}

/**
 * Global banner that shows network status.
 * Displays when user is offline or reconnecting.
 */
export function NetworkStatusBanner({ showReconnectNotice = true, onReconnect }: NetworkStatusBannerProps) {
  const { status, isOnline } = useNetworkStatus();
  const [show, setShow] = React.useState(true);

  // Auto-hide after 5 seconds if online again
  React.useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => {
        setShow(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!show) return null;

  if (!isOnline) {
    return (
      <Alert variant="destructive" className="mb-4 animate-in slide-in-from-top-5 duration-300">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Mất kết nối</AlertTitle>
        <AlertDescription className="flex flex-col gap-2 mt-2">
          <span>
            Không thể kết nối máy chủ. Dữ liệu có thể chưa được cập nhật. Vui lòng kiểm tra mạng và thử lại.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReconnect}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Thử kết nối lại
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShow(false)}>
              <X className="h-4 w-4 mr-2" />
              Đã hiểu
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

/**
 * Reconnect notice shown when coming back online.
 */
export function ReconnectNotice({ onReconnect }: { onReconnect?: () => void }) {
  const { status, isOnline } = useNetworkStatus();
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (status === "online" && !isOnline) {
      // This won't trigger since isOnline is always true when status is "online"
      return;
    }
    if (status === "online") {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, isOnline]);

  if (!show) return null;

  return (
    <Alert className="mb-4 border-green-500/50 bg-green-50/50 text-green-800 dark:bg-green-900/20 dark:text-green-300 animate-in slide-in-from-top-5 duration-300">
      <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
      <AlertTitle className="text-green-700 dark:text-green-300">Đã kết nối lại</AlertTitle>
      <AlertDescription className="text-green-700 dark:text-green-300 mt-2 flex flex-col gap-2">
        <span>Đã kết nối lại máy chủ. Đang cập nhật dữ liệu...</span>
        <Button variant="outline" size="sm" onClick={onReconnect}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Cập nhật ngay
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Wrapper that shows both banners conditionally.
 */
export function NetworkStatusContainer({ onReconnect }: { onReconnect?: () => void }) {
  const { isOnline } = useNetworkStatus();

  if (!isOnline) {
    return <NetworkStatusBanner onReconnect={onReconnect} />;
  }

  return null;
}