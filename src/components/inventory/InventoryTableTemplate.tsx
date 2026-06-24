'use client';

import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Button,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Spinner,
} from '@heroui/react';
import { Edit, Trash2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  price: number;
}

interface InventoryTableTemplateProps {
  data: InventoryItem[] | null;
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onSearch: (value: string) => void;
}

export default function InventoryTableTemplate({
  data,
  isLoading,
  onDelete,
  onSearch,
}: InventoryTableTemplateProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success('Item deleted successfully');
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearch(value);
  };

  return (
    <div className="surface-card rounded-lg p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Inventory Management</h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search items..."
            value={searchValue}
            onValueChange={handleSearchChange}
            isClearable
            startContent={<Search size={16} className="text-default-400" />}
            variant="bordered"
            size="sm"
            className="w-full sm:w-64"
          />
          <Button color="primary" size="sm" startContent={<Plus size={16} />}>
            Add Item
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table
          aria-label="Inventory items table"
          classNames={{ wrapper: 'shadow-none border border-default-200' }}
        >
          <TableHeader>
            <TableColumn key="name">Item Name</TableColumn>
            <TableColumn key="stock" align="end">Stock</TableColumn>
            <TableColumn key="price" align="end">Price</TableColumn>
            <TableColumn key="actions" align="center" width={120}>
              Actions
            </TableColumn>
          </TableHeader>
          <TableBody
            items={data ?? []}
            isLoading={isLoading}
            loadingContent={<Spinner />}
            emptyContent={
              <div className="py-8 text-center text-default-400">
                No inventory items found.
              </div>
            }
          >
            {(record) => (
              <TableRow key={record.id}>
                <TableCell>{record.name}</TableCell>
                <TableCell className="text-right">{record.stock}</TableCell>
                <TableCell className="text-right">
                  ${record.price.toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      aria-label="Edit item"
                    >
                      <Edit size={16} />
                    </Button>

                    <Popover placement="left">
                      <PopoverTrigger>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="text-danger"
                          isLoading={deletingId === record.id}
                          aria-label="Delete item"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72">
                        <div className="px-1 py-2 space-y-3">
                          <p className="font-semibold text-sm">Delete inventory item?</p>
                          <p className="text-sm text-default-500">
                            Are you sure you want to delete{' '}
                            <span className="font-medium">{record.name}</span>?
                            This action cannot be undone.
                          </p>
                          <div className="flex gap-2 justify-end">
                            <PopoverTrigger>
                              <Button size="sm" variant="bordered">
                                Cancel
                              </Button>
                            </PopoverTrigger>
                            <Button
                              size="sm"
                              color="danger"
                              isLoading={deletingId === record.id}
                              onPress={() => handleDelete(record.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
