"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Card,
  CardBody,
  Spinner,
} from "@heroui/react";
import { offlineApi } from "@/lib/api-offline";
import { Medicine } from "@/types";

export default function MedicineDatabaseClient() {
  const [search, setSearch] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ["medicines", search],
    queryFn: () =>
      offlineApi
        .get<Medicine[]>("/medicine", {
          params: { search: search || undefined },
        })
        .then((res) => res.data),
  });

  const filteredMedicines = useMemo(() => {
    if (!search) return medicines;
    const lowerSearch = search.toLowerCase();
    return medicines.filter(
      (med) =>
        med.brandName?.toLowerCase().includes(lowerSearch) ||
        med.generic?.genericName?.toLowerCase().includes(lowerSearch) ||
        med.manufacturer?.manufacturerName?.toLowerCase().includes(lowerSearch) ||
        med.strength?.toLowerCase().includes(lowerSearch) ||
        med.dosageForm?.toLowerCase().includes(lowerSearch)
    );
  }, [medicines, search]);

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Search Medicine</p>
            <Input
              placeholder="Search by brand name, generic name, manufacturer..."
              value={search}
              onValueChange={setSearch}
              isClearable
              className="max-w-sm"
            />
          </div>
          <p className="text-xs text-default-500">
            Found {filteredMedicines.length} medicine{filteredMedicines.length !== 1 ? "s" : ""}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <Table
            isStriped
            aria-label="Medicine database table"
            selectionMode="none"
            className="text-sm"
          >
            <TableHeader>
              <TableColumn key="brandName" width="20%">
                Brand Name
              </TableColumn>
              <TableColumn key="generic" width="20%">
                Generic Name
              </TableColumn>
              <TableColumn key="manufacturer" width="20%">
                Manufacturer
              </TableColumn>
              <TableColumn key="strength" width="15%">
                Strength
              </TableColumn>
              <TableColumn key="dosageForm" width="15%">
                Dosage Form
              </TableColumn>
              <TableColumn key="details" width="10%" align="center">
                Details
              </TableColumn>
            </TableHeader>
            <TableBody
              emptyContent="No medicines found"
              items={filteredMedicines}
              isLoading={isLoading}
              loadingContent={<Spinner color="primary" />}
            >
              {(medicine: Medicine) => (
                <>
                  <TableRow key={medicine.id}>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {medicine.brandName || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-default-600">
                        {medicine.generic?.genericName || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-default-600">
                        {medicine.manufacturer?.manufacturerName || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-default-600">{medicine.strength || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-default-600">{medicine.dosageForm || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() =>
                          setExpandedKey(expandedKey === medicine.id ? null : medicine.id)
                        }
                        className="text-primary hover:underline text-sm"
                      >
                        {expandedKey === medicine.id ? "Hide" : "Show"}
                      </button>
                    </TableCell>
                  </TableRow>

                  {expandedKey === medicine.id && (
                    <TableRow key={`${medicine.id}-details`} className="bg-default-50">
                      <TableCell colSpan={6}>
                        <div className="space-y-3 py-2 px-4">
                          {medicine.generic?.indicationDescription && (
                            <div>
                              <p className="font-semibold text-sm text-foreground mb-1">
                                Indication:
                              </p>
                              <p className="text-sm text-default-700">
                                {medicine.generic.indicationDescription}
                              </p>
                            </div>
                          )}
                          {medicine.generic?.pharmacologyDescription && (
                            <div>
                              <p className="font-semibold text-sm text-foreground mb-1">
                                Pharmacology:
                              </p>
                              <p className="text-sm text-default-700">
                                {medicine.generic.pharmacologyDescription}
                              </p>
                            </div>
                          )}
                          {medicine.generic?.dosageDescription && (
                            <div>
                              <p className="font-semibold text-sm text-foreground mb-1">
                                Dosage:
                              </p>
                              <p className="text-sm text-default-700">
                                {medicine.generic.dosageDescription}
                              </p>
                            </div>
                          )}
                          {medicine.generic?.sideEffectsDescription && (
                            <div>
                              <p className="font-semibold text-sm text-foreground mb-1">
                                Side Effects:
                              </p>
                              <p className="text-sm text-default-700">
                                {medicine.generic.sideEffectsDescription}
                              </p>
                            </div>
                          )}
                          {!medicine.generic?.indicationDescription &&
                            !medicine.generic?.pharmacologyDescription &&
                            !medicine.generic?.dosageDescription &&
                            !medicine.generic?.sideEffectsDescription && (
                              <p className="text-sm text-default-500 italic">
                                No additional details available
                              </p>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
