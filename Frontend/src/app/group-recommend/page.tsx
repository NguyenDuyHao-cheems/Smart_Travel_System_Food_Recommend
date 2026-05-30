"use client";

import React, { useEffect, useState, useRef } from "react";
import { PageLayout } from "../../components/PageLayout";
import { LoginRequiredModal } from "../../components/LoginRequiredModal";
import { friendService, Friend } from "../../services/friendService";
import { FoodCard } from "../../components/FoodCard";
import { RecommendResult } from "../result/page";
import { InteractiveMapModal } from "../../components/InteractiveMapModal";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { makeAuthenticatedRequest } from '../../utils/apiClient';
import {
  Users,
  Sparkles,
  Loader2,
  AlertTriangle,
  Check,
  Plus,
  Compass,
  ArrowRight,
  Info,
  ShieldCheck,
  UtensilsCrossed,
  MapPin
} from "lucide-react";
import { useLanguage } from "../../components/LanguageProvider";

interface GroupRecommendationResponse {
  results: RecommendResult[];
  group_size: number;
  applied_vegetarian_filter: boolean;
  applied_allergies: string[];
}

export default function GroupRecommendPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // App states
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [radius, setRadius] = useState<number>(5.0);
  
  // Recommendation states
  const [recommendations, setRecommendations] = useState<RecommendResult[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [budget, setBudget] = useState<number>(200000); // 200k default
  const [enableBudget, setEnableBudget] = useState<boolean>(false);
  const [groupStats, setGroupStats] = useState<{
    groupSize: number;
    vegetarian: boolean;
    allergies: string[];
    budget?: number | null;
    radius?: number | null;
  } | null>(null);

  // Redux coordinates
  const coords = useSelector((state: RootState) => state.location.coords);
  const address = useSelector((state: RootState) => state.location.address);

  // Custom visual map selection states
  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customAddress, setCustomAddress] = useState<string>("");
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const searchCoords = customCoords || coords;
  const searchAddress = customAddress || address;

  const isMountedRef = useRef(false);

  // Load persisted states on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    if (!storedUserId) {
      setShowLoginModal(true);
      return;
    }
    setUserId(storedUserId);

    try {
      const persistedRecs = localStorage.getItem("group_recs");
      if (persistedRecs) setRecommendations(JSON.parse(persistedRecs));

      const persistedStats = localStorage.getItem("group_rec_stats");
      if (persistedStats) setGroupStats(JSON.parse(persistedStats));

      const persistedHasSearched = localStorage.getItem("group_rec_has_searched");
      if (persistedHasSearched) setHasSearched(JSON.parse(persistedHasSearched));

      const persistedSelectedFriends = localStorage.getItem("group_rec_selected_friends");
      if (persistedSelectedFriends) setSelectedFriendIds(JSON.parse(persistedSelectedFriends));

      const persistedCustomCoords = localStorage.getItem("group_rec_custom_coords");
      if (persistedCustomCoords) setCustomCoords(JSON.parse(persistedCustomCoords));

      const persistedCustomAddress = localStorage.getItem("group_rec_custom_address");
      if (persistedCustomAddress) setCustomAddress(persistedCustomAddress);

      const persistedBudget = localStorage.getItem("group_rec_budget");
      if (persistedBudget) setBudget(JSON.parse(persistedBudget));

      const persistedEnableBudget = localStorage.getItem("group_rec_enable_budget");
      if (persistedEnableBudget) setEnableBudget(JSON.parse(persistedEnableBudget));

      const persistedRadius = localStorage.getItem("group_rec_radius");
      if (persistedRadius) setRadius(JSON.parse(persistedRadius));
    } catch (e) {
      console.error("Failed to load persisted group recommendations state", e);
    }

    // Fetch friends list
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        const data = await friendService.fetchFriends();
        setFriends(data);
      } catch (err: any) {
        console.error("Lỗi khi tải bạn bè:", err);
        toast.error(err.message || t("groupRecommend.cantLoadFriends"));
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, [router, t]);

  // Sync states to localStorage on change
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    
    if (userId) {
      localStorage.setItem("group_recs", JSON.stringify(recommendations));
      localStorage.setItem("group_rec_stats", JSON.stringify(groupStats));
      localStorage.setItem("group_rec_has_searched", JSON.stringify(hasSearched));
      localStorage.setItem("group_rec_selected_friends", JSON.stringify(selectedFriendIds));
      localStorage.setItem("group_rec_custom_coords", JSON.stringify(customCoords || null));
      localStorage.setItem("group_rec_custom_address", customAddress || "");
      localStorage.setItem("group_rec_budget", JSON.stringify(budget));
      localStorage.setItem("group_rec_enable_budget", JSON.stringify(enableBudget));
      localStorage.setItem("group_rec_radius", JSON.stringify(radius));
    }
  }, [recommendations, groupStats, hasSearched, selectedFriendIds, customCoords, customAddress, budget, enableBudget, userId, radius]);

  const toggleSelectFriend = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const selectAllFriends = () => {
    if (selectedFriendIds.length === friends.length) {
      setSelectedFriendIds([]);
    } else {
      setSelectedFriendIds(friends.map((f) => f.friend_id));
    }
  };

  const handleGetGroupRecommendations = async () => {
    if (selectedFriendIds.length === 0) {
      toast.error(t("groupRecommend.selectFriendPrompt"));
      return;
    }

    if (!searchCoords) {
      toast.error(t("groupRecommend.selectLocationPrompt"));
      return;
    }

    try {
      setRecLoading(true);
      setRecommendations([]);
      setGroupStats(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

      const response = await makeAuthenticatedRequest(`${apiUrl}/api/v1/recommendations/group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          friend_ids: selectedFriendIds,
          lat: searchCoords.lat,
          lng: searchCoords.lng,
          limit: 16,
          budget: enableBudget ? budget : undefined,
          radius: radius,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_id");
        setShowLoginModal(true);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || t("groupRecommend.fetchError"));
      }

      const data: GroupRecommendationResponse = await response.json();
      setRecommendations(data.results);
      setGroupStats({
        groupSize: data.group_size,
        vegetarian: data.applied_vegetarian_filter,
        allergies: data.applied_allergies,
        budget: enableBudget ? budget : null,
        radius: radius,
      });
      setHasSearched(true);
      toast.success(t("groupRecommend.recsFound"));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t("groupRecommend.calcError"));
    } finally {
      setRecLoading(false);
    }
  };

  return (
    <PageLayout>
      <LoginRequiredModal isOpen={showLoginModal} message={t("groupRecommend.pleaseLogin")} />
      {!showLoginModal && (
        <div className="space-y-8 pb-16">
        {/* Header Title Section */}
        <div>
          <h1 className="text-3xl font-black text-[#3D312A] dark:text-[#E6DFD5] flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-brand dark:text-[#E8735A]" />
            {t("groupRecommend.title")}
          </h1>
          <p className="text-gray-500 dark:text-[#9A8A7A] mt-2">
            {t("groupRecommend.desc")}
          </p>
        </div>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: Friend Selection & Config (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#FFFDF9] dark:bg-[#3D312A] p-6 rounded-3xl border border-[#3D312A]/10 dark:border-[#4D3D32] shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              
              {/* Box Title */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand dark:text-[#E8735A]" />
                  <h2 className="font-bold text-[#3D312A] dark:text-[#E6DFD5] text-lg">{t("groupRecommend.selectMembers")}</h2>
                </div>
                {friends.length > 0 && (
                  <button
                    onClick={selectAllFriends}
                    className="text-xs font-bold text-brand dark:text-[#E8735A] hover:underline cursor-pointer"
                  >
                    {selectedFriendIds.length === friends.length ? t("groupRecommend.deselectAll") : t("groupRecommend.selectAll")}
                  </button>
                )}
              </div>

              {/* Location display with Map selection option */}
              <div className="mb-4 p-3.5 rounded-2xl bg-orange-50/40 dark:bg-[#2A2420] border border-orange-100 dark:border-[#4D3D32] space-y-2.5">
                <div className="flex items-start gap-2.5 text-xs text-[#3D312A]/80 dark:text-[#C8BFB0]">
                  <MapPin className="w-4 h-4 text-brand dark:text-[#E8735A] flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="block font-bold text-[10px] text-orange-600 dark:text-[#E8735A] uppercase tracking-wider mb-0.5">
                        {customCoords ? t("groupRecommend.customLocation") : t("groupRecommend.currentLocation")}
                      </span>
                      {customCoords && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomCoords(null);
                            setCustomAddress("");
                            toast.success(t("groupRecommend.gpsRestored"));
                          }}
                          className="text-[10px] font-bold text-gray-400 hover:text-brand dark:hover:text-[#E8735A] hover:underline cursor-pointer"
                        >
                          {t("groupRecommend.restoreGPS")}
                        </button>
                      )}
                    </div>
                    <p className="truncate font-semibold text-[#3D312A] dark:text-[#E6DFD5]">
                      {searchAddress || t("groupRecommend.notPositioned")}
                    </p>
                    {searchCoords && (
                      <p className="text-[10px] text-gray-400 dark:text-[#9A8A7A] mt-0.5 font-mono">
                        {searchCoords.lat.toFixed(5)}, {searchCoords.lng.toFixed(5)}
                      </p>
                    )}
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(true)}
                  className="w-full py-2 bg-white dark:bg-[#3D312A]/80 hover:bg-gray-50 dark:hover:bg-[#4D3D32] border border-orange-200/60 dark:border-[#4D3D32] rounded-xl text-xs font-bold text-brand dark:text-[#E8735A] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Compass className="w-3.5 h-3.5" />
                  {t("groupRecommend.selectOnMap")}
                </button>

                <div className="pt-2 border-t border-orange-100/50 dark:border-[#4D3D32]/50 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-gray-400 dark:text-[#9A8A7A]">{t("groupRecommend.searchRadius")}</span>
                    <span className="font-black text-brand dark:text-[#E8735A]">{radius} km</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-[#4D3D32] rounded-lg appearance-none cursor-pointer accent-brand dark:accent-[#E8735A]"
                  />
                </div>
              </div>

              {/* Friends list */}
              {loadingFriends ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-brand dark:text-[#E8735A] mb-2" />
                  <p className="text-xs text-gray-400 dark:text-[#9A8A7A]">{t("groupRecommend.loadingFriends")}</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8 px-4 border-2 border-dashed border-[#3D312A]/10 dark:border-[#4D3D32] rounded-2xl">
                  <Users className="w-10 h-10 mx-auto text-gray-300 dark:text-[#5A4D43] mb-3" />
                  <p className="text-sm font-bold text-gray-700 dark:text-[#E6DFD5] mb-1">{t("groupRecommend.noFriendsTitle")}</p>
                  <p className="text-xs text-gray-400 dark:text-[#9A8A7A] mb-4">
                    {t("groupRecommend.noFriendsDesc")}
                  </p>
                  <button
                    onClick={() => router.push("/friends")}
                    className="px-4 py-2 bg-brand dark:bg-[#E8735A] text-white text-xs font-bold rounded-xl flex items-center gap-2 mx-auto shadow-sm cursor-pointer hover:scale-[1.01]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("groupRecommend.addFriendsBtn")}
                  </button>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {friends.map((friend) => {
                    const isSelected = selectedFriendIds.includes(friend.friend_id);
                    const avatarUrl =
                      friend.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`;

                    return (
                      <div
                        key={friend.friend_id}
                        onClick={() => toggleSelectFriend(friend.friend_id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? "bg-[#F4EAD5] dark:bg-[#A91B0D]/20 border-brand/30 dark:border-brand-on-dark/30"
                            : "bg-white dark:bg-[#2A2420] border-gray-100 dark:border-[#4D3D32] hover:bg-gray-50 dark:hover:bg-[#4D3D32]/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-[#4D3D32] bg-[#F4EAD5]/30 flex-shrink-0">
                            <img src={avatarUrl} alt={friend.username} className="w-full h-full object-cover" />
                          </div>
                          {/* Name details */}
                          <div className="min-w-0">
                            <h4 className="font-bold text-[#3D312A] dark:text-[#E6DFD5] text-xs truncate">
                              {friend.full_name || friend.username}
                            </h4>
                            <p className="text-[10px] text-gray-400 dark:text-[#9A8A7A] truncate">
                              @{friend.username}
                            </p>
                          </div>
                        </div>

                        {/* Checkbox Icon */}
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isSelected
                              ? "bg-brand dark:bg-[#E8735A] border-transparent text-white"
                              : "border-gray-300 dark:border-[#5A4D43]"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Budget Selector */}
              <div className="mt-6 pt-6 border-t border-[#3D312A]/10 dark:border-[#4D3D32]">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#3D312A] dark:text-[#E6DFD5]">{t("groupRecommend.groupBudget")}</span>
                    {!enableBudget ? (
                      <span className="text-[10px] bg-gray-100 dark:bg-[#4D3D32] px-2 py-0.5 rounded-full text-gray-500 dark:text-[#9A8A7A]">
                        {t("groupRecommend.unlimited")}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-brand/10 dark:bg-[#E8735A]/10 px-2 py-0.5 rounded-full text-brand dark:text-[#E8735A] font-bold">
                        {t("groupRecommend.maxLabel")}{budget >= 1000000 ? "1.0Mđ" : `${budget / 1000}kđ`}
                      </span>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableBudget}
                      onChange={(e) => setEnableBudget(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 dark:bg-[#4D3D32] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:height-4 after:w-4 after:h-4 after:transition-all dark:border-gray-600 peer-checked:bg-brand dark:peer-checked:bg-[#E8735A]"></div>
                  </label>
                </div>

                <AnimatePresence>
                  {enableBudget && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3 overflow-hidden mt-3"
                    >
                      <input
                        type="range"
                        min="10000"
                        max="1000000"
                        step="10000"
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-[#4D3D32] rounded-lg appearance-none cursor-pointer accent-brand dark:accent-[#E8735A]"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 dark:text-[#9A8A7A] px-0.5">
                        <span>10k đ</span>
                        <span>500k đ</span>
                        <span>{language === "en" ? "1M ₫" : "1tr đ"}</span>
                      </div>
                      
                      {/* Quick select presets */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {[50000, 100000, 200000, 500000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setBudget(preset)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              budget === preset
                                ? "bg-brand/10 text-brand border-brand dark:bg-[#E8735A]/10 dark:text-[#E8735A] dark:border-[#E8735A]"
                                : "bg-white dark:bg-[#2A2420] border-gray-200 dark:border-[#4D3D32] text-gray-500 dark:text-[#9A8A7A] hover:border-brand/40"
                            }`}
                          >
                            {preset >= 1000000 ? "1M đ" : `${preset / 1000}k đ`}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit CTA */}
              <button
                onClick={handleGetGroupRecommendations}
                disabled={recLoading || selectedFriendIds.length === 0}
                className="w-full mt-6 py-3.5 bg-brand dark:bg-[#E8735A] hover:bg-brand-hover dark:hover:bg-[#d85e46] disabled:bg-brand/50 disabled:dark:bg-[#E8735A]/50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all duration-200 cursor-pointer disabled:cursor-not-allowed hover:scale-[1.01]"
              >
                {recLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t("groupRecommend.loadingSuggestions")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t("groupRecommend.suggestBtn").replace("{count}", String(selectedFriendIds.length + 1))}
                  </>
                )}
              </button>

              <p className="text-[10px] text-gray-400 dark:text-[#8A7A6A] mt-3 flex items-start gap-1 leading-normal">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{t("groupRecommend.disclaimer")}</span>
              </p>
            </div>

            {/* Display constraint summary if loaded */}
            {groupStats && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FFFDF9] dark:bg-[#3D312A] p-6 rounded-3xl border border-[#3D312A]/10 dark:border-[#4D3D32] shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-[#3D312A]/10 dark:border-[#4D3D32]">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-[#3D312A] dark:text-[#E6DFD5] text-sm">{t("groupRecommend.appliedConstraints")}</h3>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Vegetarian stat */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-[#9A8A7A]">{t("groupRecommend.vegetarianFilter")}</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        groupStats.vegetarian
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-gray-100 dark:bg-[#4D3D32] text-gray-400"
                      }`}
                    >
                      {groupStats.vegetarian ? t("groupRecommend.activated") : t("groupRecommend.no")}
                    </span>
                  </div>

                  {/* Budget stat */}
                  {groupStats.budget != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-[#9A8A7A]">{t("groupRecommend.budgetFilter")}</span>
                      <span className="px-2 py-0.5 rounded font-bold bg-[#F4EAD5] dark:bg-[#A91B0D]/20 text-brand dark:text-[#E8735A]">
                        ≤ {groupStats.budget.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  )}

                  {/* Radius stat */}
                  {groupStats.radius != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-[#9A8A7A]">{t("groupRecommend.radiusFilter")}</span>
                      <span className="px-2 py-0.5 rounded font-bold bg-[#F4EAD5] dark:bg-[#A91B0D]/20 text-brand dark:text-[#E8735A]">
                        {groupStats.radius} km
                      </span>
                    </div>
                  )}

                  {/* Allergies list */}
                  <div>
                    <span className="text-gray-500 dark:text-[#9A8A7A] block mb-1.5">{t("groupRecommend.excludeAllergies")}</span>
                    {groupStats.allergies.length === 0 ? (
                      <span className="text-gray-400 italic font-medium">{t("groupRecommend.noAllergiesDetected")}</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {groupStats.allergies.map((allergy) => (
                          <span
                            key={allergy}
                            className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 font-semibold"
                          >
                            ⚠️ {t("groupRecommend.excludeAllergies")} {allergy}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right panel: Search Results (7 cols) */}
          <div className="lg:col-span-7">
            {recLoading ? (
              <div className="flex flex-col items-center justify-center py-28 text-center bg-[#FFFDF9] dark:bg-[#3D312A] border border-[#3D312A]/10 dark:border-[#4D3D32] rounded-3xl min-h-[450px]">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 border-4 border-brand/20 dark:border-brand-on-dark/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-brand dark:border-t-[#E8735A] rounded-full animate-spin" />
                </div>
                <h3 className="font-bold text-gray-700 dark:text-[#E6DFD5] text-lg mb-2">
                  {t("groupRecommend.analyzingTaste")}
                </h3>
                <p className="text-gray-400 dark:text-[#9A8A7A] text-sm max-w-sm px-6">
                  {t("groupRecommend.analyzingTasteDesc")}
                </p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-[#FFFDF9] dark:bg-[#3D312A] border border-[#3D312A]/10 dark:border-[#4D3D32] rounded-3xl min-h-[450px]">
                <div className="w-16 h-16 rounded-full bg-brand-muted dark:bg-[#A91B0D]/10 flex items-center justify-center text-brand dark:text-[#E8735A] mb-4">
                  <UtensilsCrossed className="w-8 h-8" />
                </div>
                {hasSearched ? (
                  <>
                    <h3 className="font-bold text-gray-700 dark:text-[#E6DFD5] text-lg mb-2">
                      {t("groupRecommend.noMatchesFound")}
                    </h3>
                    <p className="text-gray-500 dark:text-[#9A8A7A] max-w-sm mb-6 text-sm">
                      {t("groupRecommend.noMatchesDesc")}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-gray-700 dark:text-[#E6DFD5] text-lg mb-2">
                      {t("groupRecommend.noResultsYet")}
                    </h3>
                    <p className="text-gray-500 dark:text-[#9A8A7A] max-w-sm mb-6 text-sm">
                      {t("groupRecommend.noResultsDesc")}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Results Header */}
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-xl text-[#3D312A] dark:text-[#E6DFD5] flex items-center gap-2">
                    🎯 {t("groupRecommend.recsTitle")}
                    <span className="px-2 py-0.5 text-xs font-black rounded-full bg-brand-muted dark:bg-[#A91B0D]/20 text-brand dark:text-[#E8735A]">
                      {recommendations.length}{t("groupRecommend.resultsCount")}
                    </span>
                  </h3>
                </div>

                {/* Warning message if list is short (e.g. less than 16 because of heavy allergy filtering) */}
                {recommendations.length < 16 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 flex gap-3 text-xs">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-amber-800 dark:text-amber-300">{t("groupRecommend.resultsNarrowed")}</p>
                      <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                        {t("groupRecommend.resultsNarrowedDesc")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Results Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {recommendations.map((item) => (
                    <FoodCard key={item.id} item={item} userId={userId || ""} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Interactive Map Modal */}
      <InteractiveMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialCoords={searchCoords}
        initialRadius={radius}
        onConfirm={(coords, addr, rad) => {
          setCustomCoords(coords);
          setCustomAddress(addr);
          setRadius(rad);
          toast.success(t("groupRecommend.mapUpdated"));
        }}
      />
    </PageLayout>
  );
}
