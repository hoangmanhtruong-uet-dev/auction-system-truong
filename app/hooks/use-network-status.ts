import * as React from "react";

/**
 * Hook to monitor network connectivity status.
 * Returns current online/offline state and listens for browser events.
 */
export function useNetworkStatus(): {
  isOnline: boolean;
  status: "online" | "offline";
  wasEverOffline: boolean;
} {
  const [status, setStatus] = React.useState<"online" | "offline">("online");
  const [wasEverOffline, setWasEverOffline] = React.useState(false);

  React.useEffect(() => {
    setStatus(navigator.onLine ? "online" : "offline");

    function handleOnline() {
      setStatus("online");
    }

    function handleOffline() {
      setStatus("offline");
      setWasEverOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOnline: status === "online",
    status,
    wasEverOffline,
  };
}
