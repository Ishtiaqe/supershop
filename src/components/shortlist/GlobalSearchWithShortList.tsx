import { useState, useRef, useEffect, useMemo } from 'react';
import { Input, Button, Card } from '@heroui/react';
import { Plus, Loader } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import useShortlistMutation from '../../hooks/useShortlist';
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
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search for items (debounced)
  const debouncedSearch = useMemo(
    () =>
      debounce(async (term: string) => {
        if (term.length < 2) {
          setResults([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const response = await api.get(`/api/v1/inventory?q=${term}`);
          setResults(response.data.slice(0, 10));
          setIsOpen(true);
        } catch (error) {
          console.error('Search failed:', error);
          toast.error('Search failed');
        } finally {
          setLoading(false);
        }
      }, 300),
    []
  );

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
  };

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const addMutation = useShortlistMutation({
    onSuccess: () => {
      toast.success('Added to shortlist');
      setSearchTerm('');
      setResults([]);
      setIsOpen(false);
    },
  });

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
    <div ref={searchRef} className="relative w-full">
      <Input
        isClearable
        placeholder="Search items to add to short list..."
        value={searchTerm}
        onValueChange={handleInputChange}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        onClear={() => {
          setSearchTerm('');
          setResults([]);
          setIsOpen(false);
        }}
        endContent={
          loading ? (
            <Loader className="w-4 h-4 animate-spin text-default-400" />
          ) : null
        }
        classNames={{
          input: 'text-sm',
          inputWrapper: 'h-10',
        }}
      />

      {isOpen && (searchTerm.length >= 2 || results.length > 0) && (
        <Card
          className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg"
          classNames={{
            base: 'border border-default-200',
          }}
        >
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-5 h-5 animate-spin text-default-400" />
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-default-400">No items found</p>
              </div>
            ) : (
              <ul className="divide-y divide-default-100">
                {results.map((item) => (
                  <li
                    key={item.id}
                    className="px-4 py-3 hover:bg-default-100 transition-colors cursor-pointer flex items-center justify-between gap-3"
                    onClick={() =>
                      addMutation.mutate({ inventoryId: item.id, action: 'add' })
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-default-900">
                        {item.itemName}
                      </p>
                      <p className="text-xs text-default-500">
                        SKU: {item.variant?.sku || 'N/A'} • Qty: {item.quantity}
                      </p>
                    </div>
                    <Button
                      isIconOnly
                      size="sm"
                      color="primary"
                      variant="flat"
                      onClick={(e) => {
                        e.stopPropagation();
                        addMutation.mutate({ inventoryId: item.id, action: 'add' });
                      }}
                      disabled={addMutation.isPending}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
