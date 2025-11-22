import React from "react";
import { Result, Button } from "antd";
import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Result
        icon={<WifiOff className="h-24 w-24 text-gray-400 mx-auto" />}
        title={
          <span className="text-gray-900 dark:text-white">You are offline</span>
        }
        subTitle={
          <span className="text-gray-600 dark:text-gray-400">
            Please check your internet connection. Some features may be
            unavailable, but you can still access cached data.
          </span>
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
