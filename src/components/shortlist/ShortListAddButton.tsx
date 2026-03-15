import { useState } from 'react';
import useShortlistMutation from '../../hooks/useShortlist';

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
  const mutation = useShortlistMutation();

  return (
    <button
      onClick={() => mutation.mutate({ inventoryId, action: isInShortList ? 'remove' : 'add' })}
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
