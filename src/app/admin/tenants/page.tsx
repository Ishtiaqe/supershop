"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Card,
  CardBody,
  CardHeader,
  Divider,
} from "@heroui/react";
import { Edit2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tenant } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";

// Zod schemas for validation
const createTenantSchema = z.object({
  tenantName: z.string().min(1, "Tenant name is required"),
  ownerEmail: z.string().email("Invalid email address"),
  ownerFullName: z.string().min(1, "Full name is required"),
  ownerPassword: z.string().min(8, "Password must be at least 8 characters"),
});

const editTenantSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressZone: z.string().optional(),
});

type CreateTenantFormData = z.infer<typeof createTenantSchema>;
type EditTenantFormData = z.infer<typeof editTenantSchema>;

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const { user } = useAuth();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onOpenChange: onEditOpenChange,
  } = useDisclosure();

  // Create tenant form
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: createErrors, isSubmitting: isCreatingSubmitting },
    reset: resetCreate,
  } = useForm<CreateTenantFormData>({
    resolver: zodResolver(createTenantSchema),
  });

  // Edit tenant form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors },
    reset: resetEdit,
  } = useForm<EditTenantFormData>({
    resolver: zodResolver(editTenantSchema),
    values: editingTenant
      ? {
          name: editingTenant.name,
          addressStreet: editingTenant.addressStreet || "",
          addressCity: editingTenant.addressCity || "",
          addressZone: editingTenant.addressZone || "",
        }
      : undefined,
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    setLoading(true);
    try {
      const { data } = await api.get("/tenants");
      setTenants(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const message = e?.response?.data?.message || "Failed to fetch tenants";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function onCreateTenant(data: CreateTenantFormData) {
    try {
      // Create owner user (OWNER role). Only super-admin should reach here.
      const { data: created } = await api.post("/auth/register", {
        email: data.ownerEmail,
        password: data.ownerPassword,
        fullName: data.ownerFullName,
        role: "OWNER",
      });

      // Create tenant with ownerId
      await api.post("/tenants", { name: data.tenantName, ownerId: created.id });

      resetCreate();
      onOpenChange();
      fetchTenants();
      toast.success("Tenant created successfully");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const message = e?.response?.data?.message || "Failed to create tenant";
      toast.error(message);
    }
  }

  async function onEditTenant(data: EditTenantFormData) {
    if (!editingTenant) return;

    setEditLoading(true);
    try {
      await api.patch(`/tenants/${editingTenant.id}`, data);
      setEditingTenant(null);
      onEditOpenChange();
      fetchTenants();
      toast.success("Tenant updated successfully");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const message = e?.response?.data?.message || "Failed to update tenant";
      toast.error(message);
    } finally {
      setEditLoading(false);
    }
  }

  function handleOpenEditModal(tenant: Tenant) {
    setEditingTenant(tenant);
    resetEdit();
    onEditOpen();
  }

  if (!user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          Access denied — Super Admins only
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <p className="text-lg font-semibold">Tenants (Super Admin)</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="gap-6">
          {/* Tenants Table */}
          <div>
            <Table
              isStriped
              aria-label="Tenants table"
              bottomContent={
                tenants.length > 0 ? (
                  <div className="flex w-full justify-center">
                    <span className="text-sm text-default-400">
                      Total {tenants.length} tenant{tenants.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ) : null
              }
            >
              <TableHeader>
                <TableColumn key="name">TENANT</TableColumn>
                <TableColumn key="id">ID</TableColumn>
                <TableColumn key="actions" align="center">
                  ACTIONS
                </TableColumn>
              </TableHeader>
              <TableBody
                items={tenants}
                isLoading={loading}
                loadingContent={
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading...
                  </div>
                }
                emptyContent={"No tenants found"}
              >
                {(item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-xs text-default-400">
                      {item.id}
                    </TableCell>
                    <TableCell className="flex justify-center">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleOpenEditModal(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Divider />

          {/* Create Tenant Form */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Create New Tenant</h3>
            <Button color="primary" onPress={onOpen}>
              Create Tenant
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Create Tenant Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Create New Tenant
              </ModalHeader>
              <form onSubmit={handleSubmitCreate(onCreateTenant)}>
                <ModalBody className="gap-4">
                  {/* Tenant Name */}
                  <div>
                    <Input
                      {...registerCreate("tenantName")}
                      label="Tenant Name"
                      placeholder="Enter tenant name"
                      isInvalid={!!createErrors.tenantName}
                      errorMessage={createErrors.tenantName?.message}
                    />
                  </div>

                  <Divider className="my-2" />

                  <div className="text-sm font-semibold text-default-600">
                    Owner Details
                  </div>

                  {/* Owner Email */}
                  <div>
                    <Input
                      {...registerCreate("ownerEmail")}
                      label="Owner Email"
                      placeholder="owner@example.com"
                      type="email"
                      isInvalid={!!createErrors.ownerEmail}
                      errorMessage={createErrors.ownerEmail?.message}
                    />
                  </div>

                  {/* Owner Full Name */}
                  <div>
                    <Input
                      {...registerCreate("ownerFullName")}
                      label="Owner Full Name"
                      placeholder="John Doe"
                      isInvalid={!!createErrors.ownerFullName}
                      errorMessage={createErrors.ownerFullName?.message}
                    />
                  </div>

                  {/* Owner Password */}
                  <div>
                    <Input
                      {...registerCreate("ownerPassword")}
                      label="Owner Password"
                      placeholder="Min 8 characters"
                      type="password"
                      isInvalid={!!createErrors.ownerPassword}
                      errorMessage={createErrors.ownerPassword?.message}
                    />
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="default" variant="light" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    type="submit"
                    isLoading={isCreatingSubmitting}
                  >
                    Create Tenant
                  </Button>
                </ModalFooter>
              </form>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal isOpen={isEditOpen} onOpenChange={onEditOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {editingTenant ? `Edit ${editingTenant.name}` : "Edit Tenant"}
              </ModalHeader>
              <form onSubmit={handleSubmitEdit(onEditTenant)}>
                <ModalBody className="gap-4">
                  {/* Tenant Name */}
                  <div>
                    <Input
                      {...registerEdit("name")}
                      label="Tenant Name"
                      placeholder="Enter tenant name"
                      isInvalid={!!editErrors.name}
                      errorMessage={editErrors.name?.message}
                    />
                  </div>

                  {/* Street */}
                  <div>
                    <Input
                      {...registerEdit("addressStreet")}
                      label="Street"
                      placeholder="Street address"
                      isInvalid={!!editErrors.addressStreet}
                      errorMessage={editErrors.addressStreet?.message}
                    />
                  </div>

                  {/* City */}
                  <div>
                    <Input
                      {...registerEdit("addressCity")}
                      label="City"
                      placeholder="City"
                      isInvalid={!!editErrors.addressCity}
                      errorMessage={editErrors.addressCity?.message}
                    />
                  </div>

                  {/* Zone */}
                  <div>
                    <Input
                      {...registerEdit("addressZone")}
                      label="Zone"
                      placeholder="Zone"
                      isInvalid={!!editErrors.addressZone}
                      errorMessage={editErrors.addressZone?.message}
                    />
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="default" variant="light" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    type="submit"
                    isLoading={editLoading}
                  >
                    Save Changes
                  </Button>
                </ModalFooter>
              </form>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
