import { useState } from "react";
import { Modal, Button, Input, List, Popconfirm, message, Typography } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
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

const { Text } = Typography;

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
        message.success("Category created successfully");
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
        message.success("Category updated successfully");
      }
    });
  };

  const handleDelete = (id: string) => {
    deleteCategory(id, {
      onSuccess: () => message.success("Category deleted successfully"),
      onError: () => message.error("Failed to delete category")
    });
  };

  return (
    <Modal
      title="Manage Expense Categories"
      open={isOpen}
      onCancel={onClose}
      footer={null}
    >
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <Input 
            placeholder="New category name..." 
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onPressEnter={handleCreate}
          />
          <Button 
            type="primary" 
            onClick={handleCreate} 
            disabled={!newCatName.trim() || isCreating}
            icon={<PlusOutlined />}
            loading={isCreating}
          >
            Add
          </Button>
        </div>

        <List
          bordered
          size="small"
          loading={isLoading}
          dataSource={categories || []}
          className="max-h-[300px] overflow-y-auto rounded-md"
          locale={{ emptyText: "No categories defined." }}
          renderItem={(cat: ExpenseCategory) => (

            <List.Item
              actions={[
                editingCatId === cat.id ? (
                  <Button 
                    key="save" 
                    type="link" 
                    size="small" 
                    onClick={() => handleUpdate(cat.id)}
                    disabled={!editingCatName.trim() || isUpdating}
                  >
                    Save
                  </Button>
                ) : (
                  <Button 
                    key="edit" 
                    type="link" 
                    icon={<EditOutlined />} 
                    size="small" 
                    onClick={() => startEdit(cat)} 
                  />
                ),
                editingCatId === cat.id ? (
                  <Button 
                    key="cancel" 
                    type="link" 
                    size="small" 
                    onClick={() => setEditingCatId(null)}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Popconfirm
                    key="delete"
                    title="Delete category"
                    description="Are you sure? This category will be deleted. Ensure no expenses are using it."
                    onConfirm={() => handleDelete(cat.id)}
                    okText="Yes"
                    cancelText="No"
                    disabled={isDeleting}
                  >
                    <Button 
                      type="link" 
                      danger 
                      icon={<DeleteOutlined />} 
                      size="small" 
                      disabled={isDeleting}
                    />
                  </Popconfirm>
                ),
              ]}
            >
              {editingCatId === cat.id ? (
                <Input
                  value={editingCatName}
                  onChange={(e) => setEditingCatName(e.target.value)}
                  onPressEnter={() => handleUpdate(cat.id)}
                  autoFocus
                  size="small"
                />
              ) : (
                <Typography.Text>{cat.name}</Typography.Text>
              )}
            </List.Item>
          )}
        />
      </div>
    </Modal>
  );
}

