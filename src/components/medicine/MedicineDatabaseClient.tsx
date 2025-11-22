"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, Input, Typography } from "antd";
import { offlineApi } from "@/lib/api-offline";
import { Medicine } from "@/types";

export default function MedicineDatabaseClient() {
  const [search, setSearch] = useState("");

  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ["medicines", search],
    queryFn: () => offlineApi.get<Medicine[]>("/medicine", { params: { search: search || undefined } }).then((res) => res.data),
  });

  const columns = [
    {
      title: "Brand Name",
      dataIndex: "brandName",
      key: "brandName",
    },
    {
      title: "Generic Name",
      dataIndex: "generic",
      key: "generic",
      render: (generic: Medicine['generic']) => generic?.genericName || "-",
    },
    {
      title: "Manufacturer",
      dataIndex: "manufacturer",
      key: "manufacturer",
      render: (manufacturer: Medicine['manufacturer']) => manufacturer?.manufacturerName || "-",
    },
    {
      title: "Strength",
      dataIndex: "strength",
      key: "strength",
      render: (strength: string) => strength || "-",
    },
    {
      title: "Dosage Form",
      dataIndex: "dosageForm",
      key: "dosageForm",
      render: (dosageForm: string) => dosageForm || "-",
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Medicine Database</Typography.Title>

      <Input
        placeholder="Search medicines..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, width: 300 }}
        allowClear
      />

      <Table
        dataSource={medicines}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        expandable={{
          expandedRowRender: (record: Medicine) => (
            <div>
              {record.generic?.indicationDescription && (
                <div>
                  <strong>Indication:</strong> {record.generic.indicationDescription}
                </div>
              )}
              {record.generic?.pharmacologyDescription && (
                <div>
                  <strong>Pharmacology:</strong> {record.generic.pharmacologyDescription}
                </div>
              )}
              {record.generic?.dosageDescription && (
                <div>
                  <strong>Dosage:</strong> {record.generic.dosageDescription}
                </div>
              )}
              {record.generic?.sideEffectsDescription && (
                <div>
                  <strong>Side Effects:</strong> {record.generic.sideEffectsDescription}
                </div>
              )}
            </div>
          ),
        }}
      />
    </div>
  );
}