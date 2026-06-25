'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import useShortlistMutation from '../../hooks/useShortlist';
import debounce from 'lodash/debounce';

// Import shadcn UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

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
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items to add to short list..."
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="pl-9 pr-10"
        />
        {loading && (
          <div className="absolute right-3 top-3.5">
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {isOpen && (searchTerm.length >= 2 || results.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl overflow-hidden bg-popover text-popover-foreground">
          <CardContent className="p-0 max-h-60 overflow-y-auto">
            {results.length > 0 ? (
              <div className="divide-y divide-border text-sm">
                {results.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => addMutation.mutate({ inventoryId: item.id, action: 'add' })}
                  >
                    <div>
                      <div className="font-semibold text-foreground">{item.itemName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        SKU: {item.variant?.sku || 'N/A'} • Qty: {item.quantity}
                      </div>
                    </div>
                    <Button
                      key="add"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addMutation.mutate({ inventoryId: item.id, action: 'add' });
                      }}
                      className="h-8"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No items found
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
