import React from "react";
import { Button } from "@heroui/react";
import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md space-y-4">
        <WifiOff className="h-24 w-24 text-default-500 mx-auto" />
        <h1 className="text-3xl font-bold text-foreground">You are offline</h1>
        <p className="text-default-500">
          Please check your internet connection. Some features may be unavailable, but you can still access cached data.
        </p>
        <Link href="/pos">
          <Button color="primary" size="lg" fullWidth>
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
