import React from "react";
import { Result, Button } from "antd";
import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background dark:bg-background">
      <Result
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background dark:bg-background">
        title={
          icon={<WifiOff className="h-24 w-24 text-muted-foreground mx-auto" />}
        }
        subTitle={
          <span className="text-muted-foreground">
            Please check your internet connection. Some features may be
            unavailable, but you can still access cached data.
            <span className="text-foreground dark:text-foreground">You are offline</span>
        }
        extra={
          <Link href="/dashboard">
            <Button type="primary" size="large">
              Go to Dashboard
            </Button>
          </Link>
        }
      />
    </div>
  );
}
