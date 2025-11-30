import { useState } from 'react';
import { User } from 'lucide-react';
import { authStore } from '@/store/authStore';
import { authAPI } from '@/api/auth';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import toast from 'react-hot-toast';
import type { UpdateProfileRequest } from '@/types/auth';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const user = authStore((s) => s.user);
  const fetchUser = authStore((s) => s.fetchUser);

  const [formData, setFormData] = useState<UpdateProfileRequest>({
    username: user?.username || '',
    full_name: user?.full_name || '',
    phone: '',
    gender: undefined,
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter out empty values
      const updateData: UpdateProfileRequest = {};
      if (formData.username && formData.username !== user?.username) {
        updateData.username = formData.username;
      }
      if (formData.full_name && formData.full_name !== user?.full_name) {
        updateData.full_name = formData.full_name;
      }
      if (formData.phone) {
        updateData.phone = formData.phone;
      }
      if (formData.gender) {
        updateData.gender = formData.gender;
      }

      if (Object.keys(updateData).length === 0) {
        toast('没有任何更改', { icon: 'ℹ️' });
        return;
      }

      await authAPI.updateProfile(updateData);

      toast.success('个人资料更新成功');
      await fetchUser(); // Refresh user data
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="编辑个人资料">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="用户名"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder="输入用户名"
          minLength={3}
          maxLength={50}
        />

        <Input
          label="姓名"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="输入姓名"
          maxLength={100}
        />

        <Input
          label="手机号"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="输入手机号"
        />

        <Dropdown
          label="性别"
          value={formData.gender || ''}
          onChange={(value) =>
            setFormData({
              ...formData,
              gender: value as 'male' | 'female' | 'other' | undefined,
            })
          }
          options={[
            { value: '', label: '选择性别' },
            { value: 'male', label: '男', icon: <User size={16} /> },
            { value: 'female', label: '女', icon: <User size={16} /> },
            { value: 'other', label: '其他', icon: <User size={16} /> },
          ]}
          searchable={false}
          className="w-full"
        />

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            取消
          </Button>
          <Button type="submit" className="flex-1" isLoading={loading}>
            保存
          </Button>
        </div>
      </form>
    </Modal>
  );
}
