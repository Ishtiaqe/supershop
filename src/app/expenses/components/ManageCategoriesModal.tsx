import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Spinner,
} from "@heroui/react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
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
  id?: string;
}

export function ManageCategoriesModal({ isOpen, onClose, id }: ManageCategoriesModalProps) {

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
      onSuccess: () => toast.success("Category deleted successfully"),
      onError: () => toast.error("Failed to delete category")
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, callback: () => void) => {
    if (e.key === "Enter") {
      callback();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(openState) => {
        if (!openState) onClose();
      }}
      size="md"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Manage Expense Categories
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Create new category section */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="New category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleCreate)}
                size="sm"
                variant="bordered"
              />
              <Button
                isIconOnly
                color="primary"
                onClick={handleCreate}
                disabled={!newCatName.trim() || isCreating}
                isLoading={isCreating}
              >
                <Plus size={18} />
              </Button>
            </div>

            {/* Categories list */}
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="sm" />
                </div>
              ) : !categories || categories.length === 0 ? (
                <div className="py-8 text-center text-sm text-default-500">
                  No categories defined.
                </div>
              ) : (
                <ul className="divide-y divide-default-200">
                  {categories.map((cat: ExpenseCategory) => (
                    <li
                      key={cat.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-default-50 transition-colors"
                    >
                      <div className="flex-1">
                        {editingCatId === cat.id ? (
                          <Input
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, () => handleUpdate(cat.id))}
                            autoFocus
                            size="sm"
                            variant="bordered"
                            className="max-w-xs"
                          />
                        ) : (
                          <span className="text-sm">{cat.name}</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {editingCatId === cat.id ? (
                          <>
                            <Button
                              key="save"
                              size="sm"
                              color="primary"
                              variant="light"
                              onClick={() => handleUpdate(cat.id)}
                              disabled={!editingCatName.trim() || isUpdating}
                              isLoading={isUpdating}
                            >
                              Save
                            </Button>
                            <Button
                              key="cancel"
                              size="sm"
                              variant="light"
                              onClick={() => setEditingCatId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              key="edit"
                              isIconOnly
                              size="sm"
                              variant="light"
                              onClick={() => startEdit(cat)}
                            >
                              <Pencil size={16} />
                            </Button>
                            <Popover placement="left">
                              <PopoverTrigger asChild>
                                <Button
                                  key="delete"
                                  isIconOnly
                                  size="sm"
                                  color="danger"
                                  variant="light"
                                  disabled={isDeleting}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72">
                                <div className="px-1 py-2">
                                  <p className="text-sm font-semibold">Delete category</p>
                                  <p className="text-xs text-default-500 mt-1">
                                    Are you sure? This category will be deleted. Ensure no expenses are using it.
                                  </p>
                                  <div className="flex gap-2 justify-end mt-4">
                                    <Button
                                      size="sm"
                                      variant="light"
                                      onClick={() => {
                                        // Close popover by clicking outside
                                      }}
                                    >
                                      No
                                    </Button>
                                    <Button
                                      size="sm"
                                      color="danger"
                                      onClick={() => {
                                        handleDelete(cat.id);
                                      }}
                                      isLoading={isDeleting}
                                    >
                                      Yes
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

