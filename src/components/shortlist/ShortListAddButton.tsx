import { useState } from 'react';
import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ShortListAddButtonProps {
  inventoryId: string;
  isInShortList?: boolean;
  onSuccess?: () => void;
}

export default function ShortListAddButton({
  inventoryId,
  isInShortList = false,
  onSuccess,
}: ShortListAddButtonProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (action: 'add' | 'remove') => {
      if (action === 'add') {
        await axios.post(`/api/v1/shortlist/add/${inventoryId}`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
      } else {
        await axios.delete(`/api/v1/shortlist/${inventoryId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shortlist'] });
      queryClient.invalidateQueries({ queryKey: ['shortlist-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      onSuccess?.();
    },
  });

  return (
    <button
      onClick={() => mutation.mutate(isInShortList ? 'remove' : 'add')}
      disabled={mutation.isPending}
      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
        isInShortList
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      } ${mutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isInShortList ? (
        <>
          <span className="mr-1">✓</span>
          In Short List
        </>
      ) : (
        <>
          <span className="mr-1">+</span>
          Add to Short List
        </>
      )}
    </button>
  );
}
