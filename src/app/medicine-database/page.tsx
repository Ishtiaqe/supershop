"use client";

import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { offlineApi } from "@/lib/api-offline";
import { Medicine } from "@/types";

export default function MedicineDatabasePage() {
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ["medicines", search],
    queryFn: () =>
      offlineApi
        .get<Medicine[]>("/medicine", { params: { search: search || undefined } })
        .then((res) => {
          setCurrentPage(1); // Reset page on new search
          return res.data;
        }),
  });

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  const totalCount = medicines.length;
  const paginatedMedicines = medicines.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      </div>

      <Card className="shadow-sm border-border/60 overflow-hidden">
          <CardHeader className="flex flex-col md:flex-row justify-between items-center gap-4 pb-4 p-5 border-b border-border/60">
            <CardTitle className="text-lg font-semibold">Medicines</CardTitle>
            <Input
              id="medicine-search"
              placeholder="Search medicines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80"
            />
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Brand Name</TableHead>
                <TableHead>Generic Name</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead>Dosage Form</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : paginatedMedicines.length > 0 ? (
                paginatedMedicines.map((record) => {
                  const isExpanded = expandedIds.has(record.id);
                  return (
                    <Fragment key={record.id}>
                      <TableRow
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleExpand(record.id)}
                      >
                        <TableCell className="w-10">
                          <div className="flex items-center justify-center h-6 w-6">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{record.brandName}</TableCell>
                        <TableCell>{record.generic?.genericName || "-"}</TableCell>
                        <TableCell>{record.manufacturer?.manufacturerName || "-"}</TableCell>
                        <TableCell>{record.strength || "-"}</TableCell>
                        <TableCell>{record.dosageForm || "-"}</TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={6} className="py-4 px-6 text-sm text-muted-foreground">
                            <div className="space-y-3">
                              {record.generic?.indicationDescription && (
                                <div>
                                  <strong className="text-foreground">Indication:</strong> {record.generic.indicationDescription}
                                </div>
                              )}
                              {record.generic?.pharmacologyDescription && (
                                <div>
                                  <strong className="text-foreground">Pharmacology:</strong> {record.generic.pharmacologyDescription}
                                </div>
                              )}
                              {record.generic?.dosageDescription && (
                                <div>
                                  <strong className="text-foreground">Dosage:</strong> {record.generic.dosageDescription}
                                </div>
                              )}
                              {record.generic?.sideEffectsDescription && (
                                <div>
                                  <strong className="text-foreground">Side Effects:</strong> {record.generic.sideEffectsDescription}
                                </div>
                              )}
                              {!record.generic?.indicationDescription &&
                                !record.generic?.pharmacologyDescription &&
                                !record.generic?.dosageDescription &&
                                !record.generic?.sideEffectsDescription && (
                                  <div>No detailed information available.</div>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No medicines found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalCount > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-card">
              <span className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to{" "}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} medicines
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}