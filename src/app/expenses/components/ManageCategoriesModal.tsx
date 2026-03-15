import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  useCategories, 
  useCreateCategory, 
  useUpdateCategory, 
  useDeleteCategory,
  ExpenseCategory
} from "../hooks/useExpensesHooks";

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageCategoriesModal({ isOpen, onClose }: ManageCategoriesModalProps) {
  const { data: categories, isLoading } = useCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();

  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  const handleCreate = () => {
    if (!newCatName.trim()) return;
    createCategory({ name: newCatName.trim() }, {
      onSuccess: () => setNewCatName("")
    });
  };

  const startEdit = (cat: ExpenseCategory) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const handleUpdate = (id: string) => {
    if (!editingCatName.trim()) return;
    updateCategory({ id, name: editingCatName.trim() }, {
      onSuccess: () => {
        setEditingCatId(null);
        setEditingCatName("");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure? This category will be deleted. Ensure no expenses are using it.")) {
      deleteCategory(id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Manage Expense Categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="New category name..." 
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={!newCatName.trim() || isCreating}>
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>

          <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : categories?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No categories defined.</div>
            ) : (
              categories?.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 flex-wrap gap-2">
                  {editingCatId === cat.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleUpdate(cat.id)} disabled={!editingCatName.trim() || isUpdating}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCatId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-sm pl-1">{cat.name}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(cat.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
