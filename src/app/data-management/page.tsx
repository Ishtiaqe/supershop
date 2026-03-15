"use client";

import React, { useState } from "react";
import {
  Card,
  Button,
  Space,
  message,
  Spin,
  Alert,
  Progress,
  Divider,
} from "antd";
import {
  DownloadOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import UserDataExport from "@/components/backup/UserDataExport";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function DataManagementPage() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Check backup status
  const { data: backupStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["backup-status"],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/backup/status`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch backup status");
        return response.json();
      } catch {
        return null;
      }
    },
    enabled: !!user,
  });

  const handleExportBackup = async () => {
    if (!user) {
      message.error("Please log in to export backup");
      return;
    }

    setExporting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/backup/export`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export backup");
      }

      // Get the blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      a.download = `supershop-backup-${timestamp}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success("Backup exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export backup. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!user) {
      message.error("Please log in to import backup");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      message.error("File size exceeds 100MB limit");
      return;
    }

    setImporting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 200) {
          message.success("Backup restored successfully!");
          setImporting(false);
          setUploadProgress(0);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          // Reload page to reflect changes
          setTimeout(() => window.location.reload(), 1500);
        } else {
          message.error("Failed to restore backup");
          setImporting(false);
          setUploadProgress(0);
        }
      });

      xhr.addEventListener("error", () => {
        message.error("Network error during upload");
        setImporting(false);
        setUploadProgress(0);
      });

      xhr.open("POST", `${API_BASE_URL}/backup/import`);
      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${localStorage.getItem("token")}`,
      );
      xhr.send(formData);
    } catch (error) {
      console.error("Import error:", error);
      message.error("Failed to import backup. Please try again.");
      setImporting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Data Management</h1>

      {/* Safety Notice */}
      <Alert
        message="Data Safety Important"
        description={
          <div>
            <p>
              Regular backups protect your data from loss. Always backup before:
            </p>
            <ul className="list-disc ml-5 mt-2">
              <li>Major system updates or migrations</li>
              <li>Database schema changes</li>
              <li>Bulk data operations</li>
              <li>System maintenance</li>
            </ul>
            <p className="mt-2">
              See our{" "}
              <Link
                href="/docs/data-safety"
                className="text-blue-500 underline"
              >
                Data Safety Guidelines
              </Link>{" "}
              for more information.
            </p>
          </div>
        }
        type="warning"
        icon={<WarningOutlined />}
        showIcon
        className="mb-6"
      />

      {/* Backup Status Card */}
      {statusLoading ? (
        <Spin className="block text-center mb-6" />
      ) : backupStatus ? (
        <Card className="mb-6">
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                <CheckCircleOutlined className="text-green-500 mr-2" />
                Backup Status
              </h3>
              <p>
                <strong>Last Backup:</strong>{" "}
                {backupStatus.lastBackup
                  ? new Date(backupStatus.lastBackup).toLocaleString()
                  : "Never"}
              </p>
              {backupStatus.backupSize && (
                <p>
                  <strong>Size:</strong>{" "}
                  {(backupStatus.backupSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </Space>
        </Card>
      ) : null}

      <Divider />

      {/* Export Section */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">Export Full Backup</h2>
        <p className="text-gray-600 mb-4">
          Download a complete backup of all your data in SQL format. This
          includes all tables, configurations, and transaction history.
        </p>
        <Button
          type="primary"
          size="large"
          icon={<DownloadOutlined />}
          onClick={handleExportBackup}
          loading={exporting}
          disabled={exporting}
        >
          {exporting ? "Exporting Backup..." : "Download Full Backup"}
        </Button>
      </Card>

      {/* Import Section */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">Restore From Backup</h2>
        <p className="text-gray-600 mb-4">
          <strong>⚠️ Warning:</strong> Restoring will replace all current data
          with the backup data. Make sure you have exported a backup before
          proceeding!
        </p>

        {importing && uploadProgress > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Upload Progress</p>
            <Progress percent={Math.round(uploadProgress)} status="active" />
          </div>
        )}

        <Space>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".sql,.sql.gz"
            style={{ display: "none" }}
            disabled={importing}
          />
          <Button
            type="default"
            size="large"
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
            loading={importing}
            disabled={importing}
          >
            {importing
              ? `Restoring... ${Math.round(uploadProgress)}%`
              : "Upload & Restore Backup"}
          </Button>
        </Space>
      </Card>

      {/* User Data Export (SUPER_ADMIN only) */}
      {user?.role === "SUPER_ADMIN" && <UserDataExport />}

      {/* Info Section */}
      <Card className="mt-6 bg-blue-50">
        <h3 className="text-lg font-bold mb-3">Backup Best Practices</h3>
        <ul className="space-y-2 text-sm">
          <li>✓ Export backups regularly (at least weekly for production)</li>
          <li>✓ Store backups in a secure, separate location</li>
          <li>✓ Test restore procedures periodically</li>
          <li>✓ Always backup before system updates or migrations</li>
          <li>✓ Keep at least 3 versions of backups</li>
          <li>✓ Document your backup schedule and retention policy</li>
        </ul>
      </Card>
    </div>
  );
}
