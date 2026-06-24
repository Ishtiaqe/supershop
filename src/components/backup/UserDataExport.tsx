"use client";

import React, { useState } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Spinner,
} from "@heroui/react";
import { Download, Search, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserSearch, useUserDataExport } from "@/hooks/useBackupApi";
import { downloadBlob, generateTimestampedFilename } from "@/lib/download-utils";
import { formatDate } from "@/lib/ui-helpers";
import { User as UserType } from "@/types";

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
      <Card className="mt-6">
        <CardBody>
          <div className="flex items-center justify-center gap-2 py-8 text-red-500">
            <AlertCircle size={24} />
            <p>Only tenant owners can access user data export.</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const users = (userSearch.data || []) as UserType[];

  if (!isTenantOwner) {
    return (
      <Card className="mt-6">
        <CardBody>
          <div className="flex items-center justify-center gap-2 py-8 text-red-500">
            <AlertCircle size={24} />
            <p>Only tenant owners can access user data export.</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardBody className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Export User Data (GDPR)</h2>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>SUPER_ADMIN Feature:</strong> Search for any user and download
            all their data across all tables (sales, short lists, inventory, etc.)
            in JSON format. This feature complies with data privacy regulations.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Search User by Email
            </label>
            <Input
              placeholder="Enter user email..."
              startContent={<Search size={18} className="text-gray-400" />}
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  const value = (e.target as HTMLInputElement).value;
                  if (value) handleSearch(value);
                }
              }}
            />
          </div>

          {userSearch.isPending && (
            <div className="flex justify-center py-8">
              <Spinner label="Searching users..." size="lg" />
            </div>
          )}

          {users && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Full Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: UserType) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{user.email}</td>
                      <td className="py-3 px-4 text-sm">{user.fullName}</td>
                      <td className="py-3 px-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === "SUPER_ADMIN"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {(user as any).createdAt ? formatDate((user as any).createdAt, "short") : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          isIconOnly
                          size="sm"
                          color="primary"
                          variant="flat"
                          isLoading={userExport.isPending && selectedUserId === user.id}
                          onClick={() => handleExportUserData(user.id)}
                          title="Export User Data"
                        >
                          <Download size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {searchEmail && !userSearch.isPending && users?.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No users found matching &quot;{searchEmail}&quot;
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold mb-3">Export Contents:</h3>
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              User profile information
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              All sales/transactions
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              Short list items
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              Inventory overview
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              Notifications history
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              Sales summary and totals
            </li>
          </ul>
        </div>
      </CardBody>
    </Card>
  );
}
