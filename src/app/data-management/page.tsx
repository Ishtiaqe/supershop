"use client";

import React, { useRef, useState } from "react";
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
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import UserDataExport from "@/components/backup/UserDataExport";
import { useBackupManagement } from "@/hooks/useBackupApi";
import { downloadBlob, generateTimestampedFilename } from "@/lib/download-utils";
import { formatDate, formatBytes } from "@/lib/ui-helpers";

export default function DataManagementPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Use centralized backup management hook
  const { backupStatus, backupExport, backupImport } = useBackupManagement();
  const statusLoading = backupStatus.isLoading;
  const exporting = backupExport.isPending;
  const importing = backupImport.isPending;
  const handleExportBackup = async () => {
    if (!user) {
      message.error("Please log in to export backup");
      return;
    }

    try {
      const blob = await backupExport.mutateAsync();
      const filename = generateTimestampedFilename("supershop-backup", "sql");
      downloadBlob(blob, filename);
      message.success("Backup exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export backup. Please try again.");
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

    setUploadProgress(0);

    try {
      // Simulate progress (since XMLHttpRequest is used internally by api)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev));
      }, 500);

      await backupImport.mutateAsync(file);

      clearInterval(progressInterval);
      setUploadProgress(100);
      message.success("Backup restored successfully!");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Reload page to reflect changes
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("Import error:", error);
      message.error("Failed to import backup. Please try again.");
    } finally {
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
      ) : backupStatus.data ? (
        <Card className="mb-6">
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                <CheckCircleOutlined className="text-green-500 mr-2" />
                Backup Status
              </h3>
              <p>
                <strong>Last Backup:</strong>{" "}
                {backupStatus.data.lastBackupTime
                  ? formatDate(backupStatus.data.lastBackupTime, "long")
                  : "Never"}
              </p>
              {backupStatus.data.backupSize && (
                <p>
                  <strong>Size:</strong> {formatBytes(backupStatus.data.backupSize)}
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
