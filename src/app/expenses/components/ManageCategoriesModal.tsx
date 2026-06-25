import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Edit2, Check, X } from "lucide-react";
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newCatName.trim()) return;
    createCategory({ name: newCatName.trim() }, {
      onSuccess: () => {
        setNewCatName("");
        toast.success("Category created successfully");
      }
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
        toast.success("Category updated successfully");
      }
    });
  };

  const handleDelete = (id: string) => {
    deleteCategory(id, {
      onSuccess: () => {
        setConfirmDeleteId(null);
        toast.success("Category deleted successfully");
      },
      onError: () => toast.error("Failed to delete category")
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Expense Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="New category name..." 
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            <Button 
              onClick={handleCreate} 
              disabled={!newCatName.trim() || isCreating}
            >
              {isCreating ? "Adding..." : "Add"}
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto rounded-md border divide-y bg-card text-card-foreground">
            {isLoading ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : categories && categories.length > 0 ? (
              categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 text-sm">
                  <div className="flex-1 mr-4">
                    {editingCatId === cat.id ? (
                      <Input
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate(cat.id);
                        }}
                        autoFocus
                        className="h-8"
                      />
                    ) : (
                      <span className="font-medium text-foreground">{cat.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {editingCatId === cat.id ? (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-50"
                          onClick={() => handleUpdate(cat.id)}
                          disabled={!editingCatName.trim() || isUpdating}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => setEditingCatId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : confirmDeleteId === cat.id ? (
                      <div className="flex items-center gap-1 bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">
                        <span className="text-xs text-destructive font-medium mr-1">Delete?</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive hover:bg-destructive/20"
                          onClick={() => handleDelete(cat.id)}
                          disabled={isDeleting}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:bg-muted"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => startEdit(cat)}
                        >
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => setConfirmDeleteId(cat.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-6 text-muted-foreground">
                No categories defined.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

