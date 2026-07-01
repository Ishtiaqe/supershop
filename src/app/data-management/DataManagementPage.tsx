"use client";

import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Download,
  Upload,
  CheckCircle,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import api from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import UserDataExport from "@/components/backup/UserDataExport";
import { useBackupManagement } from "@/hooks/useBackupApi";
import { downloadBlob, generateTimestampedFilename } from "@/lib/download-utils";
import { formatDate, formatBytes } from "@/lib/ui-helpers";

export default function DataManagementPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAllData = async () => {
    if (!user) { toast.error("Please log in"); return; }
    setDeleting(true);
    try {
      await api.delete("/backup/data");
      toast.success("All data deleted successfully.");
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast.error("Failed to delete data. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">

      {statusLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : backupStatus.data ? (
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-5">
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

      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4 p-5">
          <CardTitle className="text-lg font-semibold">Export Full Backup</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
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

      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4 p-5">
          <CardTitle className="text-lg font-semibold">Restore From Backup</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
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
              id="import-backup-file"
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

      <Card className="shadow-sm border-destructive/30">
        <CardHeader className="pb-4 p-5">
          <CardTitle className="text-lg font-semibold text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <p className="text-muted-foreground text-sm">
            Permanently delete all shop data. This cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="lg"
                disabled={deleting}
                className="flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-5 w-5" />
                    Delete All Data
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all products, inventory, sales, expenses, and other shop data for your tenant. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
