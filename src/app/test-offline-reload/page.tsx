"use client";

import { useState } from "react";
import { Button, Card, Typography, Space, Alert, Spin } from "antd";
import { offlineApi } from "@/lib/api-offline";
import { offlineDb } from "@/lib/offline-db";
import { Medicine } from "@/types";

const { Title, Text } = Typography;

export default function OfflineReloadTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [medicineData, setMedicineData] = useState<Medicine[]>([]);

  const addResult = (message: string) => {
    setTestResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const runOfflineReloadTest = async () => {
    setIsTesting(true);
    setTestResults([]);

    try {
      addResult("🚀 Starting offline reload test...");

      // Step 0: Reset database to ensure clean state
      addResult("🔄 Resetting IndexedDB...");
      await offlineDb.resetDatabase();
      addResult("✅ Database reset complete");

      // Step 1: Initialize IndexedDB
      addResult("📦 Initializing IndexedDB...");
      await offlineDb.init();
      addResult("✅ IndexedDB initialized");

      // Step 2: Add test medicine data to IndexedDB
      addResult("💊 Adding test medicine data to IndexedDB...");
      const testMedicines = [
        {
          id: "test-med1",
          brandId: 1,
          brandName: "TestNapa",
          type: "tablet",
          slug: "test-napa",
          dosageForm: "Tablet",
          strength: "500mg",
          packageContainer: "Blister",
          packSizeInfo: "10 tablets",
          genericId: "test-gen1",
          manufacturerId: "test-man1",
          generic: {
            id: "test-gen1",
            genericId: 1,
            genericName: "TestParacetamol",
            slug: "test-paracetamol",
            indicationDescription: "Test pain relief",
            pharmacologyDescription: "Test NSAID",
            dosageDescription: "Test 500mg every 6 hours",
            sideEffectsDescription: "Test nausea, dizziness",
            descriptionsCount: 4,
          },
          manufacturer: {
            id: "test-man1",
            manufacturerId: 1,
            manufacturerName: "TestBeximco",
            slug: "test-beximco",
            genericsCount: 100,
            brandNamesCount: 200,
          },
          _lastModified: Date.now(),
          _syncStatus: "synced" as const,
        },
        {
          id: "test-med2",
          brandId: 2,
          brandName: "TestAce",
          type: "tablet",
          slug: "test-ace",
          dosageForm: "Tablet",
          strength: "100mg",
          packageContainer: "Blister",
          packSizeInfo: "20 tablets",
          genericId: "test-gen2",
          manufacturerId: "test-man2",
          generic: {
            id: "test-gen2",
            genericId: 2,
            genericName: "TestAceclofenac",
            slug: "test-aceclofenac",
            indicationDescription: "Test anti-inflammatory",
            pharmacologyDescription: "Test NSAID",
            dosageDescription: "Test 100mg twice daily",
            sideEffectsDescription: "Test stomach upset",
            descriptionsCount: 4,
          },
          manufacturer: {
            id: "test-man2",
            manufacturerId: 2,
            manufacturerName: "TestSquare",
            slug: "test-square",
            genericsCount: 150,
            brandNamesCount: 300,
          },
          _lastModified: Date.now(),
          _syncStatus: "synced" as const,
        },
      ];

      for (const medicine of testMedicines) {
        await offlineDb.putMedicine(medicine);
      }
      addResult("✅ Test medicine data added to IndexedDB");

      // Step 3: Test offline API call (simulating offline mode)
      addResult("🔌 Testing offline API call (simulating offline mode)...");

      // Mock navigator.onLine to false to simulate offline
      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, "onLine", {
        value: false,
        configurable: true,
      });

      try {
        // Test medicine search API
        addResult("🔍 Testing medicine search API offline...");
        const searchResponse = await offlineApi.get<Medicine[]>("/medicine", {
          params: { search: "TestNapa" },
        });
        const searchResults = searchResponse.data;
        addResult(
          `✅ Search for "TestNapa" returned ${searchResults.length} results`
        );

        // Test get all medicines
        addResult("📋 Testing get all medicines offline...");
        const allResponse = await offlineApi.get<Medicine[]>("/medicine");
        const allMedicines = allResponse.data;
        setMedicineData(allMedicines);
        addResult(
          `✅ Get all medicines returned ${allMedicines.length} medicines`
        );

        // Test search for generic
        addResult("🔍 Testing search for generic name offline...");
        const genericResponse = await offlineApi.get<Medicine[]>("/medicine", {
          params: { search: "paracetamol" },
        });
        const genericResults = genericResponse.data;
        addResult(
          `✅ Search for "paracetamol" returned ${genericResults.length} results`
        );
      } finally {
        // Restore original navigator.onLine
        Object.defineProperty(navigator, "onLine", {
          value: originalOnLine,
          configurable: true,
        });
      }

      addResult("✅ Offline API tests completed successfully");

      // Step 4: Instructions for manual testing
      addResult("📋 MANUAL TEST INSTRUCTIONS:");
      addResult("1. Open browser DevTools (F12)");
      addResult("2. Go to Network tab and set to &quot;Offline&quot;");
      addResult("3. Reload this page (Ctrl+R or Cmd+R)");
      addResult("4. Check if the page loads and shows medicine data");
      addResult("5. Test the medicine-database page: /dashboard/medicine-database");
      addResult("6. Verify search functionality works offline");

      addResult(
        "🎉 Offline reload test completed! Page should work offline now."
      );
    } catch (error) {
      addResult(`❌ Test failed: ${error}`);
      console.error("Offline test error:", error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <Title level={2}>Offline Page Reload Test</Title>

      <Space
        direction="vertical"
        style={{ width: "100%", marginBottom: "24px" }}
      >
        <Card title="Test Controls" size="small">
          <Space>
            <Button
              type="primary"
              onClick={runOfflineReloadTest}
              loading={isTesting}
              disabled={isTesting}
            >
              {isTesting ? "Running Test..." : "Run Offline Test"}
            </Button>

            <Button
              danger
              onClick={async () => {
                try {
                  addResult("🔄 Resetting database...");
                  await offlineDb.resetDatabase();
                  addResult("✅ Database reset successfully");
                  setMedicineData([]);
                } catch (error) {
                  addResult(`❌ Database reset failed: ${error}`);
                }
              }}
              disabled={isTesting}
            >
              Reset Database
            </Button>

            <Button
              onClick={() => window.location.reload()}
              disabled={isTesting}
            >
              Reload Page (Test Offline)
            </Button>
          </Space>
        </Card>

        <Alert
          message="Offline Testing Instructions"
          description={
            <div>
              <p>
                <strong>Step 1:</strong> Click &quot;Run Offline Test&quot; to populate
                IndexedDB with test data
              </p>
              <p>
                <strong>Step 2:</strong> Open browser DevTools (F12) → Network
                tab → Check &quot;Offline&quot;
              </p>
              <p>
                <strong>Step 3:</strong> Click &quot;Reload Page&quot; or press Ctrl+R
              </p>
              <p>
                <strong>Step 4:</strong> Verify the page loads and shows
                medicine data below
              </p>
              <p>
                <strong>Step 5:</strong> Test the medicine database page at
                /dashboard/medicine-database
              </p>
            </div>
          }
          type="info"
          showIcon
        />

        {medicineData.length > 0 && (
          <Card title="Medicine Data from IndexedDB" size="small">
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {medicineData.map((medicine, index) => (
                  <div
                    key={medicine.id}
                    style={{
                      marginBottom: "12px",
                      padding: "8px",
                      border: `1px solid hsl(var(--border))`,
                      borderRadius: "4px",
                    }}
                  >
                  <Text strong>
                    {index + 1}. {medicine.brandName}
                  </Text>
                  <br />
                  <Text type="secondary">
                    Generic: {medicine.generic?.genericName}
                  </Text>
                  <br />
                  <Text type="secondary">
                    Manufacturer: {medicine.manufacturer?.manufacturerName}
                  </Text>
                  <br />
                  <Text type="secondary">
                    Strength: {medicine.strength} | Form: {medicine.dosageForm}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card title="Test Results" size="small">
            <div
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: "12px",
              backgroundColor: "hsl(var(--muted))",
              padding: "12px",
              borderRadius: "4px",
            }}
          >
            {testResults.length === 0 ? (
              <Text type="secondary">
                No test results yet. Click &quot;Run Offline Test&quot; to start.
              </Text>
            ) : (
              testResults.map((result, index) => (
                <div key={index} style={{ marginBottom: "4px" }}>
                  {result}
                </div>
              ))
            )}
            {isTesting && (
              <div style={{ marginTop: "12px" }}>
                <Spin size="small" /> Running tests...
              </div>
            )}
          </div>
        </Card>
      </Space>
    </div>
  );
}
