const { offlineDb } = require('./src/lib/offline-db');

async function testOfflineMedicine() {
  console.log('Testing offline medicine database functionality...');

  try {
    // Initialize the database
    await offlineDb.init();

    // Add some test medicine data
    const testMedicines = [
      {
        id: 'med1',
        brandName: 'Napa',
        type: 'tablet',
        slug: 'napa',
        dosageForm: 'Tablet',
        strength: '500mg',
        generic: {
          id: 'gen1',
          genericName: 'Paracetamol',
          indicationDescription: 'Pain relief',
          pharmacologyDescription: 'NSAID',
          dosageDescription: '500mg every 6 hours',
          sideEffectsDescription: 'Nausea, dizziness'
        },
        manufacturer: {
          id: 'man1',
          manufacturerName: 'Beximco Pharmaceuticals'
        },
        _lastModified: Date.now(),
        _syncStatus: 'synced'
      },
      {
        id: 'med2',
        brandName: 'Ace',
        type: 'tablet',
        slug: 'ace',
        dosageForm: 'Tablet',
        strength: '100mg',
        generic: {
          id: 'gen2',
          genericName: 'Aceclofenac',
          indicationDescription: 'Anti-inflammatory',
          pharmacologyDescription: 'NSAID',
          dosageDescription: '100mg twice daily',
          sideEffectsDescription: 'Stomach upset'
        },
        manufacturer: {
          id: 'man2',
          manufacturerName: 'Square Pharmaceuticals'
        },
        _lastModified: Date.now(),
        _syncStatus: 'synced'
      }
    ];

    // Add medicines to database
    for (const medicine of testMedicines) {
      await offlineDb.putMedicine(medicine);
    }

    console.log('Added test medicine data to IndexedDB');

    // Test search functionality
    console.log('\nTesting search for "Napa":');
    const napaResults = await offlineDb.getAllMedicines('Napa');
    console.log('Results:', napaResults.map(m => ({ brandName: m.brandName, genericName: m.generic?.genericName })));

    console.log('\nTesting search for "paracetamol":');
    const paracetamolResults = await offlineDb.getAllMedicines('paracetamol');
    console.log('Results:', paracetamolResults.map(m => ({ brandName: m.brandName, genericName: m.generic?.genericName })));

    console.log('\nTesting search for "ace":');
    const aceResults = await offlineDb.getAllMedicines('ace');
    console.log('Results:', aceResults.map(m => ({ brandName: m.brandName, genericName: m.generic?.genericName })));

    console.log('\nTesting get all medicines (no search):');
    const allMedicines = await offlineDb.getAllMedicines();
    console.log('Total medicines:', allMedicines.length);
    console.log('Medicines:', allMedicines.map(m => ({ brandName: m.brandName, genericName: m.generic?.genericName })));

    console.log('\nOffline medicine database test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testOfflineMedicine();