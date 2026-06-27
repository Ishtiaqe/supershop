"use client";

import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import UserDataExport from "@/components/backup/UserDataExport";
import { useBackupManagement } from "@/hooks/useBackupApi";
import { downloadBlob, generateTimestampedFilename } from "@/lib/download-utils";
import { formatDate, formatBytes } from "@/lib/ui-helpers";

export default function DataManagementPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { backupStatus, backupExport, backupImport } = useBackupManagement();
  const statusLoading = backupStatus.isLoading;
  const exporting = backupExport.isPending;
  const importing = backupImport.isPending;

  const handleExportBackup = async () => {
    if (!user) { toast.error("Please log in to export backup"); return; }
    try {
      const blob = await backupExport.mutateAsync();
      const filename = generateTimestampedFilename("supershop-backup", "sql");
      downloadBlob(blob, filename);
      toast.success("Backup exported successfully!");
    } catch {
      toast.error("Failed to export backup. Please try again.");
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) { toast.error("Please log in to import backup"); return; }
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File size exceeds 100MB limit");
      return;
    }

    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev));
      }, 500);

      await backupImport.mutateAsync(file);

      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success("Backup restored successfully!");

      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast.error("Failed to import backup. Please try again.");
    } finally {
      setUploadProgress(0);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Data Management</h1>

      <Alert variant="destructive" className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20">
        <AlertTriangle className="h-5 w-5 !text-amber-500" />
        <AlertTitle className="font-bold">Data Safety Important</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-400 mt-2">
          <p>Regular backups protect your data from loss. Always backup before:</p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Major system updates or migrations</li>
            <li>Database schema changes</li>
            <li>Bulk data operations</li>
            <li>System maintenance</li>
          </ul>
          <p className="mt-2 font-medium">
            See our{" "}
            <Link to="/docs/data-safety" className="underline hover:text-amber-800 dark:hover:text-amber-300">
              Data Safety Guidelines
            </Link>{" "}
            for more information.
          </p>
        </AlertDescription>
      </Alert>

      {statusLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : backupStatus.data ? (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-500 h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold mb-2">Backup Status</h3>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Last Backup:</strong>{" "}
                  {backupStatus.data.lastBackupTime
                    ? formatDate(backupStatus.data.lastBackupTime, "short")
                    : "Never"}
                </p>
                {backupStatus.data.backupSize && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong className="text-foreground">Size:</strong> {formatBytes(backupStatus.data.backupSize)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="border-t border-border my-6"></div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Export Full Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Download a complete backup of all your data in SQL format.
          </p>
          <Button
            size="lg"
            onClick={handleExportBackup}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Exporting Backup...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download Full Backup
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Restore From Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-destructive font-medium">
            ⚠️ Warning: Restoring will replace all current data. Always backup first!
          </p>

          {importing && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Upload Progress</span>
                <span className="font-semibold">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".sql,.sql.gz"
              style={{ display: "none" }}
              disabled={importing}
            />
            <Button
              variant="outline"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Restoring... {Math.round(uploadProgress)}%
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Upload & Restore Backup
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {user?.role === "SUPER_ADMIN" && <UserDataExport />}

      <Card className="bg-primary/5 border border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Backup Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">✓ Export backups regularly</li>
            <li className="flex items-center gap-2">✓ Store backups in a secure, separate location</li>
            <li className="flex items-center gap-2">✓ Test restore procedures periodically</li>
            <li className="flex items-center gap-2">✓ Backup before system updates</li>
            <li className="flex items-center gap-2">✓ Keep at least 3 versions of backups</li>
            <li className="flex items-center gap-2">✓ Document your backup schedule</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
