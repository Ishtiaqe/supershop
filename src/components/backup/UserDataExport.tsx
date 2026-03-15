"use client";

import React, { useState } from "react";
import {
  Card,
  Input,
  Button,
  Table,
  Space,
  message,
  Modal,
  Tag,
  Select,
  Spin,
} from "antd";
import {
  DownloadOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function UserDataExportComponent() {
  const { user: currentUser } = useAuth();
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [exporting, setExporting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Check if user is tenant owner (SUPER_ADMIN role)
  const isTenantOwner = currentUser?.role === "SUPER_ADMIN";

  // Search for users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users-search", searchEmail, currentUser?.tenantId],
    queryFn: async () => {
      if (!searchEmail.trim()) return [];

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/users?email=${encodeURIComponent(searchEmail)}&tenantId=${currentUser?.tenantId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : data.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!isTenantOwner && searchEmail.length > 0,
  });

  const handleExportUserData = async (userId: string) => {
    if (!isTenantOwner) {
      message.error("Only tenant owners can export user data");
      return;
    }

    setExporting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/backup/export-user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to export user data");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      a.download = `user-data-${userId}-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success("User data exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export user data. Please try again.");
    } finally {
      setExporting(false);
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
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: User) => (
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          loading={exporting && selectedUserId === record.id}
          onClick={() => {
            setSelectedUserId(record.id);
            handleExportUserData(record.id);
          }}
        >
          Export Data
        </Button>
      ),
    },
  ];

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
              // Search triggered
            }}
          />
        </div>

        {usersLoading && <Spin />}

        {users && users.length > 0 && (
          <Table
            dataSource={users}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        )}

        {searchEmail && !usersLoading && users?.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No users found matching "{searchEmail}"
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
