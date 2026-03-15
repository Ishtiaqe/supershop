"use client";

import { useState, useCallback, useRef } from "react";

import POSClient from "./POSClient";
import { Row, Col, Card, Input, Typography } from "antd";
import { useAuth } from "@/components/auth/AuthProvider";

export default function POSPageWrapper() {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const customerNameRef = useRef("");
  const customerPhoneRef = useRef("");
  const { user, loading } = useAuth();

  const getCustomerDetails = useCallback(
    () => ({
      customerName: customerNameRef.current,
      customerPhone: customerPhoneRef.current,
    }),
    [],
  );

  const clearCustomerDetails = useCallback(() => {
    customerNameRef.current = "";
    customerPhoneRef.current = "";
    setCustomerName("");
    setCustomerPhone("");
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  return (
    <Row gutter={16}>
      <Col xs={24} md={16}>
        <Card>
          <POSClient
            getCustomerDetails={getCustomerDetails}
            clearCustomerDetails={clearCustomerDetails}
          />
        </Card>
      </Col>

      <Col xs={24} md={8}>
        <Card title="Customer Details" size="small">
          <Typography.Text>Customer Name (Optional)</Typography.Text>
          <Input
            placeholder="Enter customer name"
            value={customerName}
            onChange={(e) => {
              const value = e.target.value;
              customerNameRef.current = value;
              setCustomerName(value);
            }}
          />

          <div style={{ marginTop: 12 }}>
            <Typography.Text>Customer Phone (Optional)</Typography.Text>
            <Input
              placeholder="Enter phone number"
              value={customerPhone}
              onChange={(e) => {
                const value = e.target.value;
                customerPhoneRef.current = value;
                setCustomerPhone(value);
              }}
            />
          </div>
        </Card>
      </Col>
    </Row>
  );
}
