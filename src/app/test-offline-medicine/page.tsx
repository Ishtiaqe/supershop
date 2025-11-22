"use client";

import { useState } from 'react';
import { offlineDb } from '@/lib/offline-db';

export default function TestOfflineMedicine() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTest = async () => {
    setLoading(true);
    setResults([]);

    try {
      addLog('Initializing offline database...');
      await offlineDb.init();
      addLog('Database initialized successfully');

      // Add test medicine data
      const testMedicines = [
        {
          id: 'med1',
          brandId: 1,
          brandName: 'Napa',
          type: 'tablet',
          slug: 'napa',
          dosageForm: 'Tablet',
          strength: '500mg',
          packageContainer: 'Blister',
          packSizeInfo: '10 tablets',
          genericId: 'gen1',
          manufacturerId: 'man1',
          generic: {
            id: 'gen1',
            genericId: 1,
            genericName: 'Paracetamol',
            slug: 'paracetamol',
            indicationDescription: 'Pain relief',
            pharmacologyDescription: 'NSAID',
            dosageDescription: '500mg every 6 hours',
            sideEffectsDescription: 'Nausea, dizziness',
            descriptionsCount: 4
          },
          manufacturer: {
            id: 'man1',
            manufacturerId: 1,
            manufacturerName: 'Beximco Pharmaceuticals',
            slug: 'beximco-pharmaceuticals',
            genericsCount: 100,
            brandNamesCount: 200
          },
          _lastModified: Date.now(),
          _syncStatus: 'synced' as const
        },
        {
          id: 'med2',
          brandId: 2,
          brandName: 'Ace',
          type: 'tablet',
          slug: 'ace',
          dosageForm: 'Tablet',
          strength: '100mg',
          packageContainer: 'Blister',
          packSizeInfo: '20 tablets',
          genericId: 'gen2',
          manufacturerId: 'man2',
          generic: {
            id: 'gen2',
            genericId: 2,
            genericName: 'Aceclofenac',
            slug: 'aceclofenac',
            indicationDescription: 'Anti-inflammatory',
            pharmacologyDescription: 'NSAID',
            dosageDescription: '100mg twice daily',
            sideEffectsDescription: 'Stomach upset',
            descriptionsCount: 4
          },
          manufacturer: {
            id: 'man2',
            manufacturerId: 2,
            manufacturerName: 'Square Pharmaceuticals',
            slug: 'square-pharmaceuticals',
            genericsCount: 150,
            brandNamesCount: 300
          },
          _lastModified: Date.now(),
          _syncStatus: 'synced' as const
        }
      ];

      addLog('Adding test medicine data...');
      for (const medicine of testMedicines) {
        await offlineDb.putMedicine(medicine);
      }
      addLog('Test medicine data added successfully');

      // Test search functionality
      addLog('Testing search for "Napa"...');
      const napaResults = await offlineDb.getAllMedicines('Napa');
      addLog(`Found ${napaResults.length} results: ${napaResults.map(m => m.brandName).join(', ')}`);

      addLog('Testing search for "paracetamol"...');
      const paracetamolResults = await offlineDb.getAllMedicines('paracetamol');
      addLog(`Found ${paracetamolResults.length} results: ${paracetamolResults.map(m => m.brandName).join(', ')}`);

      addLog('Testing search for "ace"...');
      const aceResults = await offlineDb.getAllMedicines('ace');
      addLog(`Found ${aceResults.length} results: ${aceResults.map(m => m.brandName).join(', ')}`);

      addLog('Testing get all medicines (no search)...');
      const allMedicines = await offlineDb.getAllMedicines();
      addLog(`Total medicines in database: ${allMedicines.length}`);

      addLog('Offline medicine database test completed successfully!');

    } catch (error) {
      addLog(`Test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Test Offline Medicine Database</h1>
      <button
        onClick={runTest}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Running Test...' : 'Run Test'}
      </button>

      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '10px',
        borderRadius: '4px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {results.map((result, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            {result}
          </div>
        ))}
      </div>
    </div>
  );
}