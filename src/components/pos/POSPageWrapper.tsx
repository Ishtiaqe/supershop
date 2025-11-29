"use client";

import { useState, useEffect } from "react";
import { Result } from "antd";
import POSClient from "./POSClient";
import { Row, Col, Card, Input, Typography } from "antd";

export default function POSPageWrapper() {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [user, setUser] = useState<{ role?: string } | null | undefined>(undefined);

  // Guard for user role: OWNER or EMPLOYEE required
  useEffect(() => {
    const json = localStorage.getItem("user");
    if (!json) {
      setUser(null);
      return;
    }
    try {
      const u = JSON.parse(json);
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);
  // we already initialize user and load it above

  if (user === undefined) return <div className="p-6">Loading...</div>;

  if (!user || (user.role !== "OWNER" && user.role !== "EMPLOYEE")) {
    return <div className="p-6">Access denied — Owners and employees only</div>;
  }

  return (
    <Row gutter={16}>
      <Col xs={24} md={16}>
        <Card title="Sales Portal">
          <POSClient
            customerName={customerName}
            customerPhone={customerPhone}
            setCustomerName={setCustomerName}
            setCustomerPhone={setCustomerPhone}
          />
        </Card>
      </Col>

      <Col xs={24} md={8}>
        <Card title="Customer Details" size="small">
          <Typography.Text>Customer Name (Optional)</Typography.Text>
          <Input
            placeholder="Enter customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          <div style={{ marginTop: 12 }}>
            <Typography.Text>Customer Phone (Optional)</Typography.Text>
            <Input
              placeholder="Enter phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </Card>
      </Col>
    </Row>
  );
}
