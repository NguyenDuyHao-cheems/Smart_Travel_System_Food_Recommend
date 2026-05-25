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
  Settings,
  Plus,
  Pencil,
  X,
  Sparkles,
  Heart,
  Copy,
  Check
} from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { useLanguage } from "../../components/LanguageProvider";

type TabType = "account" | "personalization" | "appearance" | "notifications" | "privacy" | "location" | "connections";

export default function SettingsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>("account");
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);


  useEffect(() => {
    setMounted(true);
    // 1. Get initial data from localStorage
    const storedUsername = localStorage.getItem("username");
    const storedAvatar = localStorage.getItem("user_avatar");
    const storedEmail = localStorage.getItem("user_email");
    const storedUserId = localStorage.getItem("user_id") || "";
    const storedCover = localStorage.getItem(`user_cover_${storedUserId}`);
    setUsername(storedUsername);
    setAvatar(storedAvatar);
    setAccountEmail(storedEmail);
    setCover(storedCover);

    // 2. Refresh from backend to ensure data is consistent
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
        const res = await fetch(`${API_BASE}/api/v1/users/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAccountEmail(data.username);
          setUsername(data.full_name || data.username);
          setAvatar(data.avatar_url);
          setCover(data.cover_url);
          
          localStorage.setItem("username", data.full_name || data.username);
          localStorage.setItem("user_email", data.username);
          if (data.avatar_url) {
            localStorage.setItem("user_avatar", data.avatar_url);
          }
          if (data.cover_url) {
            const userId = localStorage.getItem("user_id") || "";
            localStorage.setItem(`user_cover_${userId}`, data.cover_url);
          }
        }
      } catch (err) {
        console.warn("Profile refresh failed:", err);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (updates: { full_name?: string, avatar_url?: string, cover_url?: string, password?: string }) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token || token === "undefined" || token === "null") {
        alert(t("settings.pleaseLoginAgain"));
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
        if (res.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("username");
          localStorage.removeItem("user_avatar");
          localStorage.removeItem("user_id");
          localStorage.removeItem("login_method");
          alert(t("settings.sessionExpiredAlert"));
          window.location.href = "/auth";
          return false;
        }
        const errorData = await res.json();
        throw new Error(errorData.detail || t("settings.updateProfileFailed"));
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
      if (updates.cover_url) {
        setCover(updates.cover_url);
        const userId = localStorage.getItem("user_id") || "";
        localStorage.setItem(`user_cover_${userId}`, updates.cover_url);
      }

      // Sync other components
      window.dispatchEvent(new Event('storage'));
      
      return true;
    } catch (err: any) {
      console.error(err);
      alert(err.message || t("settings.savingError"));
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

      if (!res.ok) throw new Error(t("settings.deleteAccountFailed"));

      // Clear everything and redirect
      localStorage.clear();
      window.location.href = "/";
      return true;
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t("settings.deleteAccountFailed"));
      return false;
    }
  };

  const tabs = [
    { id: "account", label: t("settings.tabAccount"), icon: User },
    { id: "personalization", label: t("settings.tabPersonalization"), icon: Sparkles },
    { id: "appearance", label: t("settings.tabAppearance"), icon: Palette },
    { id: "privacy", label: t("settings.tabPrivacy"), icon: Shield },
  ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl font-black text-[#3D312A] dark:text-[#E6DFD5] mb-8 tracking-tight uppercase">{t("settings.title")}</h1>

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
                    accountEmail={accountEmail}
                    avatar={avatar}
                    cover={cover}
                    onAvatarChange={(newAvatar) => handleUpdateProfile({ avatar_url: newAvatar })}
                    onCoverChange={(newCover) => handleUpdateProfile({ cover_url: newCover })}
                    onNameChange={(newName) => handleUpdateProfile({ full_name: newName })}
                    onPasswordChange={(newPass) => handleUpdateProfile({ password: newPass })}
                    onDeleteAccount={handleDeleteAccount}
                  />
                )}
                {activeTab === "personalization" && <PersonalizationSettings />}
                {activeTab === "appearance" && <AppearanceSettings />}
                {activeTab === "privacy" && <PrivacySettings />}
                {!["account", "personalization", "appearance", "privacy"].includes(activeTab) && (
                  <div className="bg-[#FDFBF7] dark:bg-[#2A2420]/80 rounded-[32px] p-12 text-center shadow-sm border border-[#E6DFD5] dark:border-[#3D312A]">
                    <div className="w-16 h-16 bg-brand-muted dark:bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand dark:text-[#E8735A]">
                      <Settings className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-[#3D312A] dark:text-[#E6DFD5] mb-2">{t("settings.featuresUnderDevelopmentTitle")}</h3>
                    <p className="text-[#7A6A5A] dark:text-[#9A8A7A] text-sm">{t("settings.featuresUnderDevelopmentDesc")}</p>
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

const resizeBase64Image = (base64Str: string, maxDim: number = 800): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (Math.max(width, height) <= maxDim) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
          return;
        }
        resolve(base64Str);
        return;
      }
      
      const canvas = document.createElement("canvas");
      let w = width;
      let h = height;
      if (width > height) {
        if (width > maxDim) {
          h = Math.round((height * maxDim) / width);
          w = maxDim;
        }
      } else {
        if (height > maxDim) {
          w = Math.round((width * maxDim) / height);
          h = maxDim;
        }
      }
      
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

function AccountSettings({ 
  username, 
  accountEmail,
  avatar, 
  cover,
  onAvatarChange,
  onCoverChange,
  onNameChange,
  onPasswordChange,
  onDeleteAccount
}: { 
  username: string | null, 
  accountEmail: string | null,
  avatar: string | null,
  cover: string | null,
  onAvatarChange: (newAvatar: string) => Promise<boolean> | any,
  onCoverChange: (newCover: string) => Promise<boolean> | any,
  onNameChange: (newName: string) => Promise<boolean> | any,
  onPasswordChange: (newPass: string) => Promise<boolean>,
  onDeleteAccount: () => Promise<boolean>
}) {
  const { t } = useLanguage();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const coverFileInputRef = React.useRef<HTMLInputElement>(null);

  const userId = typeof window !== 'undefined' ? localStorage.getItem("user_id") || "guest" : "guest";
  const historyKey = `user_avatar_history_${userId}`;
  const originalAvatarKey = `original_user_avatar_${userId}`;
  const cropParamsKey = `user_avatar_crop_params_${userId}`;
  const lastCroppedAvatarKey = `last_cropped_avatar_${userId}`;

  const [tempName, setTempName] = React.useState(username || "");
  const loginMethod = typeof window !== 'undefined' ? localStorage.getItem("login_method") : null;
  const isGoogleUser = loginMethod === "google";
  const isLocalAccount = !isGoogleUser;

  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [passwords, setPasswords] = React.useState({ old: "", new: "", confirm: "" });
  const [copied, setCopied] = React.useState(false);

  const handleCopyId = () => {
    if (typeof window !== 'undefined' && userId) {
      navigator.clipboard.writeText(userId);
      setCopied(true);
      toast.success(t("settings.copiedUserId"));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Circular Crop & Edit Image State
  const [showCropModal, setShowCropModal] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [tempOriginalImage, setTempOriginalImage] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [minZoom, setMinZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  // Rectangular 3:1 Cover Crop State
  const [showCoverCropModal, setShowCoverCropModal] = React.useState(false);
  const [coverImageSrc, setCoverImageSrc] = React.useState<string | null>(null);
  const [coverZoom, setCoverZoom] = React.useState(1);
  const [coverMinZoom, setCoverMinZoom] = React.useState(1);
  const [coverRotation, setCoverRotation] = React.useState(0);
  const [coverOffset, setCoverOffset] = React.useState({ x: 0, y: 0 });
  const [isCoverDragging, setIsCoverDragging] = React.useState(false);
  const [coverDragStart, setCoverDragStart] = React.useState({ x: 0, y: 0 });

  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const [avatarHistory, setAvatarHistory] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const historyJson = localStorage.getItem(historyKey);
      if (historyJson) {
        try {
          setAvatarHistory(JSON.parse(historyJson));
        } catch (e) {
          console.error(e);
        }
      } else {
        setAvatarHistory([]); // Reset history if key doesn't exist for this user!
      }
    }
  }, [showHistoryModal, avatar, historyKey]);

  const isEmail = accountEmail?.includes("@") || username?.includes("@") || loginMethod === "google";

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error(t("settings.passwordsDoNotMatch"));
      return;
    }
    if (passwords.new.length < 8) {
      toast.error(t("settings.passwordMinLength"));
      return;
    }
    
    const success = await onPasswordChange(passwords.new);
    if (success) {
      toast.success(t("settings.passwordChangeSuccess"));
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
        toast.error(t("settings.maxFileSizeError"));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const optimizedBase64 = await resizeBase64Image(base64String, 800);
          setImageSrc(optimizedBase64);
          setTempOriginalImage(optimizedBase64);
        } catch (e) {
          console.error(t("settings.imageOptimizationError"), e);
          setImageSrc(base64String);
          setTempOriginalImage(base64String);
        }
        setZoom(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
        setShowCropModal(true);
        // Clear input value so selecting the same file triggers onChange next time!
        event.target.value = "";
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("settings.maxFileSizeError"));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const optimizedBase64 = await resizeBase64Image(base64String, 1200);
          setCoverImageSrc(optimizedBase64);
        } catch (e) {
          console.error(t("settings.imageOptimizationError"), e);
          setCoverImageSrc(base64String);
        }
        setCoverZoom(1);
        setCoverRotation(0);
        setCoverOffset({ x: 0, y: 0 });
        setShowCoverCropModal(true);
        event.target.value = "";
      };
      reader.readAsDataURL(file);
    }
  };

  const constrainOffset = (x: number, y: number, currentZoom: number) => {
    const img = document.querySelector('img[alt="Cắt ảnh"]') as HTMLImageElement;
    if (!img) return { x: 0, y: 0 };

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    if (!imgWidth || !imgHeight) return { x: 0, y: 0 };

    const maxDim = Math.max(imgWidth, imgHeight);
    const viewportSize = 360;
    const cropCircleSize = 280;
    const borderGap = (viewportSize - cropCircleSize) / 2; // 40px

    const renderedWidth = (imgWidth / maxDim) * viewportSize;
    const renderedHeight = (imgHeight / maxDim) * viewportSize;

    const scaledWidth = renderedWidth * currentZoom;
    const scaledHeight = renderedHeight * currentZoom;

    const maxOffsetX = Math.max(0, (scaledWidth / 2) - (viewportSize / 2 - borderGap));
    const minOffsetX = -maxOffsetX;

    const maxOffsetY = Math.max(0, (scaledHeight / 2) - (viewportSize / 2 - borderGap));
    const minOffsetY = -maxOffsetY;

    return {
      x: Math.max(minOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(minOffsetY, Math.min(maxOffsetY, y))
    };
  };

  React.useEffect(() => {
    if (showCropModal && imageSrc) {
      const timer = setTimeout(() => {
        setOffset(prev => constrainOffset(prev.x, prev.y, zoom));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [zoom, showCropModal, imageSrc]);

  React.useEffect(() => {
    if (showCropModal && imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        if (imgWidth && imgHeight) {
          const maxDim = Math.max(imgWidth, imgHeight);
          const viewportSize = 360;
          const cropCircleSize = 280;
          
          const renderedWidth = (imgWidth / maxDim) * viewportSize;
          const renderedHeight = (imgHeight / maxDim) * viewportSize;
          
          const calculatedMinZoom = Math.max(cropCircleSize / renderedWidth, cropCircleSize / renderedHeight);
          setMinZoom(calculatedMinZoom);
          setZoom(prev => Math.max(calculatedMinZoom, prev));
        }
      };
    }
  }, [imageSrc, showCropModal]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    setOffset(constrainOffset(rawX, rawY, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const rawX = e.touches[0].clientX - dragStart.x;
    const rawY = e.touches[0].clientY - dragStart.y;
    setOffset(constrainOffset(rawX, rawY, zoom));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const constrainCoverOffset = (x: number, y: number, currentZoom: number) => {
    const img = document.querySelector('img[alt="Cắt ảnh bìa"]') as HTMLImageElement;
    if (!img) return { x: 0, y: 0 };

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    if (!imgWidth || !imgHeight) return { x: 0, y: 0 };

    const maxDim = Math.max(imgWidth, imgHeight);
    const viewportSize = 360;
    const cropWidth = 330;
    const cropHeight = 110;
    const borderGapX = (viewportSize - cropWidth) / 2; // 15px
    const borderGapY = (viewportSize - cropHeight) / 2; // 125px

    const renderedWidth = (imgWidth / maxDim) * viewportSize;
    const renderedHeight = (imgHeight / maxDim) * viewportSize;

    const scaledWidth = renderedWidth * currentZoom;
    const scaledHeight = renderedHeight * currentZoom;

    const maxOffsetX = Math.max(0, (scaledWidth / 2) - (viewportSize / 2 - borderGapX));
    const minOffsetX = -maxOffsetX;

    const maxOffsetY = Math.max(0, (scaledHeight / 2) - (viewportSize / 2 - borderGapY));
    const minOffsetY = -maxOffsetY;

    return {
      x: Math.max(minOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(minOffsetY, Math.min(maxOffsetY, y))
    };
  };

  React.useEffect(() => {
    if (showCoverCropModal && coverImageSrc) {
      const timer = setTimeout(() => {
        setCoverOffset(prev => constrainCoverOffset(prev.x, prev.y, coverZoom));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [coverZoom, showCoverCropModal, coverImageSrc]);

  React.useEffect(() => {
    if (showCoverCropModal && coverImageSrc) {
      const img = new Image();
      img.src = coverImageSrc;
      img.onload = () => {
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        if (imgWidth && imgHeight) {
          const maxDim = Math.max(imgWidth, imgHeight);
          const viewportSize = 360;
          const cropWidth = 330;
          const cropHeight = 110;
          
          const renderedWidth = (imgWidth / maxDim) * viewportSize;
          const renderedHeight = (imgHeight / maxDim) * viewportSize;
          
          const calculatedMinZoom = Math.max(cropWidth / renderedWidth, cropHeight / renderedHeight);
          setCoverMinZoom(calculatedMinZoom);
          setCoverZoom(prev => Math.max(calculatedMinZoom, prev));
        }
      };
    }
  }, [coverImageSrc, showCoverCropModal]);

  const handleCoverMouseDown = (e: React.MouseEvent) => {
    setIsCoverDragging(true);
    setCoverDragStart({ x: e.clientX - coverOffset.x, y: e.clientY - coverOffset.y });
  };

  const handleCoverMouseMove = (e: React.MouseEvent) => {
    if (!isCoverDragging) return;
    const rawX = e.clientX - coverDragStart.x;
    const rawY = e.clientY - coverDragStart.y;
    setCoverOffset(constrainCoverOffset(rawX, rawY, coverZoom));
  };

  const handleCoverMouseUp = () => {
    setIsCoverDragging(false);
  };

  const handleCoverMouseLeave = () => {
    setIsCoverDragging(false);
  };

  const handleCoverTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsCoverDragging(true);
      setCoverDragStart({
        x: e.touches[0].clientX - coverOffset.x,
        y: e.touches[0].clientY - coverOffset.y
      });
    }
  };

  const handleCoverTouchMove = (e: React.TouchEvent) => {
    if (!isCoverDragging || e.touches.length !== 1) return;
    const rawX = e.touches[0].clientX - coverDragStart.x;
    const rawY = e.touches[0].clientY - coverDragStart.y;
    setCoverOffset(constrainCoverOffset(rawX, rawY, coverZoom));
  };

  const handleCoverTouchEnd = () => {
    setIsCoverDragging(false);
  };

  const handleCoverWheel = (e: React.WheelEvent) => {
    const zoomStep = 0.05;
    const nextZoom = e.deltaY < 0 
      ? Math.min(coverMinZoom * 4, coverZoom + zoomStep) 
      : Math.max(coverMinZoom, coverZoom - zoomStep);
    setCoverZoom(nextZoom);
  };

  const handleCoverImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    
    if (imgWidth && imgHeight) {
      const maxDim = Math.max(imgWidth, imgHeight);
      const viewportSize = 360;
      const cropWidth = 330;
      const cropHeight = 110;
      
      const renderedWidth = (imgWidth / maxDim) * viewportSize;
      const renderedHeight = (imgHeight / maxDim) * viewportSize;
      
      const calculatedMinZoom = Math.max(cropWidth / renderedWidth, cropHeight / renderedHeight);
      setCoverMinZoom(calculatedMinZoom);
      setCoverZoom(calculatedMinZoom);
      setCoverRotation(0);
      setCoverOffset({ x: 0, y: 0 });
    }
  };

  const handleCoverCropSave = () => {
    if (!coverImageSrc) return;

    const img = new Image();
    img.src = coverImageSrc;
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const targetWidth = 900;
      const targetHeight = 300;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fill with solid white background to prevent black borders when exporting to JPEG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      const viewportSize = 360; // size of the screen viewport container
      const cropWidth = 330; // size of the screen crop rectangle width
      const scaleFactor = targetWidth / cropWidth; // 900 / 330 = 2.7272

      // Translate origin to center of canvas
      ctx.translate(targetWidth / 2, targetHeight / 2);
      
      // Apply drag offset
      ctx.translate(coverOffset.x * scaleFactor, coverOffset.y * scaleFactor);
      
      // Apply rotation
      ctx.rotate((coverRotation * Math.PI) / 180);
      
      // Apply zoom scale
      ctx.scale(coverZoom, coverZoom);
      
      const imgWidth = img.width;
      const imgHeight = img.height;
      const maxDimension = Math.max(imgWidth, imgHeight);
      
      const drawWidth = (imgWidth / maxDimension) * viewportSize * scaleFactor;
      const drawHeight = (imgHeight / maxDimension) * viewportSize * scaleFactor;

      ctx.drawImage(
        img,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.85);
      const success = await onCoverChange(croppedBase64);
      if (success !== false) {
        toast.success(t("settings.coverUpdateSuccess"));
        setShowCoverCropModal(false);
        setCoverImageSrc(null);
      }
    };
  };

  const handleCropSave = () => {
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const size = 300; // standard avatar export size
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fill with solid white background to prevent black borders when exporting to JPEG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      const viewportSize = 360; // size of the screen viewport container
      const cropCircleSize = 280; // size of the screen crop circle
      const scaleFactor = size / cropCircleSize; // 300 / 280 = 1.0714

      // Translate origin to center of canvas
      ctx.translate(size / 2, size / 2);
      
      // Apply drag offset (unscaled by zoom)
      ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);
      
      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);
      
      // Apply zoom scale
      ctx.scale(zoom, zoom);
      
      const imgWidth = img.width;
      const imgHeight = img.height;
      const maxDimension = Math.max(imgWidth, imgHeight);
      
      // Scale drawn size based on the viewportSize to scaleFactor ratio
      const drawWidth = (imgWidth / maxDimension) * viewportSize * scaleFactor;
      const drawHeight = (imgHeight / maxDimension) * viewportSize * scaleFactor;

      ctx.drawImage(
        img,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.85);
      const success = await onAvatarChange(croppedBase64);
      if (success !== false) {
        try {
          if (tempOriginalImage) {
            localStorage.setItem(originalAvatarKey, tempOriginalImage);
          }
          localStorage.setItem(cropParamsKey, JSON.stringify({ zoom, rotation, offset }));
          localStorage.setItem(lastCroppedAvatarKey, croppedBase64);

          // Save to history
          const originalToStore = tempOriginalImage || imageSrc;
          if (originalToStore) {
            const historyJson = localStorage.getItem(historyKey);
            let history = historyJson ? JSON.parse(historyJson) : [];
            history = history.filter((item: any) => item.original !== originalToStore);
            history.unshift({
              original: originalToStore,
              cropped: croppedBase64,
              params: { zoom, rotation, offset },
              timestamp: Date.now()
            });
            if (history.length > 5) {
              history = history.slice(0, 5);
            }
            
            try {
              localStorage.setItem(historyKey, JSON.stringify(history));
            } catch (historyErr) {
              console.warn(t("settings.quotaExceededCleaning"));
              // Remove old items one by one and retry
              while (history.length > 1) {
                history.pop();
                try {
                  localStorage.setItem(historyKey, JSON.stringify(history));
                  break;
                } catch (_) {}
              }
            }
          }
        } catch (err) {
          console.error(t("settings.localStoreError"), err);
          try {
            localStorage.removeItem(historyKey);
            if (tempOriginalImage) {
              localStorage.setItem(originalAvatarKey, tempOriginalImage);
            }
          } catch (_) {
            console.error(t("settings.cannotWriteLocalStore"));
          }
        }

        toast.success(t("settings.avatarUpdateSuccess"));
        setShowCropModal(false);
        setImageSrc(null);
      }
    };
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomStep = 0.05;
    const nextZoom = e.deltaY < 0 
      ? Math.min(minZoom * 4, zoom + zoomStep) 
      : Math.max(minZoom, zoom - zoomStep);
    setZoom(nextZoom);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    
    if (imgWidth && imgHeight) {
      const maxDim = Math.max(imgWidth, imgHeight);
      const viewportSize = 360;
      const cropCircleSize = 280;
      
      const renderedWidth = (imgWidth / maxDim) * viewportSize;
      const renderedHeight = (imgHeight / maxDim) * viewportSize;
      
      const calculatedMinZoom = Math.max(cropCircleSize / renderedWidth, cropCircleSize / renderedHeight);
      setMinZoom(calculatedMinZoom);
      
      // Determine if we are editing the CURRENT avatar
      const lastCropped = localStorage.getItem(lastCroppedAvatarKey);
      const isSameAvatar = lastCropped && (lastCropped === avatar);
      const currentStoredOriginal = isSameAvatar ? localStorage.getItem(originalAvatarKey) : null;
      const isEditingCurrent = tempOriginalImage && currentStoredOriginal && (tempOriginalImage === currentStoredOriginal);
      
      if (isEditingCurrent) {
        const storedParams = localStorage.getItem(cropParamsKey);
        if (storedParams) {
          try {
            const params = JSON.parse(storedParams);
            const targetZoom = Math.max(calculatedMinZoom, params.zoom ?? calculatedMinZoom);
            setZoom(targetZoom);
            setRotation(params.rotation ?? 0);
            setOffset(params.offset ?? { x: 0, y: 0 });
            return;
          } catch (err) {
            // fallback
          }
        }
      }
      
      // For any new file uploads or history gallery items:
      // ALWAYS reset to calculatedMinZoom, rotation 0, and offset 0 to guarantee NO black borders!
      setZoom(calculatedMinZoom);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    }
  };

  const handleSaveName = async () => {
    if (tempName.trim()) {
      const success = await onNameChange(tempName);
      if (success !== false) {
        toast.success(t("settings.nameUpdateSuccess"));
      }
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

      {/* Hidden Cover File Input */}
      <input 
        type="file" 
        ref={coverFileInputRef}
        onChange={handleCoverFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Rectangular 3:1 Cover Crop & Edit Modal */}
      <AnimatePresence>
        {showCoverCropModal && coverImageSrc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCoverCropModal(false);
                setCoverImageSrc(null);
              }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-[480px] bg-white dark:bg-[#2A2420] rounded-[32px] p-8 shadow-2xl border border-gray-100 dark:border-[#3D312A] z-10"
            >
              <h3 className="text-xl font-black text-gray-900 dark:text-[#E6DFD5] mb-2 uppercase tracking-tight text-left">{t("settings.editCoverTitle")}</h3>
              <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-6 text-left">{t("settings.editCoverDesc")}</p>

              {/* Crop Viewport area */}
              <div className="flex justify-center mb-6">
                <div 
                  className="relative w-[360px] h-[360px] bg-neutral-900 rounded-[28px] overflow-hidden cursor-grab active:cursor-grabbing border border-gray-100 dark:border-[#4D3D32] flex items-center justify-center select-none"
                  onMouseDown={handleCoverMouseDown}
                  onMouseMove={handleCoverMouseMove}
                  onMouseUp={handleCoverMouseUp}
                  onMouseLeave={handleCoverMouseLeave}
                  onTouchStart={handleCoverTouchStart}
                  onTouchMove={handleCoverTouchMove}
                  onTouchEnd={handleCoverTouchEnd}
                  onWheel={handleCoverWheel}
                >
                  <img
                    src={coverImageSrc}
                    alt={t("settings.coverPhoto")}
                    draggable={false}
                    onLoad={handleCoverImageLoad}
                    style={{
                      transform: `translate(${coverOffset.x}px, ${coverOffset.y}px) rotate(${coverRotation}deg) scale(${coverZoom})`,
                      transition: isCoverDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    className="max-w-full max-h-full object-contain pointer-events-none select-none"
                  />
                  {/* Rectangular mask overlay with a 3:1 cutout */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[330px] h-[110px] border-2 border-dashed border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]" />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-5 mb-8">
                {/* Zoom */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-[#9A8A7A] uppercase tracking-wider">
                    <span>{t("settings.zoom")}</span>
                    <span>{coverZoom.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range"
                    min={coverMinZoom}
                    max={coverMinZoom * 4}
                    step="0.01"
                    value={coverZoom}
                    onChange={(e) => setCoverZoom(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-100 dark:bg-[#4D3D32] rounded-lg appearance-none cursor-pointer accent-brand"
                  />
                </div>

                {/* Rotation */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-[#9A8A7A] uppercase tracking-wider">
                    <span>{t("settings.rotate")}</span>
                    <span>{coverRotation}°</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={coverRotation}
                    onChange={(e) => setCoverRotation(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-100 dark:bg-[#4D3D32] rounded-lg appearance-none cursor-pointer accent-brand"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setShowCoverCropModal(false);
                    setCoverImageSrc(null);
                  }}
                  className="flex-1 py-3.5 text-gray-500 dark:text-[#9A8A7A] text-sm font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-[#3D312A] transition-colors cursor-pointer"
                >
                  {t("settings.cancel")}
                </button>
                <button 
                  type="button"
                  onClick={handleCoverCropSave}
                  className="flex-1 py-3.5 bg-brand text-white text-sm font-bold rounded-2xl hover:bg-brand-hover transition-all shadow-lg shadow-brand/20 dark:shadow-none cursor-pointer"
                >
                  {t("settings.confirmCrop")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Circular Crop & Edit Image Modal */}
      <AnimatePresence>
        {showCropModal && imageSrc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCropModal(false);
                setImageSrc(null);
              }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-[480px] bg-white dark:bg-[#2A2420] rounded-[32px] p-8 shadow-2xl border border-gray-100 dark:border-[#3D312A] z-10"
            >
              <h3 className="text-xl font-black text-gray-900 dark:text-[#E6DFD5] mb-2 uppercase tracking-tight">{t("settings.editAvatarTitle")}</h3>
              <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-6">{t("settings.editAvatarDesc")}</p>

              {/* Crop Canvas/Viewport area */}
              <div className="flex justify-center mb-6">
                <div 
                  className="relative w-[360px] h-[360px] bg-neutral-900 rounded-[28px] overflow-hidden cursor-grab active:cursor-grabbing border border-gray-100 dark:border-[#4D3D32] flex items-center justify-center select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onWheel={handleWheel}
                >
                  <img
                    src={imageSrc}
                    alt={t("settings.avatarLabel")}
                    draggable={false}
                    onLoad={handleImageLoad}
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    className="max-w-full max-h-full object-contain pointer-events-none select-none"
                  />
                  {/* Dark mask overlay with a circle highlight cutout */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[280px] h-[280px] rounded-full border-2 border-dashed border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]" />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-5 mb-8">
                {/* Zoom */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-[#9A8A7A] uppercase tracking-wider">
                    <span>{t("settings.zoom")}</span>
                    <span>{zoom.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range"
                    min={minZoom}
                    max={minZoom * 4}
                    step="0.01"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-100 dark:bg-[#4D3D32] rounded-lg appearance-none cursor-pointer accent-brand"
                  />
                </div>

                {/* Rotation */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-[#9A8A7A] uppercase tracking-wider">
                    <span>{t("settings.rotate")}</span>
                    <span>{rotation}°</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-100 dark:bg-[#4D3D32] rounded-lg appearance-none cursor-pointer accent-brand"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setShowCropModal(false);
                    setImageSrc(null);
                  }}
                  className="flex-1 py-3.5 text-gray-500 dark:text-[#9A8A7A] text-sm font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-[#3D312A] transition-colors cursor-pointer"
                >
                  {t("settings.cancel")}
                </button>
                <button 
                  type="button"
                  onClick={handleCropSave}
                  className="flex-1 py-3.5 bg-brand text-white text-sm font-bold rounded-2xl hover:bg-brand-hover transition-all shadow-lg shadow-brand/20 dark:shadow-none cursor-pointer"
                >
                  {t("settings.confirmCrop")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <h3 className="text-xl font-bold text-gray-900 dark:text-[#E6DFD5] mb-2">{t("settings.changePassword")}</h3>
              <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-8">{t("settings.changePasswordDesc")}</p>

              <form onSubmit={handlePasswordChange} className="space-y-5">
                <div>
                  <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{t("settings.currentPassword")}</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.old}
                    onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{t("settings.newPassword")}</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.new}
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{t("settings.confirmNewPassword")}</label>
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
                    {t("settings.cancel")}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3.5 bg-brand text-white text-sm font-bold rounded-2xl hover:bg-brand-hover transition-all shadow-lg shadow-brand/20 dark:shadow-none"
                  >
                    {t("settings.updateBtn")}
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
              <h3 className="text-xl font-bold text-gray-900 dark:text-[#E6DFD5] mb-2">{t("settings.confirmDeleteTitle")}</h3>
              <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-8">
                {t("settings.confirmDeleteDesc")}
              </p>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3.5 text-gray-500 dark:text-[#9A8A7A] text-sm font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-[#3D312A] transition-colors"
                >
                  {t("settings.cancel")}
                </button>
                <button 
                  onClick={handleAccountDeletion}
                  className="flex-1 py-3.5 bg-red-500 text-white text-sm font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-200 dark:shadow-none"
                >
                  {t("settings.confirmDeleteBtn")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Avatar History Gallery Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#2A2420] text-[#3D312A] dark:text-[#E6DFD5] rounded-[32px] p-8 shadow-2xl border border-gray-100 dark:border-[#3D312A] z-10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#3D312A] mb-6">
                <div className="w-9" />
                <h3 className="text-lg font-black text-[#3D312A] dark:text-[#E6DFD5] uppercase tracking-tight text-center">{t("settings.selectAvatarTitle")}</h3>
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="w-9 h-9 rounded-full bg-[#FDFBF7] dark:bg-[#3D312A] hover:bg-[#F4EAD5] dark:hover:bg-gray-700 flex items-center justify-center text-[#7A6A5A] dark:text-[#C8BFB0] border border-[#E6DFD5] dark:border-[#4D3D32] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload Action Row */}
              <div className="flex gap-3 mb-6">
                <button 
                  onClick={() => {
                    setShowHistoryModal(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 py-3.5 bg-brand hover:bg-brand-hover text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  {t("settings.uploadPhotoBtn")}
                </button>
                {avatar && (
                  <button 
                    onClick={() => {
                      setShowHistoryModal(false);
                      const lastCropped = localStorage.getItem(lastCroppedAvatarKey);
                      const isSameAvatar = lastCropped && (lastCropped === avatar);
                      
                      const storedOriginal = isSameAvatar ? localStorage.getItem(originalAvatarKey) : null;
                      const storedParams = isSameAvatar ? localStorage.getItem(cropParamsKey) : null;
                      
                      setImageSrc(storedOriginal || avatar);
                      setTempOriginalImage(storedOriginal || avatar);
                      
                      if (storedParams) {
                        try {
                          const params = JSON.parse(storedParams);
                          setZoom(params.zoom ?? 1);
                          setRotation(params.rotation ?? 0);
                          setOffset(params.offset ?? { x: 0, y: 0 });
                        } catch (e) {
                          setZoom(1);
                          setRotation(0);
                          setOffset({ x: 0, y: 0 });
                        }
                      } else {
                        setZoom(1);
                        setRotation(0);
                        setOffset({ x: 0, y: 0 });
                      }
                      
                      setShowCropModal(true);
                    }}
                    className="w-12 h-12 bg-[#FDFBF7] dark:bg-[#3D312A] hover:bg-[#F4EAD5] dark:hover:bg-gray-700 rounded-2xl flex items-center justify-center text-[#7A6A5A] dark:text-[#C8BFB0] border border-[#E6DFD5] dark:border-[#4D3D32] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Suggested Photos Section */}
              <div className="mb-6">
                <h4 className="text-[13px] font-bold text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wider block mb-3 pl-1">{t("settings.uploadedPhotos")}</h4>
                {avatarHistory.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none">
                    {avatarHistory.map((item: any, idx: number) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setImageSrc(item.original);
                          setTempOriginalImage(item.original);
                          setZoom(item.params?.zoom ?? 1);
                          setRotation(item.params?.rotation ?? 0);
                          setOffset(item.params?.offset ?? { x: 0, y: 0 });
                          setShowHistoryModal(false);
                          setShowCropModal(true);
                        }}
                        className="w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-50 dark:bg-[#3D312A] border border-[#E6DFD5] dark:border-[#4D3D32] hover:border-brand dark:hover:border-brand cursor-pointer hover:opacity-85 relative transition-all"
                      >
                        <img 
                          src={item.cropped} 
                          alt={`${t("sidebar.history")} ${idx}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-[#FDFBF7] dark:bg-[#3D312A]/30 rounded-2xl border border-dashed border-[#E6DFD5] dark:border-[#4D3D32]">
                    <p className="text-sm text-[#7A6A5A] dark:text-[#9A8A7A]">{t("settings.noUploadedPhotos")}</p>
                  </div>
                )}
              </div>

              {/* Footer Xem Thêm Button */}
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-3.5 bg-[#FDFBF7] dark:bg-[#3D312A] hover:bg-[#F4EAD5] dark:hover:bg-gray-700 text-[#7A6A5A] dark:text-[#C8BFB0] text-sm font-bold rounded-2xl border border-[#E6DFD5] dark:border-[#4D3D32] transition-colors cursor-pointer"
              >
                {t("settings.viewMore")}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Info Card */}
      <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A] relative overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-1">{t("settings.accountTitle")}</h2>
            <p className="text-sm text-gray-500 dark:text-[#9A8A7A]">{t("settings.accountSubtitle")}</p>
          </div>
        </div>

        {/* Cover Photo Section */}
        <div className="mb-8">
          <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-3 pl-1">{t("settings.coverPhoto")}</label>
          <div className="relative group rounded-3xl overflow-hidden border border-gray-100 dark:border-[#4D3D32] bg-gray-50 dark:bg-[#2A2420] h-36 flex items-center justify-center">
            {cover ? (
              <img src={cover} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-brand via-pink-500 to-red-500 opacity-90 flex items-center justify-center">
                <div className="text-white text-xs font-bold uppercase tracking-wider opacity-60">{t("settings.noCoverPhoto")}</div>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button 
                type="button"
                onClick={() => coverFileInputRef.current?.click()}
                className="px-4 py-2 bg-white/20 hover:bg-white/35 backdrop-blur-md text-white font-bold text-xs rounded-xl flex items-center gap-2 border border-white/20 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                {t("settings.changeCoverBtn")}
              </button>
            </div>
          </div>
          <div className="mt-2 pl-1">
            <p className="text-[11px] text-gray-400">{t("settings.coverRules")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Avatar Column */}
          <div className="flex flex-col items-center md:items-start w-full">
            <div className="flex flex-col items-center w-fit">
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4">{t("settings.avatarLabel")}</label>
              <div className="relative group">
                <div 
                  onClick={() => setShowHistoryModal(true)}
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
                  onClick={() => setShowHistoryModal(true)}
                  className="absolute bottom-0 right-0 w-9 h-9 bg-brand text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-[#3D312A] hover:bg-brand-hover transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="text-[11px] text-gray-400 mb-2">{t("settings.avatarRules")}</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <button 
                    onClick={() => setShowHistoryModal(true)}
                    className="px-4 py-2 bg-gray-50 dark:bg-[#3D312A] text-gray-700 dark:text-[#C8BFB0] text-xs font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer border border-gray-100 dark:border-[#4D3D32]"
                  >
                    {t("settings.changeAvatarBtn")}
                  </button>
                  {avatar && (
                    <button 
                      onClick={() => {
                        const lastCropped = localStorage.getItem(lastCroppedAvatarKey);
                        const isSameAvatar = lastCropped && (lastCropped === avatar);
                        
                        const storedOriginal = isSameAvatar ? localStorage.getItem(originalAvatarKey) : null;
                        const storedParams = isSameAvatar ? localStorage.getItem(cropParamsKey) : null;
                        
                        setImageSrc(storedOriginal || avatar);
                        setTempOriginalImage(storedOriginal || avatar);
                        
                        if (storedParams) {
                          try {
                            const params = JSON.parse(storedParams);
                            setZoom(params.zoom ?? 1);
                            setRotation(params.rotation ?? 0);
                            setOffset(params.offset ?? { x: 0, y: 0 });
                          } catch (e) {
                            setZoom(1);
                            setRotation(0);
                            setOffset({ x: 0, y: 0 });
                          }
                        } else {
                          setZoom(1);
                          setRotation(0);
                          setOffset({ x: 0, y: 0 });
                        }
                        
                        setShowCropModal(true);
                      }}
                      className="px-4 py-2 bg-brand/10 text-brand dark:text-[#E8735A] text-xs font-bold rounded-xl hover:bg-brand/20 transition-colors cursor-pointer border border-brand/25"
                    >
                      {t("settings.editBtn")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Column */}
          <div className="space-y-5">
            <div>
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{t("settings.fullNameLabel")}</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder={t("settings.fullNamePlaceholder")}
                  className="flex-1 bg-gray-50 dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-[#E6DFD5] focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                />
                <button 
                  onClick={handleSaveName}
                  className="px-6 py-2 bg-brand text-white text-xs font-bold rounded-2xl hover:bg-brand-hover transition-all shadow-md shadow-brand/20 dark:shadow-none active:scale-95 cursor-pointer flex-shrink-0"
                >
                  {t("settings.saveBtn")}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                {isEmail ? "Email" : "User Name"}
              </label>
              <div className="relative">
                <input 
                  type={isEmail ? "email" : "text"} 
                  value={accountEmail || ""}
                  disabled
                  className="w-full bg-gray-100/50 dark:bg-[#3D312A]/50 border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                />
                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                User ID
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={userId}
                  readOnly
                  className="flex-1 bg-gray-100/50 dark:bg-[#3D312A]/50 border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm font-medium text-gray-400 cursor-default select-all"
                />
                <button 
                  type="button"
                  onClick={handleCopyId}
                  className="px-5 py-2 bg-brand/10 hover:bg-brand/20 dark:bg-brand/20 dark:hover:bg-brand/35 text-brand dark:text-[#E8735A] text-xs font-bold rounded-2xl transition-all shadow-sm active:scale-95 cursor-pointer flex-shrink-0 flex items-center justify-center gap-1.5 border border-brand/20"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? t("settings.copied") : t("settings.copy")}
                </button>
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
                <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5]">{t("settings.googleLinkedAccount")}</h4>
                <p className="text-[12px] text-gray-500 dark:text-[#9A8A7A]">{t("settings.googleLinkedAccountDesc")}</p>
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
                  <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5]">{t("settings.changePassword")}</h4>
                  <p className="text-[12px] text-gray-500 dark:text-[#9A8A7A]">{t("settings.changePasswordSubtitle")}</p>
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
                  <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5]">{t("settings.confirmDeleteBtn")}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-[#9A8A7A]">{t("settings.deleteAccountSubtitle")}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-white dark:bg-[#3D312A] border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl hover:bg-red-600 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {t("settings.confirmDeleteBtn")}
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-[32px] bg-gray-50 dark:bg-[#3D312A]/30 border border-gray-100 dark:border-[#3D312A] flex items-center gap-4 opacity-70">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#3D312A] flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 dark:border-[#4D3D32]">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5]">{t("settings.confirmDeleteBtn")}</h4>
                <p className="text-[11px] text-gray-500 dark:text-[#9A8A7A]">{t("settings.googleLinkedAccountDesc")}</p>
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
  const { t, language, setLanguage } = useLanguage();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const themes = [
    { id: "light", label: t("settings.themeLight"), icon: Sun, desc: t("settings.themeLightDesc") },
    { id: "dark", label: t("settings.themeDark"), icon: Moon, desc: t("settings.themeDarkDesc") },
    { id: "system", label: t("settings.themeSystem"), icon: Monitor, desc: t("settings.themeSystemDesc") },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Theme Selection */}
      <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-1">{t("settings.theme")}</h2>
        <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-8">{t("settings.themeDesc")}</p>
        
        <div className="flex gap-4">
          {themes.map((tItem) => (
            <button
              key={tItem.id}
              onClick={() => setTheme(tItem.id)}
              className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 cursor-pointer ${
                theme === tItem.id
                  ? "border-brand bg-brand-muted/30 dark:bg-brand/10"
                  : "border-gray-50 dark:border-[#3D312A] hover:border-gray-200 dark:hover:border-gray-700"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === tItem.id ? "text-brand dark:text-[#E8735A] bg-white shadow-sm" : "text-gray-400 bg-gray-50 dark:bg-[#3D312A]"}`}>
                <tItem.icon className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className={`text-xs font-bold ${theme === tItem.id ? "text-gray-900 dark:text-[#E6DFD5]" : "text-gray-500"}`}>{tItem.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{tItem.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-50 dark:border-[#3D312A]">
          <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-3">{t("settings.language")}</label>
          <div className="relative">
            <button 
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="w-full bg-gray-50 dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-brand dark:text-[#E8735A]" />
                <span className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5]">
                  {language === "vi" ? "Tiếng Việt" : "English"}
                </span>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${langDropdownOpen ? "rotate-90" : "group-hover:translate-x-1"}`} />
            </button>

            <AnimatePresence>
              {langDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setLangDropdownOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-2xl p-2 shadow-lg z-20 flex flex-col gap-1 overflow-hidden"
                  >
                    {[
                      { code: "vi", name: "Tiếng Việt" },
                      { code: "en", name: "English" },
                    ].map((langItem) => (
                      <button
                        key={langItem.code}
                        onClick={() => {
                          setLanguage(langItem.code as any);
                          setLangDropdownOpen(false);
                          toast.success(langItem.code === "vi" ? "Đã chuyển đổi sang Tiếng Việt!" : "Language switched to English!");
                        }}
                        className={`w-full px-4 py-3 rounded-xl text-left text-sm font-bold transition-colors cursor-pointer flex items-center justify-between ${
                          language === langItem.code 
                            ? "bg-brand/10 text-brand dark:text-[#E8735A]" 
                            : "text-gray-700 dark:text-[#E6DFD5] hover:bg-gray-50 dark:hover:bg-[#4D3D32]"
                        }`}
                      >
                        <span>{langItem.name}</span>
                        {language === langItem.code && <Check className="w-4 h-4 text-brand dark:text-[#E8735A]" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}


function PrivacySettings() {
  const { t } = useLanguage();

  return (
    <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A]">
      <h2 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-1">{t("settings.privacyTitle")}</h2>
      <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-8">{t("settings.privacySubtitle")}</p>

      <div className="space-y-4">
        {[
          { icon: MapPin, title: t("settings.allowLocation"), desc: t("settings.allowLocationDesc"), active: true },
          { icon: ShieldCheck, title: t("settings.allowAIPersonalization"), desc: t("settings.allowAIPersonalizationDesc"), active: false }
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
            <div 
              onClick={() => toast.info(t("settings.featureComingSoon"))}
              className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${item.active ? 'bg-brand' : 'bg-gray-200 dark:bg-[#4D3D32]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.active ? 'left-7' : 'left-1'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PersonalizationData {
  favorite_dishes: string[];
  spicy_level: string;
  dietary_restrictions: string[];
  allergies: string[];
  budget: string;
  location: string;
  age: number | '';
}

const DIETARY_OPTS = [
  { id: 'vegan', label: 'Thuần chay', labelKey: 'settings.dietaryVegan' },
  { id: 'vegetarian', label: 'Ăn chay', labelKey: 'settings.dietaryVegetarian' },
  { id: 'halal', label: 'Halal', labelKey: 'settings.dietaryHalal' }
];

const ALLERGY_OPTS = [
  { id: 'milk', label: 'Sữa', labelKey: 'settings.allergyMilk' },
  { id: 'egg', label: 'Trứng', labelKey: 'settings.allergyEgg' },
  { id: 'gluten', label: 'Gluten', labelKey: 'settings.allergyGluten' },
  { id: 'seafood', label: 'Hải sản', labelKey: 'settings.allergySeafood' },
  { id: 'fish', label: 'Cá', labelKey: 'settings.allergyFish' },
  { id: 'peanut', label: 'Đậu phộng', labelKey: 'settings.allergyPeanut' },
  { id: 'soy', label: 'Đậu nành', labelKey: 'settings.allergySoy' }
];

const SPICY_OPTIONS = [
  { id: 'none', label: '0% Cay', labelKey: 'settings.spicyNone' },
  { id: 'mild', label: '25% Cay', labelKey: 'settings.spicyMild' },
  { id: 'medium', label: '50% Cay', labelKey: 'settings.spicyMedium' },
  { id: 'hot', label: '75% Cay', labelKey: 'settings.spicyHot' },
  { id: 'extra_hot', label: 'MAX LEVEL', labelKey: 'settings.spicyExtraHot' },
];

const BUDGET_OPTIONS = [
  { id: 'low', label: 'Bình dân', desc: 'Dưới 50k - Học sinh/Sinh viên', labelKey: 'settings.budgetLow', descKey: 'settings.budgetLowDesc' },
  { id: 'medium', label: 'Tầm trung', desc: '50k - 200k - Ăn ngon, view ổn', labelKey: 'settings.budgetMedium', descKey: 'settings.budgetMediumDesc' },
  { id: 'high', label: 'Cao cấp', desc: 'Trên 200k - Sang trọng, Fine dining', labelKey: 'settings.budgetHigh', descKey: 'settings.budgetHighDesc' },
];

function PersonalizationSettings() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<PersonalizationData>({
    favorite_dishes: [],
    spicy_level: '',
    dietary_restrictions: [],
    allergies: [],
    budget: '',
    location: '',
    age: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newDish, setNewDish] = useState("");

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const userId = localStorage.getItem("user_id");
        const token = localStorage.getItem("access_token");
        if (!userId || !token) return;

        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
        const res = await fetch(`${API_BASE}/api/v1/users/${userId}/onboarding`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          
          const normalizeString = (str: string) => str.normalize("NFC").toLowerCase().trim();
          const titleCase = (str: string) => {
            return str
              .toLowerCase()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          };

          const mappedDietary = (data.dietary_restrictions || []).map(
            (label: string) => DIETARY_OPTS.find(o => normalizeString(o.label) === normalizeString(label))?.id || label
          );
          if (data.is_vegetarian && !mappedDietary.includes('vegetarian') && !mappedDietary.includes('vegan')) {
            mappedDietary.push('vegetarian');
          }
          const mappedAllergies = (data.allergies || []).map(
            (label: string) => ALLERGY_OPTS.find(o => normalizeString(o.label) === normalizeString(label))?.id || label
          );

          const rawFavs = data.favorite_dishes || [];
          const normalizedFavs = rawFavs.map((dish: string) => titleCase(dish));

          setFormData({
            favorite_dishes: normalizedFavs,
            spicy_level: data.spicy_level || '',
            dietary_restrictions: mappedDietary,
            allergies: mappedAllergies,
            budget: data.budget || '',
            location: data.location || '',
            age: data.age || '',
          });
        }
      } catch (err) {
        console.warn("Failed to fetch preferences:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const toggleDietary = (id: string) => {
    setFormData(prev => {
      const current = prev.dietary_restrictions;
      if (current.includes(id)) {
        return { ...prev, dietary_restrictions: current.filter(item => item !== id) };
      } else {
        return { ...prev, dietary_restrictions: [...current, id] };
      }
    });
  };

  const toggleAllergy = (id: string) => {
    setFormData(prev => {
      const current = prev.allergies;
      if (current.includes(id)) {
        return { ...prev, allergies: current.filter(item => item !== id) };
      } else {
        return { ...prev, allergies: [...current, id] };
      }
    });
  };

  const handleAddDish = () => {
    if (newDish.trim()) {
      if (formData.favorite_dishes.includes(newDish.trim())) {
        toast.info(t("settings.dishAlreadyAdded"));
        return;
      }
      setFormData(prev => ({
        ...prev,
        favorite_dishes: [...prev.favorite_dishes, newDish.trim()]
      }));
      setNewDish("");
    }
  };

  const handleRemoveDish = (dish: string) => {
    setFormData(prev => ({
      ...prev,
      favorite_dishes: prev.favorite_dishes.filter(d => d !== dish)
    }));
  };

  const handleSave = async () => {
    if (formData.favorite_dishes.length < 3) {
      toast.error(t("settings.atLeastThreeDishes"));
      return;
    }
    if (!formData.spicy_level) {
      toast.error(t("settings.selectSpicy"));
      return;
    }
    if (!formData.budget) {
      toast.error(t("settings.selectBudget"));
      return;
    }
    if (!formData.location) {
      toast.error(t("settings.enterLocation"));
      return;
    }
    if (!formData.age || formData.age < 13 || formData.age > 120) {
      toast.error(t("settings.invalidAge"));
      return;
    }

    setSaving(true);
    try {
      const userId = localStorage.getItem("user_id");
      const token = localStorage.getItem("access_token");
      if (!userId || !token) return;

      const payload = {
        ...formData,
        dietary_restrictions: formData.dietary_restrictions.map(
          id => DIETARY_OPTS.find(o => o.id === id)?.label || id
        ),
        allergies: formData.allergies.map(
          id => ALLERGY_OPTS.find(o => o.id === id)?.label || id
        ),
        is_vegetarian: formData.dietary_restrictions.includes('vegan') || formData.dietary_restrictions.includes('vegetarian'),
      };

      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
      const res = await fetch(`${API_BASE}/api/v1/users/${userId}/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(t("settings.updatePreferencesSuccess"));
      } else {
        toast.error(t("settings.updatePreferencesFailed"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("settings.savingError"));
    } finally {
      setSaving(false);
    }
  };

  const SUGGESTED_DISHES = ["Cơm Tấm", "Phở", "Bún Bò Huế", "Bánh Mì", "Hủ Tiếu", "Mì Quảng", "Pizza", "Sushi", "Gà Rán", "Trà Sữa"];

  return (
    <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A] space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-1">{t("settings.aiPersonalizationTitle")}</h2>
        <p className="text-sm text-gray-500 dark:text-[#9A8A7A]">{t("settings.aiPersonalizationDesc")}</p>
      </div>

      <div className="space-y-6">
        {/* Favorite Dishes */}
        <div>
          <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{t("settings.favoriteDishesLabel")}</label>
          <div className="flex gap-2 mb-3">
            <input 
              type="text" 
              value={newDish}
              onChange={(e) => setNewDish(e.target.value)}
              placeholder={t("settings.placeholderDish")}
              className="flex-1 bg-gray-50 dark:bg-[#2A2420]/50 border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3 text-sm font-medium text-gray-900 dark:text-[#E6DFD5] focus:ring-4 focus:ring-brand/10 dark:focus:ring-[#E8735A]/10 focus:border-brand dark:focus:border-[#E8735A] outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDish())}
            />
            <button 
              onClick={handleAddDish}
              className="px-6 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              {t("settings.addDishBtn")}
            </button>
          </div>

          {/* Selected tag display */}
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.favorite_dishes.map((dish, idx) => (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-brand/5 dark:bg-[#E8735A]/15 text-brand dark:text-[#E8735A] border border-brand/20 dark:border-[#E8735A]/30 shadow-sm dark:shadow-[0_0_12px_rgba(232,115,90,0.2)]"
              >
                {dish}
                <button onClick={() => handleRemoveDish(dish)} className="hover:text-brand-hover cursor-pointer ml-1 font-bold">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          {/* Suggested tags */}
          <div className="space-y-1.5">
            <p className="text-[11px] text-gray-400">{t("settings.popularSuggestions")}</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_DISHES.map((dish, idx) => {
                const isSelected = formData.favorite_dishes.includes(dish);
                return (
                  <button
                    key={idx}
                    disabled={isSelected}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, favorite_dishes: [...prev.favorite_dishes, dish] }));
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-gray-150 dark:bg-[#4D3D32] text-gray-400 border-gray-200 dark:border-[#4D3D32] cursor-not-allowed" 
                        : "bg-[#FDFBF7] dark:bg-[#2A2420]/80 text-[#7A6A5A] dark:text-[#E6DFD5] border-[#E6DFD5] dark:border-[#4D3D32] hover:border-brand dark:hover:border-[#E8735A] hover:text-brand dark:hover:text-[#E8735A]"
                    }`}
                  >
                    + {dish}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Spicy Preference */}
        <div>
          <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{t("settings.spicyLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {SPICY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFormData(prev => ({ ...prev, spicy_level: opt.id }))}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                  formData.spicy_level === opt.id
                    ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-500/20 dark:bg-red-500 dark:border-red-500 dark:text-white dark:shadow-[0_0_15px_rgba(239,68,68,0.55)]"
                    : "bg-[#FDFBF7] dark:bg-[#2A2420]/80 text-[#7A6A5A] dark:text-[#E6DFD5] border-[#E6DFD5] dark:border-[#4D3D32] hover:border-red-500 hover:text-red-500 dark:hover:border-red-500 dark:hover:text-red-400"
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Budget Preference */}
        <div>
          <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{t("settings.budgetLabel")}</label>
          <div className="flex flex-col gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFormData(prev => ({ ...prev, budget: opt.id }))}
                className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                  formData.budget === opt.id
                    ? "bg-brand/5 border-brand text-brand dark:bg-[#E8735A]/15 dark:border-[#E8735A]/60 dark:text-[#E8735A] dark:shadow-[0_0_15px_rgba(232,115,90,0.35)]"
                    : "bg-[#FDFBF7] dark:bg-[#2A2420]/80 text-[#7A6A5A] dark:text-[#E6DFD5] border-[#E6DFD5] dark:border-[#4D3D32] hover:bg-[#F4EAD5] hover:dark:bg-[#3D312A] hover:border-brand dark:hover:border-[#E8735A]"
                }`}
              >
                <div className="font-bold text-sm">{t(opt.labelKey)}</div>
                <div className="text-xs text-gray-400 mt-1">{t(opt.descKey)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div>
          <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{t("settings.dietaryLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTS.map((opt) => {
              const isSelected = formData.dietary_restrictions.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleDietary(opt.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500 dark:border-emerald-400 shadow-md shadow-emerald-500/20 dark:shadow-[0_0_15px_rgba(52,211,153,0.55)]"
                      : "bg-[#FDFBF7] dark:bg-[#2A2420]/80 text-[#7A6A5A] dark:text-[#E6DFD5] border-[#E6DFD5] dark:border-[#4D3D32] hover:bg-[#F4EAD5] hover:dark:bg-[#3D312A] hover:border-emerald-500 hover:text-emerald-500 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Allergies */}
        <div>
          <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{t("settings.allergyLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTS.map((opt) => {
              const isSelected = formData.allergies.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleAllergy(opt.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-500 dark:border-red-400 shadow-md shadow-red-500/20 dark:shadow-[0_0_15px_rgba(239,68,68,0.55)]"
                      : "bg-[#FDFBF7] dark:bg-[#2A2420]/80 text-[#7A6A5A] dark:text-[#E6DFD5] border-[#E6DFD5] dark:border-[#4D3D32] hover:bg-[#F4EAD5] hover:dark:bg-[#3D312A] hover:border-red-500 hover:text-red-500 dark:hover:border-red-500 dark:hover:text-red-400"
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location & Age */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{t("settings.locationLabel")}</label>
            <input 
              type="text" 
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder={t("settings.placeholderLocation")}
              className="w-full bg-gray-50 dark:bg-[#2A2420]/50 border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-[#E6DFD5] focus:ring-4 focus:ring-brand/10 dark:focus:ring-[#E8735A]/10 focus:border-brand dark:focus:border-[#E8735A] outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-wider block mb-2">{t("settings.ageLabel")}</label>
            <input 
              type="number" 
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value ? parseInt(e.target.value) : '' }))}
              placeholder={t("settings.placeholderAge")}
              className="w-full bg-gray-50 dark:bg-[#2A2420]/50 border border-gray-100 dark:border-[#4D3D32] rounded-2xl px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-[#E6DFD5] focus:ring-4 focus:ring-brand/10 dark:focus:ring-[#E8735A]/10 focus:border-brand dark:focus:border-[#E8735A] outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-[#3D312A] flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-bold rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {saving ? t("settings.savingInProgress") : t("settings.syncWithAI")}
        </button>
      </div>
    </div>
  );
}

