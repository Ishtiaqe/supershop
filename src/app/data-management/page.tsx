"use client";

import React, { useRef, useState } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Progress,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  useDisclosure,
} from "@heroui/react";
import {
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import UserDataExport from "@/components/backup/UserDataExport";
import { useBackupManagement } from "@/hooks/useBackupApi";
import { downloadBlob, generateTimestampedFilename } from "@/lib/download-utils";
import { toast } from "sonner";

export default function DataManagementPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Use centralized backup management hook
  const { backupStatus, backupExport, backupImport, backupDelete } =
    useBackupManagement();
  const statusLoading = backupStatus.isLoading;
  const exporting = backupExport.isPending;
  const importing = backupImport.isPending;
  const deleting = backupDelete.isPending;
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleExportBackup = async () => {
    if (!user) {
      toast.error("Please log in to export backup");
      return;
    }

    try {
      const blob = await backupExport.mutateAsync();
      const filename = generateTimestampedFilename("supershop-backup", "json");
      downloadBlob(blob, filename);
      toast.success("Backup exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export backup. Please try again.");
    }
  };

  const handleImportBackup = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!user) {
      toast.error("Please log in to import backup");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("File size exceeds 100MB limit");
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
      toast.success("Backup restored successfully!");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Reload page to reflect changes
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import backup. Please try again.");
    } finally {
      setUploadProgress(0);
    }
  };

  const handleDeleteData = async () => {
    if (!user) {
      toast.error("Please log in to delete data");
      return;
    }

    try {
      await backupDelete.mutateAsync();
      toast.success("All shop data has been deleted.");
      setIsDeleteModalOpen(false);
      setDeleteConfirmText("");
    } catch (error) {
      console.error("Delete data error:", error);
      toast.error("Failed to delete data. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Data Management</h1>

      {/* Safety Notice */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Data Safety Important</h3>
            <p className="text-yellow-800 mb-2">
              Regular backups protect your data from loss. Always backup before:
            </p>
            <ul className="list-disc ml-5 mb-2 text-yellow-800">
              <li>Major system updates or migrations</li>
              <li>Database schema changes</li>
              <li>Bulk data operations</li>
              <li>System maintenance</li>
            </ul>
            <p className="text-yellow-800">
              See our{" "}
              <Link
                href="/docs/data-safety"
                className="text-yellow-700 underline hover:text-yellow-800"
              >
                Data Safety Guidelines
              </Link>{" "}
              for more information.
            </p>
          </div>
        </div>
      </div>

      {/* Backup Status Card */}
      {statusLoading ? (
        <div className="flex justify-center mb-6">
          <Spinner />
        </div>
      ) : backupStatus.data ? (
        <Card className="mb-6">
          <CardBody className="gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold">Current Data</h3>
              </div>
              <p className="text-gray-600 mb-3">
                A backup of your shop would currently include:
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li className="text-gray-700">{backupStatus.data.productCount} products</li>
                <li className="text-gray-700">{backupStatus.data.variantCount} product variants</li>
                <li className="text-gray-700">{backupStatus.data.inventoryCount} inventory items</li>
                <li className="text-gray-700">{backupStatus.data.saleCount} sales</li>
              </ul>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <hr className="my-6" />

      {/* Export Section */}
      <Card className="mb-6">
        <CardBody className="gap-4">
          <h2 className="text-xl font-bold">Export Full Backup</h2>
          <p className="text-gray-600">
            Download a backup of your shop&apos;s data as a JSON file. This
            includes your products, variants, inventory, sales, and short list.
          </p>
          <div>
            <Button
              color="primary"
              size="lg"
              startContent={<Download className="w-5 h-5" />}
              onPress={handleExportBackup}
              isLoading={exporting}
              isDisabled={exporting}
            >
              {exporting ? "Exporting Backup..." : "Download Full Backup"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Import Section */}
      <Card className="mb-6">
        <CardBody className="gap-4">
          <h2 className="text-xl font-bold">Restore From Backup</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-yellow-900">
              <strong>⚠️ Warning:</strong> Restoring will replace your shop&apos;s
              products, variants, inventory, sales, and short list with the data
              from the backup file. Make sure you have exported a current backup
              before proceeding! Only a JSON backup file exported from your own
              shop can be restored here.
            </p>
          </div>

          {importing && uploadProgress > 0 && (
            <div className="w-full">
              <p className="text-sm text-gray-600 mb-2">Upload Progress</p>
              <Progress
                value={Math.round(uploadProgress)}
                className="w-full"
              />
            </div>
          )}

          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json,application/json"
              className="hidden"
              disabled={importing}
            />
            <Button
              variant="bordered"
              size="lg"
              startContent={<Upload className="w-5 h-5" />}
              onPress={() => fileInputRef.current?.click()}
              isLoading={importing}
              isDisabled={importing}
            >
              {importing
                ? `Restoring... ${Math.round(uploadProgress)}%`
                : "Upload & Restore Backup"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Delete Data Section */}
      <Card className="mb-6">
        <CardBody className="gap-4">
          <h2 className="text-xl font-bold">Delete All Data</h2>
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-900">
              <strong>⚠️ Danger:</strong> This permanently deletes all of your
              shop&apos;s products, variants, inventory, sales, and short list.
              This cannot be undone. Export a backup first if you want to be able
              to restore this data later.
            </p>
          </div>
          <div>
            <Button
              color="danger"
              size="lg"
              startContent={<Trash2 className="w-5 h-5" />}
              onPress={() => setIsDeleteModalOpen(true)}
            >
              Delete All Data
            </Button>
          </div>
        </CardBody>
      </Card>

      <Modal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Delete all shop data?
              </ModalHeader>
              <ModalBody>
                <p className="mb-3">
                  This will permanently delete all products, variants, inventory,
                  sales, and short list entries for your shop. This action cannot be
                  undone.
                </p>
                <p className="mb-3">
                  Type <strong>DELETE</strong> to confirm.
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  isDisabled={deleting}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  onPress={onClose}
                  isDisabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={handleDeleteData}
                  isDisabled={deleteConfirmText !== "DELETE" || deleting}
                  isLoading={deleting}
                >
                  Delete Everything
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* User Data Export (SUPER_ADMIN only) */}
      {user?.role === "SUPER_ADMIN" && <UserDataExport />}

      {/* Info Section */}
      <Card className="mt-6 bg-blue-50">
        <CardBody className="gap-3">
          <h3 className="text-lg font-bold">Backup Best Practices</h3>
          <ul className="space-y-2 text-sm">
            <li className="text-gray-700">✓ Export backups regularly (at least weekly for production)</li>
            <li className="text-gray-700">✓ Store backups in a secure, separate location</li>
            <li className="text-gray-700">✓ Test restore procedures periodically</li>
            <li className="text-gray-700">✓ Always backup before system updates or migrations</li>
            <li className="text-gray-700">✓ Keep at least 3 versions of backups</li>
            <li className="text-gray-700">✓ Document your backup schedule and retention policy</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
