import { useState, useRef, useEffect, useMemo } from 'react';
import { Input, List, Card, Button, Typography, message, Empty } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../lib/api';
import useShortlistMutation from '../../hooks/useShortlist';
import debounce from 'lodash/debounce';

const { Text } = Typography;

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
          message.error('Search failed');
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
      message.success('Added to shortlist');
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
      <Input.Search
        placeholder="Search items to add to short list..."
        value={searchTerm}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        allowClear
        loading={loading}
        enterButton
      />

      {isOpen && (searchTerm.length >= 2 || results.length > 0) && (
        <Card
          className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl"
          styles={{ body: { padding: 0 } }}
        >
          <List
            loading={loading}
            dataSource={results}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No items found" /> }}
            renderItem={(item) => (
              <List.Item
                className="px-4 py-3 hover:bg-theme-muted transition-colors cursor-pointer"
                onClick={() => addMutation.mutate({ inventoryId: item.id, action: 'add' })}
                actions={[
                  <Button
                    key="add"
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      addMutation.mutate({ inventoryId: item.id, action: 'add' });
                    }}
                  >
                    Add
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={<Text strong>{item.itemName}</Text>}
                  description={
                    <Text type="secondary">
                      SKU: {item.variant?.sku || 'N/A'} • Qty: {item.quantity}
                    </Text>
                  }
                />

              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}

