"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { Tenant } from "@/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editName, setEditName] = useState("");
  const [editStreet, setEditStreet] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editZone, setEditZone] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (editingTenant) {
      setEditName(editingTenant.name || "");
      setEditStreet(editingTenant.addressStreet || "");
      setEditCity(editingTenant.addressCity || "");
      setEditZone(editingTenant.addressZone || "");
    }
  }, [editingTenant]);

  async function fetchTenants() {
    setLoading(true);
    try {
      const { data } = await api.get("/tenants");
      setTenants(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const message = e?.response?.data?.message || "Failed to fetch tenants";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Create owner user (OWNER role)
      const { data: created } = await api.post("/auth/register", {
        email: ownerEmail,
        password: ownerPassword,
        fullName: ownerFullName,
        role: "OWNER",
      });

      // Create tenant with ownerId
      await api.post("/tenants", { name, ownerId: created.id });

      setName("");
      setOwnerEmail("");
      setOwnerFullName("");
      setOwnerPassword("");
      toast.success("Tenant created successfully!");
      fetchTenants();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || "Failed to create tenant");
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setEditLoading(true);
    setError(null);
    try {
      await api.patch(`/tenants/${editingTenant.id}`, {
        name: editName,
        addressStreet: editStreet,
        addressCity: editCity,
        addressZone: editZone,
      });
      setEditingTenant(null);
      fetchTenants();
      toast.success("Tenant updated successfully");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || "Failed to update tenant");
    } finally {
      setEditLoading(false);
    }
  };

  if (!user || user.role !== "SUPER_ADMIN") {
    return <div className="p-6 text-destructive font-semibold">Access denied — Super Admins only</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4 p-5 border-b border-border/60">
          <CardTitle className="text-lg font-semibold">Tenants (Super Admin)</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardHeader className="pb-4 p-5 border-b border-border/60">
              <CardTitle className="text-lg font-semibold">Registered Tenants</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : tenants.length > 0 ? (
                  tenants.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{record.id}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditingTenant(record)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No tenants registered.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </CardContent>
          </Card>

          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-bold mb-4">Create New Tenant</h3>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Tenant Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Pharmacy"
                  required
                />
              </div>

              <div className="border-t border-border my-6 pt-4">
                <h4 className="text-sm font-bold mb-3">Owner details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Owner Email</label>
                    <Input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Owner Full Name</label>
                    <Input
                      value={ownerFullName}
                      onChange={(e) => setOwnerFullName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Owner Password</label>
                    <Input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit">
                Create Tenant
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {editingTenant?.name}</DialogTitle>
          </DialogHeader>
          {editingTenant && (
            <form onSubmit={handleUpdateTenant} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Tenant Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Street</label>
                <Input
                  value={editStreet}
                  onChange={(e) => setEditStreet(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">City</label>
                <Input
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Zone</label>
                <Input
                  value={editZone}
                  onChange={(e) => setEditZone(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingTenant(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
