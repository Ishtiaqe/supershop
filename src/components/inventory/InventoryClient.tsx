"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InventoryItem } from "@/types";
import api from "@/lib/api";
import {
  Table,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Typography,
  Modal,
  message,
} from "antd";

function fetchInventory(): Promise<InventoryItem[]> {
  return api.get("/inventory").then((r) => r.data);
}

export default function InventoryClient() {
  const queryClient = useQueryClient();
  const [addFormInstance] = Form.useForm();
  const { data: items = [], isLoading } = useQuery<InventoryItem[], Error>({
    queryKey: ["inventory"],
    queryFn: fetchInventory,
  });
  const [editForm, setEditForm] = useState<{
    id?: string;
    itemName: string;
    quantity: number;
    purchasePrice: number;
    retailPrice: number;
    // maxDiscount?: number;
  }>({
    id: undefined,
    itemName: "",
    quantity: 0,
    purchasePrice: 0,
    retailPrice: 0,
    // maxDiscount: undefined,
  });
  const [modalOpen, setModalOpen] = useState(false);

  const addMutation = useMutation<InventoryItem, Error, Partial<InventoryItem>>(
    {
      mutationFn: (payload: Partial<InventoryItem>) =>
        api.post("/inventory", payload).then((r) => r.data),
      async onSuccess() {
        await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      },
    }
  );

  const submitAdd = async () => {
    const values = addFormInstance.getFieldsValue();
    // ensure maxDiscount is not greater than computed max
    const computed = computeMaxDiscount(
      values.purchasePrice,
      values.retailPrice
    );
    if (
      typeof values.maxDiscount === "number" &&
      values.maxDiscount > computed
    ) {
      values.maxDiscount = computed;
    }
    await addMutation.mutateAsync(values);
    addFormInstance.resetFields();
    message.success("Item added successfully");
  };

  const submitEdit = async () => {
    if (!editForm.id) return;
    // enforce maxDiscount <= computed max before submitting
    // const computed = computeMaxDiscount(
    //   editForm.purchasePrice,
    //   editForm.retailPrice
    // );
    const payload = {
      id: editForm.id,
      ...editForm,
      // maxDiscount: Math.min(editForm.maxDiscount ?? computed, computed),
    };
    await updateMutation.mutateAsync(payload);
  };

  const handleDelete = async () => {
    if (!editForm.id) return;
    Modal.confirm({
      title: "Delete Item",
      content: "Are you sure you want to delete this item?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        await deleteMutation.mutateAsync(editForm.id!);
      },
    });
  };

  const updateMutation = useMutation<
    InventoryItem,
    Error,
    Partial<InventoryItem>
  >({
    mutationFn: (payload: Partial<InventoryItem>) =>
      api.put(`/inventory/${payload.id}`, payload).then((r) => r.data),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      message.success("Item updated successfully");
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id: string) =>
      api.delete(`/inventory/${id}`).then((r) => r.data),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      message.success("Item deleted successfully");
      setModalOpen(false);
      setEditForm({
        id: undefined,
        itemName: "",
        quantity: 0,
        purchasePrice: 0,
        retailPrice: 0,
        // maxDiscount: undefined,
      });
    },
  });

  function computeMaxDiscount(purchasePrice?: number, retailPrice?: number) {
    const p = Number(purchasePrice ?? 0);
    const r = Number(retailPrice ?? 0);
    if (!r || r <= 0) return 0;
    const discount = ((r - p) / r) * 100;
    return Number.isFinite(discount)
      ? Math.max(0, Math.floor(discount))
      : 0;
  }

  const userJson =
    typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userJson ? JSON.parse(userJson) : null;

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  return (
    <>
      <Form
        form={addFormInstance}
        layout="vertical"
        onFinish={submitAdd}
        className="mb-6"
        onValuesChange={(changedValues, allValues) => {
          if (
            "purchasePrice" in changedValues ||
            "retailPrice" in changedValues
          ) {
            const computed = computeMaxDiscount(
              allValues.purchasePrice,
              allValues.retailPrice
            );
            addFormInstance.setFieldsValue({ maxDiscount: computed });
          }
        }}
      >
        <Form.Item
          name="itemName"
          label="Item name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Space size={8} className="mb-2">
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} />
          </Form.Item>

          <Form.Item
            name="purchasePrice"
            label="Purchase/unit"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} />
          </Form.Item>

          <Form.Item
            name="retailPrice"
            label="Retail/unit"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} />
          </Form.Item>
          {/* <Form.Item
            name="maxDiscount"
            label="Max Discount (%)"
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const pp = getFieldValue("purchasePrice");
                  const rp = getFieldValue("retailPrice");
                  const computed = computeMaxDiscount(pp, rp);
                  if (value == null) return Promise.resolve();
                  if (value <= computed) return Promise.resolve();
                  return Promise.reject(
                    new Error(`Max discount cannot exceed ${computed}%`)
                  );
                },
              }),
            ]}
          >
            <InputNumber
              min={0}
              max={100}
              formatter={(v) => `${v}%`}
              parser={(v: string | undefined) => parseFloat((v || '').replace('%', '')) || 0}
            /> */}
          {/* </Form.Item> */}
        </Space>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={addMutation.isPending}
            >
              Add Item
            </Button>
            {/* <Button onClick={() => addFormInstance.resetFields()}>Clear</Button> */}
          </Space>
        </Form.Item>
      </Form>

      <Typography.Title level={4}>Items</Typography.Title>

      {isLoading ? (
        <div>Loading…</div>
      ) : (
        <Table dataSource={items} rowKey="id" pagination={false}>
          <Table.Column
            title="Actions"
            key="actions"
            render={(_, record: InventoryItem) => (
              <Button
                onClick={() => {
                  setEditForm({
                    id: record.id,
                    itemName: record.itemName || "",
                    quantity: record.quantity || 0,
                    purchasePrice: record.purchasePrice || 0,
                    retailPrice: record.retailPrice || 0,
                  });
                  setModalOpen(true);
                }}
              >
                Edit
              </Button>
            )}
          />
          <Table.Column
            title="Item Name"
            dataIndex="itemName"
            key="itemName"
            render={(text, record: InventoryItem) =>
              text || record.variantId || "Unnamed item"
            }
          />
          <Table.Column title="Quantity" dataIndex="quantity" key="quantity" />
          <Table.Column
            title="Purchase/unit"
            dataIndex="purchasePrice"
            key="purchasePrice"
            render={(v: number) => `৳${v}`}
          />
          <Table.Column
            title="Retail/unit"
            dataIndex="retailPrice"
            key="retailPrice"
            render={(v: number) => `৳${v}`}
          />
          {/* <Table.Column
            title="Max Discount (%)"
            key="maxDiscount"
            render={(_, record: InventoryItem) => {
              if (record.purchasePrice && record.retailPrice) {
                const discount =
                  ((record.retailPrice - record.purchasePrice) /
                    record.retailPrice) *
                  100;
                return discount.toFixed(2);
              }
              return 100;
            }}
          /> */}
        </Table>
      )}

      <Modal
        title="Edit Inventory Item"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditForm({
            id: undefined,
            itemName: "",
            quantity: 0,
            purchasePrice: 0,
            retailPrice: 0,
          });
        }}
        footer={null}
      >
        <Form layout="vertical" onFinish={submitEdit} className="mt-4">
          <Form.Item
            name="itemName"
            label="Item name"
            rules={[{ required: true }]}
            initialValue={editForm.itemName}
          >
            <Input
              value={editForm.itemName}
              onChange={(e) =>
                setEditForm({ ...editForm, itemName: e.target.value })
              }
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true }]}
            initialValue={editForm.quantity}
          >
            <InputNumber
              min={1}
              value={editForm.quantity}
              onChange={(value) =>
                setEditForm({ ...editForm, quantity: Number(value) })
              }
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item
            name="purchasePrice"
            label="Purchase Price"
            rules={[{ required: true }]}
            initialValue={editForm.purchasePrice}
          >
            <InputNumber
              min={0}
              value={editForm.purchasePrice}
              onChange={(value) =>
                setEditForm({ ...editForm, purchasePrice: Number(value) })
              }
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item
            name="retailPrice"
            label="Retail Price"
            rules={[{ required: true }]}
            initialValue={editForm.retailPrice}
          >
            <InputNumber
              min={0}
              value={editForm.retailPrice}
              onChange={(value) =>
                setEditForm({ ...editForm, retailPrice: Number(value) })
              }
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateMutation.isPending}
              >
                Update Item
              </Button>
              <Button
                danger
                onClick={handleDelete}
                loading={deleteMutation.isPending}
              >
                Delete Item
              </Button>
              <Button
                onClick={() => {
                  setModalOpen(false);
                  setEditForm({
                    id: undefined,
                    itemName: "",
                    quantity: 0,
                    purchasePrice: 0,
                    retailPrice: 0,
                  });
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
