"use client";

import React, { useState } from "react";
import {
  Card,
  Input,
  Button,
  Table,
  Space,
  message,
  Tag,
  Spin,
} from "antd";
import {
  DownloadOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
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
      message.error("Failed to search users");
    }
  };

  const handleExportUserData = async (userId: string) => {
    if (!isTenantOwner) {
      message.error("Only tenant owners can export user data");
      return;
    }

    setSelectedUserId(userId);
    try {
      const blob = await userExport.mutateAsync(userId);
      const filename = generateTimestampedFilename(`user-data-${userId}`, "json");
      downloadBlob(blob, filename);
      message.success("User data exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export user data. Please try again.");
    } finally {
      setSelectedUserId(null);
    }
  };

  if (!isTenantOwner) {
    return (
      <Card>
        <div className="text-center text-red-500">
          <UserOutlined className="text-2xl mr-2" />
          <p>Only tenant owners can access user data export.</p>
        </div>
      </Card>
    );
  }

  const columns = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: string) => (
        <Tag color={role === "SUPER_ADMIN" ? "red" : "blue"}>{role}</Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => formatDate(date, "short"),
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: User) => (
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          loading={userExport.isPending && selectedUserId === record.id}
          onClick={() => handleExportUserData(record.id)}
        >
          Export Data
        </Button>
      ),
    },
  ];

  const users = (userSearch.data || []) as User[];

  if (!isTenantOwner) {
    return (
      <Card>
        <div className="text-center text-red-500">
          <UserOutlined className="text-2xl mr-2" />
          <p>Only tenant owners can access user data export.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <h2 className="text-xl font-bold mb-4">Export User Data (GDPR)</h2>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-gray-700">
          <strong>SUPER_ADMIN Feature:</strong> Search for any user and download
          all their data across all tables (sales, short lists, inventory, etc.)
          in JSON format. This feature complies with data privacy regulations.
        </p>
      </div>

      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div>
          <label className="block text-sm font-medium mb-2">
            Search User by Email
          </label>
          <Input
            placeholder="Enter user email..."
            prefix={<SearchOutlined />}
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onPressEnter={(e) => {
              const value = (e.target as HTMLInputElement).value;
              if (value) handleSearch(value);
            }}
          />
        </div>

        {userSearch.isPending && <Spin />}

        {users && users.length > 0 && (
          <Table
            dataSource={users}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        )}

        {searchEmail && !userSearch.isPending && users?.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No users found matching &quot;{searchEmail}&quot;
          </div>
        )}
      </Space>

      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded">
        <h3 className="font-semibold mb-2">Export Contents:</h3>
        <ul className="text-sm space-y-1">
          <li>✓ User profile information</li>
          <li>✓ All sales/transactions</li>
          <li>✓ Short list items</li>
          <li>✓ Inventory overview</li>
          <li>✓ Notifications history</li>
          <li>✓ Sales summary and totals</li>
        </ul>
      </div>
    </Card>
  );
}
