"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Download, Search, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserSearch, useUserDataExport } from "@/hooks/useBackupApi";
import { downloadBlob, generateTimestampedFilename } from "@/lib/download-utils";
import { formatDate } from "@/lib/ui-helpers";
import { User } from "@/types";

export default function UserDataExportComponent() {
  const { user: currentUser } = useAuth();
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Check if user is tenant owner (SUPER_ADMIN role)
  const isTenantOwner = currentUser?.role === "SUPER_ADMIN";

  // Use centralized hooks for user search and export
  const userSearch = useUserSearch();
  const userExport = useUserDataExport();

  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      return;
    }
    setSearchEmail(value);
    try {
      await userSearch.mutateAsync(value);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search users");
    }
  };

  const handleExportUserData = async (userId: string) => {
    if (!isTenantOwner) {
      toast.error("Only tenant owners can export user data");
      return;
    }

    setSelectedUserId(userId);
    try {
      const blob = await userExport.mutateAsync(userId);
      const filename = generateTimestampedFilename(`user-data-${userId}`, "json");
      downloadBlob(blob, filename);
      toast.success("User data exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export user data. Please try again.");
    } finally {
      setSelectedUserId(null);
    }
  };

  if (!isTenantOwner) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-red-500">
          <UserIcon className="text-2xl mr-2 inline" />
          <p className="inline-block">Only tenant owners can access user data export.</p>
        </CardContent>
      </Card>
    );
  }

  const users = (userSearch.data || []) as User[];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Export User Data (GDPR)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">SUPER_ADMIN Feature:</strong> Search for any user and download
            all their data across all tables (sales, short lists, inventory, etc.)
            in JSON format. This feature complies with data privacy regulations.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="user-search-email" className="block text-sm font-medium mb-2">
              Search User by Email
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="user-search-email"
                placeholder="Enter user email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const value = (e.target as HTMLInputElement).value;
                    if (value) handleSearch(value);
                  }
                }}
                className="pl-10 h-11"
              />
            </div>
          </div>

          {userSearch.isPending && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {users && users.length > 0 && (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.email}</TableCell>
                      <TableCell>{record.fullName}</TableCell>
                      <TableCell>
                        <Badge variant={record.role === "SUPER_ADMIN" ? "destructive" : "secondary"}>
                          {record.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.createdAt ? formatDate(record.createdAt) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={userExport.isPending && selectedUserId === record.id}
                          onClick={() => handleExportUserData(record.id)}
                          className="inline-flex items-center gap-1.5"
                        >
                          <Download className="h-4 w-4" />
                          {userExport.isPending && selectedUserId === record.id ? "Exporting..." : "Export Data"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {searchEmail && !userSearch.isPending && users?.length === 0 && (
            <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg">
              No users found matching &quot;{searchEmail}&quot;
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/50 border border-border rounded-lg">
          <h3 className="font-semibold mb-2 text-sm text-foreground">Export Contents:</h3>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>✓ User profile information</li>
            <li>✓ All sales/transactions</li>
            <li>✓ Short list items</li>
            <li>✓ Inventory overview</li>
            <li>✓ Notifications history</li>
            <li>✓ Sales summary and totals</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
