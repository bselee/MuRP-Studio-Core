import { InventorySKU } from '../types';

// Mock Database
const MOCK_INVENTORY: InventorySKU[] = [
  { id: '1', sku: 'bev-001-org', name: 'Organic Orange Juice 16oz', category: 'Food', dimensions: '3x3x8 in', status: 'Active' },
  { id: '2', sku: 'snk-chips-bbq', name: 'BBQ Potato Chips', category: 'Food', dimensions: '6x2x9 in', status: 'Active' },
  { id: '3', sku: 'agri-fert-55', name: 'Nitrogen Fertilizer 50lb', category: 'Agriculture', dimensions: '20x5x30 in', status: 'Active' },
  { id: '4', sku: 'cos-face-crm', name: 'Night Repair Cream', category: 'Cosmetics', dimensions: '2x2x2 in', status: 'Draft' },
];

export const inventoryService = {
  searchSKUs: async (query: string): Promise<InventorySKU[]> => {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!query) return [];
    
    return MOCK_INVENTORY.filter(item => 
      item.sku.toLowerCase().includes(query.toLowerCase()) || 
      item.name.toLowerCase().includes(query.toLowerCase())
    );
  },

  getSKUById: async (id: string): Promise<InventorySKU | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_INVENTORY.find(item => item.id === id);
  },

  // Stub for syncing artwork back to the ERP
  syncArtworkToSKU: async (skuId: string, artworkUrl: string): Promise<boolean> => {
    console.log(`Syncing artwork to SKU ${skuId}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }
};