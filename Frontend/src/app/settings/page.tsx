"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { 
  User, 
  Palette, 
  Bell, 
  Shield, 
  MapPin, 
  Link as LinkIcon,
  Camera,
  Upload,
  Lock,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Globe,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Settings
} from "lucide-react";
import { AppShell } from "../../components/AppShell";

type TabType = "account" | "appearance" | "notifications" | "privacy" | "location" | "connections";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("account");
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // 1. Get initial data from localStorage
    const storedUsername = localStorage.getItem("username");
    const storedAvatar = localStorage.getItem("user_avatar");
    setUsername(storedUsername);
    setAvatar(storedAvatar);

    // 2. Refresh from backend to ensure data is consistent
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
        // Here we could fetch the full profile if we had a /me GET endpoint
        // For now we rely on the PATCH to save and localStorage to cache
      } catch (err) {
        console.error("Profile refresh failed:", err);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (updates: { full_name?: string, avatar_url?: string, password?: string }) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("Vui lòng đăng nhập để thực hiện thay đổi!");
        return false;
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
      const res = await fetch(`${API_BASE}/api/v1/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Cập nhật thất bại!");
      }

      // Update local state and localStorage on success
      if (updates.full_name) {
        setUsername(updates.full_name);
        localStorage.setItem("username", updates.full_name);
      }
      if (updates.avatar_url) {
        setAvatar(updates.avatar_url);
        localStorage.setItem("user_avatar", updates.avatar_url);
      }

      // Sync other components
      window.dispatchEvent(new Event('storage'));
      
      return true;
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Có lỗi xảy ra khi lưu vào Database!");
      return false;
    }
  };

  if (!mounted) return null;

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return false;

      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
      const res = await fetch(`${API_BASE}/api/v1/users/me`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      });

      if (!res.ok) throw new Error("Xóa tài khoản thất bại!");

      // Clear everything and redirect
      localStorage.clear();
      window.location.href = "/";
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Có lỗi xảy ra khi xóa tài khoản!");
      return false;
    }
  };

  const tabs = [
    { id: "account", label: "Tài khoản", icon: User },
    { id: "appearance", label: "Giao diện", icon: Palette },
    { id: "privacy", label: "Quyền riêng tư", icon: Shield },
  ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl font-black text-[#3D312A] dark:text-[#E6DFD5] mb-8 tracking-tight uppercase">Cài đặt</h1>

        <div className="flex gap-8">
          {/* Left Tabs */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-[#FDFBF7] dark:bg-[#2A2420]/80 rounded-3xl p-3 shadow-sm border border-[#E6DFD5] dark:border-[#3D312A]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all mb-1 last:mb-0 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-brand-muted dark:bg-brand/10 text-brand-hover dark:text-[#E6DFD5] shadow-sm shadow-brand/10"
                      : "text-[#7A6A5A] dark:text-[#9A8A7A] hover:bg-[#F4EAD5] dark:hover:bg-brand/5 hover:text-[#3D312A] dark:hover:text-[#E6DFD5]"
                  }`}
                >
                  <tab.icon className={`w-[18px] h-[18px] ${activeTab === tab.id ? "text-brand dark:text-[#E8735A]" : "text-[#9A8A7A]"}`} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "account" && (
                  <AccountSettings
                    username={username}
                    avatar={avatar}
                    onAvatarChange={(newAvatar) => handleUpdateProfile({ avatar_url: newAvatar })}
                    onNameChange={(newName) => handleUpdateProfile({ full_name: newName })}
                    onPasswordChange={(newPass) => handleUpdateProfile({ password: newPass })}
                    onDeleteAccount={handleDeleteAccount}
                  />
                )}
                {activeTab === "appearance" && <AppearanceSettings />}
                {!["account", "appearance"].includes(activeTab) && (
                  <div className="bg-[#FDFBF7] dark:bg-[#2A2420]/80 rounded-[32px] p-12 text-center shadow-sm border border-[#E6DFD5] dark:border-[#3D312A]">
                    <div className="w-16 h-16 bg-brand-muted dark:bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand dark:text-[#E8735A]">
                      <Settings className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-[#3D312A] dark:text-[#E6DFD5] mb-2">Tính năng đang phát triển</h3>
                    <p className="text-[#7A6A5A] dark:text-[#9A8A7A] text-sm">Chúng tôi đang hoàn thiện phần này. Vui lòng quay lại sau!</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function AccountSettings({ 
  username, 
  avatar, 
  onAvatarChange,
  onNameChange,
  onPasswordChange,
  onDeleteAccount
}: { 
  username: string | null, 
  avatar: string | null,
  onAvatarChange: (newAvatar: string) => void,
  onNameChange: (newName: string) => void,
  onPasswordChange: (newPass: string) => Promise<boolean>,
  onDeleteAccount: () => Promise<boolean>
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [tempName, setTempName] = React.useState(username || "");
  const loginMethod = typeof window !== 'undefined' ? localStorage.getItem("login_method") : null;
  const isGoogleUser = loginMethod === "google";
  const isLocalAccount = !isGoogleUser;

  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [passwords, setPasswords] = React.useState({ old: "", new: "", confirm: "" });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự!");
      return;
    }
    
    const success = await onPasswordChange(passwords.new);
    if (success) {
      toast.success("Đổi mật khẩu thành công!");
      setShowPasswordModal(false);
      setPasswords({ old: "", new: "", confirm: "" });
    }
  };

  const handleAccountDeletion = async () => {
    setShowDeleteModal(false);
    await onDeleteAccount();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File quá lớn! Vui lòng chọn ảnh dưới 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onAvatarChange(base64String);
        localStorage.setItem("user_avatar", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      onNameChange(tempName);
      localStorage.setItem("username", tempName);
      toast.success("Đã cập nhật tên thành công!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-2xl border border-gray-100 dark:border-[#3D312A]"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-[#E6DFD5] mb-2">Đổi mật khẩu</h3>
              <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-8">Vui lòng nhập mật khẩu hiện tại và mật khẩu mới của bạn.</p>

              <form onSubmit={handlePasswordChange} className="space-y-5">
                <div>
                  <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Mật khẩu hiện tại</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.old}
                    onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Mật khẩu mới</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.new}
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Xác nhận mật khẩu mới</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-3.5 text-gray-500 dark:text-[#9A8A7A] text-sm font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-[#3D312A] transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3.5 bg-brand text-white text-sm font-bold rounded-2xl hover:bg-brand-hover transition-all shadow-lg shadow-brand/20 dark:shadow-none"
                  >
                    Cập nhật
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-2xl border border-gray-100 dark:border-[#3D312A]"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-[#E6DFD5] mb-2">Xác nhận xóa tài khoản?</h3>
              <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-8">
                Hành động này <span className="text-red-500 font-bold uppercase">không thể hoàn tác</span>. 
                Tất cả dữ liệu, lịch sử và tùy chỉnh của bạn sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </p>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3.5 text-gray-500 dark:text-[#9A8A7A] text-sm font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-[#3D312A] transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleAccountDeletion}
                  className="flex-1 py-3.5 bg-red-500 text-white text-sm font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-200 dark:shadow-none"
                >
                  Xác nhận xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Info Card */}
      <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A] relative overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-1">Tài khoản</h2>
            <p className="text-sm text-gray-500 dark:text-[#9A8A7A]">Quản lý thông tin tài khoản và bảo mật.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Avatar Column */}
          <div className="flex flex-col items-center md:items-start">
            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4">Ảnh đại diện</label>
            <div className="relative group">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-full border-4 border-gray-50 dark:border-[#3D312A] bg-gray-100 dark:bg-[#3D312A] overflow-hidden relative cursor-pointer"
              >
                {avatar ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-muted text-brand dark:text-[#E8735A]">
                    <User className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="text-white w-8 h-8" />
                </div>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-9 h-9 bg-brand text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-[#3D312A] hover:bg-brand-hover transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 text-center md:text-left">
              <p className="text-[11px] text-gray-400 mb-2">JPG, PNG tối đa 5MB</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-50 dark:bg-[#3D312A] text-gray-700 dark:text-[#C8BFB0] text-xs font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer border border-gray-100 dark:border-[#4D3D32]"
              >
                Thay đổi ảnh
              </button>
            </div>
          </div>

          {/* Form Column */}
          <div className="space-y-5">
            <div>
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Họ và tên</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  className="flex-1 bg-gray-50 dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-[#E6DFD5] focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
                <button 
                  onClick={handleSaveName}
                  className="px-6 py-2 bg-brand text-white text-xs font-bold rounded-2xl hover:bg-brand-hover transition-all shadow-md shadow-brand/20 dark:shadow-none active:scale-95 cursor-pointer flex-shrink-0"
                >
                  Lưu
                </button>
              </div>
            </div>
            <div>
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Email</label>
              <div className="relative">
                <input 
                  type="email" 
                  defaultValue={username || ""}
                  disabled
                  className="w-full bg-gray-100/50 dark:bg-[#3D312A]/50 border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                />
                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Security & Danger Zone Section */}
        <div className="mt-10 space-y-4">
          {/* Password Section */}
          {isGoogleUser ? (
            <div className="p-6 rounded-[32px] bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#3D312A] flex items-center justify-center shadow-sm border border-blue-100 dark:border-blue-500/10">
                <img src="https://www.google.com/favicon.ico" className="w-6 h-6 grayscale opacity-70" alt="Google" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5]">Tài khoản liên kết Google</h4>
                <p className="text-[12px] text-gray-500 dark:text-[#9A8A7A]">Bạn đang sử dụng tài khoản liên kết Google. Mọi cài đặt bảo mật và quản lý tài khoản sẽ được thực hiện tại trang cá nhân Google của bạn.</p>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setShowPasswordModal(true)}
              className="p-5 rounded-[32px] bg-brand-muted/50 dark:bg-brand/5 border border-brand-muted/50 dark:border-brand/10 flex items-center justify-between group cursor-pointer hover:bg-brand-muted transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#3D312A] flex items-center justify-center text-brand dark:text-[#E8735A] shadow-sm border border-brand-muted dark:border-brand/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5]">Đổi mật khẩu</h4>
                  <p className="text-[12px] text-gray-500 dark:text-[#9A8A7A]">Cập nhật mật khẩu định kỳ để bảo vệ tài khoản.</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-brand group-hover:bg-white dark:group-hover:bg-[#3D312A] transition-all">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          )}

          {/* Delete Account Banner */}
          {isLocalAccount ? (
            <div className="p-5 rounded-[32px] bg-red-50/50 dark:bg-red-500/5 border border-red-100/50 dark:border-red-500/10 flex items-center justify-between group cursor-pointer hover:bg-red-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#3D312A] flex items-center justify-center text-red-500 shadow-sm border border-red-100 dark:border-red-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5]">Xóa tài khoản</h4>
                  <p className="text-[11px] text-gray-500 dark:text-[#9A8A7A]">Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn trên hệ thống sẽ bị xóa vĩnh viễn.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-white dark:bg-[#3D312A] border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl hover:bg-red-600 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Xóa tài khoản
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-[32px] bg-gray-50 dark:bg-[#3D312A]/30 border border-gray-100 dark:border-[#3D312A] flex items-center gap-4 opacity-70">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#3D312A] flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 dark:border-[#4D3D32]">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5]">Xóa tài khoản</h4>
                <p className="text-[11px] text-gray-500 dark:text-[#9A8A7A]">Bạn đang sử dụng tài khoản liên kết Google. Mọi cài đặt bảo mật và quản lý tài khoản sẽ được thực hiện tại trang cá nhân Google của bạn.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: "light", label: "Sáng", icon: Sun, desc: "Trải nghiệm sáng" },
    { id: "dark", label: "Tối", icon: Moon, desc: "Dễ nhìn ban đêm" },
    { id: "system", label: "Hệ thống", icon: Monitor, desc: "Theo cài đặt máy" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Theme Selection */}
      <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-1">Giao diện</h2>
        <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-8">Tùy chỉnh giao diện ứng dụng theo sở thích.</p>
        
        <div className="flex gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 cursor-pointer ${
                theme === t.id
                  ? "border-brand bg-brand-muted/30 dark:bg-brand/10"
                  : "border-gray-50 dark:border-[#3D312A] hover:border-gray-200 dark:hover:border-gray-700"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === t.id ? "text-brand dark:text-[#E8735A] bg-white shadow-sm" : "text-gray-400 bg-gray-50 dark:bg-[#3D312A]"}`}>
                <t.icon className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className={`text-xs font-bold ${theme === t.id ? "text-gray-900 dark:text-[#E6DFD5]" : "text-gray-500"}`}>{t.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-50 dark:border-[#3D312A]">
          <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Ngôn ngữ</label>
          <div className="relative">
            <div className="w-full bg-gray-50 dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5]">Tiếng Việt</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A]">
      <h2 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-1">Quyền riêng tư</h2>
      <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-8">Quản lý quyền và dữ liệu cá nhân của bạn.</p>

      <div className="space-y-4">
        {[
          { icon: MapPin, title: "Cho phép truy cập vị trí", desc: "Wanderbite cần quyền này để gợi ý món ăn gần bạn.", active: true },
          { icon: ShieldCheck, title: "Cho phép dùng dữ liệu cá nhân hóa AI", desc: "Giúp AI hiểu bạn hơn để đưa ra gợi ý chính xác và phù hợp.", active: false }
        ].map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-5 rounded-3xl bg-gray-50/50 dark:bg-[#3D312A]/30 border border-gray-50 dark:border-[#3D312A]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#3D312A] flex items-center justify-center text-brand dark:text-[#E8735A] shadow-sm border border-gray-100 dark:border-[#3D312A]">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5]">{item.title}</h4>
                <p className="text-[11px] text-gray-500 dark:text-[#9A8A7A]">{item.desc}</p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${item.active ? 'bg-brand' : 'bg-gray-200 dark:bg-[#4D3D32]'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.active ? 'left-7' : 'left-1'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

