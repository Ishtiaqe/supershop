import React from "react";
import { Button } from "@/components/ui/button";
import { WifiOff } from "lucide-react";
import { Link } from "react-router-dom";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground text-center">
      <div className="max-w-md space-y-6">
        <WifiOff className="h-24 w-24 text-muted-foreground mx-auto" />
        <h1 className="text-3xl font-extrabold tracking-tight">You are offline</h1>
        <p className="text-muted-foreground text-lg">
          Please check your internet connection. Some features may be
          unavailable, but you can still access cached data.
        </p>
        <div>
          <Link to="/pos">
            <Button size="lg" className="rounded-lg px-8">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
