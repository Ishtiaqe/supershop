import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import debounce from 'lodash/debounce';

interface SearchItem {
  id: string;
  itemName: string;
  quantity: number;
  variant?: {
    sku: string;
  };
}

export default function GlobalSearchWithShortList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Search for items
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (term.length < 2) {
        setResults([]);
        return;
      }

      try {
        const response = await axios.get(`/api/v1/inventory?q=${term}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setResults(response.data.slice(0, 10));
        setIsOpen(true);
      } catch (error) {
        console.error('Search failed:', error);
      }
    }, 300),
    []
  );

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setSelectedIndex(-1);
    debouncedSearch(value);
  };

  // Add to short list
  const addMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      await axios.post(`/api/v1/shortlist/add/${inventoryId}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shortlist'] });
      setSearchTerm('');
      setResults([]);
      setIsOpen(false);
    },
  });

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          addMutation.mutate(results[selectedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative">
      <input
        type="text"
        placeholder="Search items to add to short list..."
        value={searchTerm}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
      />

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((item, index) => (
            <div
              key={item.id}
              onClick={() => addMutation.mutate(item.id)}
              className={`px-4 py-3 cursor-pointer flex justify-between items-center ${
                index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              } border-b last:border-b-0`}
            >
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">{item.itemName}</div>
                <div className="text-xs text-gray-500">
                  SKU: {item.variant?.sku || 'N/A'} • Qty: {item.quantity}
                </div>
              </div>
              <button className="ml-4 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                + Add
              </button>
            </div>
          ))}
        </div>
      )}

      {isOpen && searchTerm.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 text-center text-sm text-gray-500">
          No items found
        </div>
      )}
    </div>
  );
}
