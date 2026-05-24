"use client";

import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { friendService, Friend } from "../../services/friendService";
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useLanguage } from "../../components/LanguageProvider";

interface MyProfile {
  id: string;
  username: string;
  full_name?: string | null;
}

export default function FriendsPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  
  // States
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  
  // Unfriend dialog confirmation state
  const [unfriendTarget, setUnfriendTarget] = useState<Friend | null>(null);
  
  // Copy state feedbacks
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const storedUsername = localStorage.getItem("user_email");
    if (!userId) {
      toast.error(t("friends.pleaseLogin"));
      router.push("/auth");
      return;
    }

    setMyProfile({
      id: userId,
      username: storedUsername || "",
    });

    // Load user profile from backend to get fresh info
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
          setMyProfile({
            id: data.id,
            username: data.username,
            full_name: data.full_name
          });
        }
      } catch (err) {
        console.warn("Profile refresh failed:", err);
      }
    };

    const loadFriends = async () => {
      try {
        setLoading(true);
        const data = await friendService.fetchFriends();
        setFriends(data);
      } catch (err: any) {
        toast.error(err.message || t("friends.loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    loadFriends();
  }, [router, t]);

  // Handle Add Friend
  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = addUsername.trim();
    if (!target) return;

    if (myProfile && target.toLowerCase() === myProfile.username.toLowerCase()) {
      toast.error(t("friends.cantAddSelf"));
      return;
    }

    try {
      setActionLoading(true);
      await friendService.addFriend(target);
      toast.success(t("friends.addSuccess").replace("{target}", target));
      setAddUsername("");
      
      // Reload friends list
      const data = await friendService.fetchFriends();
      setFriends(data);
    } catch (err: any) {
      toast.error(err.message || t("friends.addError"));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Remove Friend Confirmation
  const handleConfirmUnfriend = async () => {
    if (!unfriendTarget) return;

    try {
      setActionLoading(true);
      await friendService.removeFriend(unfriendTarget.friend_id);
      toast.success(t("friends.removeSuccess").replace("{target}", unfriendTarget.full_name || unfriendTarget.username));
      
      // Update local state
      setFriends(friends.filter(f => f.friend_id !== unfriendTarget.friend_id));
      setUnfriendTarget(null);
    } catch (err: any) {
      toast.error(err.message || t("friends.removeError"));
    } finally {
      setActionLoading(false);
    }
  };

  // Copy to Clipboard Helpers
  const copyToClipboard = (text: string, type: "id" | "username") => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error(t("friends.copyBrowserError"));
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(t("friends.copySuccess"));
    
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
    }
  };

  // Filter friends list
  const filteredFriends = friends.filter(friend => {
    const searchLower = localSearch.toLowerCase();
    const usernameMatch = friend.username.toLowerCase().includes(searchLower);
    const fullNameMatch = friend.full_name?.toLowerCase().includes(searchLower) || false;
    return usernameMatch || fullNameMatch;
  });

  return (
    <PageLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-black text-[#3D312A] dark:text-[#E6DFD5] flex items-center gap-3">
            <Users className="w-8 h-8 text-brand dark:text-[#E8735A]" />
            {t("friends.title")}
          </h1>
          <p className="text-gray-500 dark:text-[#9A8A7A] mt-2">
            {t("friends.desc")}
          </p>
        </div>

        {/* Top Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Add Friend Panel */}
          <div className="md:col-span-7 bg-[#FFFDF9] dark:bg-[#3D312A] p-6 rounded-3xl border border-[#3D312A]/10 dark:border-[#4D3D32] shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-brand dark:text-[#E8735A]" />
              <h2 className="font-bold text-[#3D312A] dark:text-[#E6DFD5] text-lg">{t("friends.addNewFriend")}</h2>
            </div>
            
            <form onSubmit={handleAddFriend} className="flex gap-3">
              <input
                type="text"
                placeholder={t("friends.placeholderUsername")}
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-[#4D3D32] bg-gray-50/50 dark:bg-[#2A2420] text-gray-900 dark:text-[#E6DFD5] focus:outline-none focus:ring-2 focus:ring-brand/30 dark:focus:ring-brand-on-dark/30 transition-all font-medium placeholder-gray-400 dark:placeholder-[#6A5A4A]"
              />
              <button
                type="submit"
                disabled={actionLoading || !addUsername.trim()}
                className="px-6 py-3 bg-brand hover:bg-brand-hover dark:bg-[#E8735A] dark:hover:bg-[#d85e46] disabled:bg-brand/50 disabled:dark:bg-[#E8735A]/50 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all duration-200 cursor-pointer disabled:cursor-not-allowed hover:scale-[1.01]"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {t("friends.addBtn")}
              </button>
            </form>
            
            <p className="text-xs text-gray-400 dark:text-[#8A7A6A] mt-3 flex items-start gap-1">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{t("friends.biDirectionalInfo")}</span>
            </p>
          </div>

          {/* User Info / Share Profile Panel */}
          <div className="md:col-span-5 bg-[#FFFDF9] dark:bg-[#3D312A] p-6 rounded-3xl border border-[#3D312A]/10 dark:border-[#4D3D32] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-[#3D312A] dark:text-[#E6DFD5] text-lg">{t("friends.yourAccount")}</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-[#9A8A7A] mb-4">
                {t("friends.yourAccountDesc")}
              </p>
            </div>

            {myProfile ? (
              <div className="space-y-3">
                {/* Username Share */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#2A2420] border border-gray-100 dark:border-[#4D3D32]">
                  <div className="overflow-hidden">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-[#6A5A4A] block">
                      {t("friends.usernameLabel")}
                    </span>
                    <span className="font-bold text-[#3D312A] dark:text-[#E6DFD5] text-sm block truncate">
                      {myProfile.username}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(myProfile.username, "username")}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#4D3D32] transition-colors cursor-pointer text-gray-500 dark:text-gray-400"
                    title={t("friends.copyUsernameTooltip")}
                  >
                    {copiedUsername ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* ID Share */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#2A2420] border border-gray-100 dark:border-[#4D3D32]">
                  <div className="overflow-hidden">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-[#6A5A4A] block">
                      {t("friends.userIdLabel")}
                    </span>
                    <span className="font-mono text-xs text-gray-500 dark:text-[#9A8A7A] block truncate max-w-[200px]">
                      {myProfile.id}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(myProfile.id, "id")}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#4D3D32] transition-colors cursor-pointer text-gray-500 dark:text-gray-400"
                    title={t("friends.copyUserIdTooltip")}
                  >
                    {copiedId ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
              </div>
            )}
          </div>
        </div>

        {/* Friends List Card container */}
        <div className="bg-[#FFFDF9] dark:bg-[#3D312A] p-6 md:p-8 rounded-3xl border border-[#3D312A]/10 dark:border-[#4D3D32] shadow-[0_4px_20px_rgba(0,0,0,0.02)] min-h-[400px]">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#3D312A] dark:text-[#E6DFD5] flex items-center gap-2">
                {t("friends.friendsListTitle")}
                <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-brand-muted dark:bg-[#A91B0D]/20 text-brand dark:text-[#E8735A]">
                  {friends.length}
                </span>
              </h2>
            </div>

            {/* Filter Search Input */}
            {friends.length > 0 && (
              <div className="relative w-full sm:w-[240px]">
                <Search className="w-4 h-4 text-gray-400 dark:text-[#8A7A6A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t("friends.searchPlaceholder")}
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#4D3D32] bg-gray-50/50 dark:bg-[#2A2420] text-gray-900 dark:text-[#E6DFD5] focus:outline-none focus:ring-2 focus:ring-brand/30 dark:focus:ring-brand-on-dark/30 transition-all placeholder-gray-400 dark:placeholder-[#6A5A4A]"
                />
              </div>
            )}
          </div>

          {/* Friends Display Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-brand dark:text-[#E8735A] mb-3" />
              <p className="text-gray-400 dark:text-[#9A8A7A] text-sm">{t("friends.loadingText")}</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-muted dark:bg-[#A91B0D]/10 flex items-center justify-center text-brand dark:text-[#E8735A] mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 dark:text-[#E6DFD5] mb-2">{t("friends.noFriendsTitle")}</h3>
              <p className="text-gray-500 dark:text-[#9A8A7A] max-w-sm mb-6 text-sm">
                {t("friends.noFriendsDesc")}
              </p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 dark:text-[#6A5A4A] mb-3" />
              <p className="text-gray-500 dark:text-[#9A8A7A] text-sm">{t("friends.noMatchText")}</p>
            </div>
          ) : (
            <motion.div 
              layout 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredFriends.map((friend) => {
                  const avatarUrl =
                    friend.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`;

                  return (
                    <motion.div
                      key={friend.friend_id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", damping: 25, stiffness: 350 }}
                      className="bg-white dark:bg-[#2A2420] p-5 rounded-2xl border border-gray-100 dark:border-[#4D3D32] shadow-sm hover:shadow-md dark:hover:shadow-black/10 transition-all flex items-center justify-between group relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 dark:border-[#4D3D32] flex-shrink-0 bg-[#F4EAD5]/50">
                          <img
                            src={avatarUrl}
                            alt={friend.username}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Text info */}
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#3D312A] dark:text-[#E6DFD5] text-sm truncate">
                            {friend.full_name || friend.username}
                          </h4>
                          <p className="text-xs text-gray-400 dark:text-[#9A8A7A] truncate">
                            @{friend.username}
                          </p>
                          <span className="text-[9px] text-gray-400 dark:text-[#7A6A5A] block mt-1 font-medium">
                            {t("friends.friendSince")} {new Date(friend.created_at).toLocaleDateString(language === "en" ? "en-US" : "vi-VN")}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => setUnfriendTarget(friend)}
                        className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer opacity-80 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0"
                        title={t("friends.unfriendTooltip")}
                      >
                        <UserMinus className="w-4.5 h-4.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Unfriend */}
      <Dialog open={!!unfriendTarget} onOpenChange={(open) => !open && setUnfriendTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 dark:text-red-400 flex items-center gap-2 font-black">
              <AlertCircle className="w-5 h-5 text-red-500" />
              {t("friends.unfriendConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="mt-2 text-gray-600 dark:text-gray-300">
              {t("friends.unfriendConfirmDesc").replace("{target}", unfriendTarget?.full_name || unfriendTarget?.username || "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3 justify-end">
            <button
              onClick={() => setUnfriendTarget(null)}
              className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-[#9A8A7A] dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              {t("friends.cancelBtn")}
            </button>
            <button
              onClick={handleConfirmUnfriend}
              disabled={actionLoading}
              className="px-5 py-2.5 text-sm font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-sm cursor-pointer hover:scale-[1.01]"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
              ) : (
                t("friends.confirmDeleteBtn")
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
