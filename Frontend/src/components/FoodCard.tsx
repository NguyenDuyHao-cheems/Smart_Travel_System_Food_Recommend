"use client";

import React from "react";
import { RecommendResult } from "../app/result/page";
import { Heart, MapPin, Trash2, Plus, Check, Bookmark } from "lucide-react";
import { favoriteService } from "../services/favoriteService";
import { collectionService } from "../services/collectionService";
import { toast } from "sonner";
import { AddToCollectionModal } from "./AddToCollectionModal";
import { interactionService } from "../services/interactionService";
import { useRouter } from "next/navigation";

import { useLanguage } from "./LanguageProvider";

interface FoodCardProps {
  item: RecommendResult;
  userId: string;
  onRemove?: (item: RecommendResult) => void;
  showRemove?: boolean;
  showAddCollection?: boolean;
  onAddCollection?: (item: RecommendResult) => void;
}

export function FoodCard({ item, userId, onRemove, showRemove, showAddCollection = true, onAddCollection }: FoodCardProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [isFav, setIsFav] = React.useState(false);
  const [isInColl, setIsInColl] = React.useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = React.useState(false);

  const translateReason = (reason: string): string => {
    if (language !== 'en') return reason;
    return reason
      .replace(/Đánh giá xuất sắc/g, 'Excellent rating')
      .replace(/Đánh giá cao/g, 'Highly rated')
      .replace(/Nhà hàng xuất sắc/g, 'Top restaurant')
      .replace(/Rất gần bạn/g, 'Very close to you')
      .replace(/Gần bạn/g, 'Near you')
      .replace(/Rất gần nhóm/g, 'Very close to group')
      .replace(/Gần nhóm/g, 'Near group')
      .replace(/Gợi ý cho bạn/g, 'Recommended for you')
      .replace(/Quán ngọn phù hợp/g, 'Great match')
      .replace(/Phù hợp với nhóm/g, 'Great fit for group')
      .replace(/Quán ăn nổi bật/g, 'Trending restaurant')
      .replace(/Thịnh Hành/g, 'Trending');
  };

  React.useEffect(() => {
    if (userId) {
      setIsFav(favoriteService.isFavorite(userId, item.name));
      // [FIX-CONFLICT]: Kiểm tra xem item đã có trong bất kỳ collection nào chưa để render icon Check
      setIsInColl(collectionService.isInAnyCollection(userId, item.name));
    }
  }, [userId, item.name]);

  const refreshCollectionStatus = () => {
    if (userId) {
      setIsInColl(collectionService.isInAnyCollection(userId, item.name));
    }
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      toast.error(t("favorites.pleaseLoginAction"));
      return;
    }
    if (isFav) {
      favoriteService.removeFavorite(userId, item.name);
      setIsFav(false);
      toast.success(t("favorites.removedSuccess"));

      interactionService.logInteraction({
        res_id: item.id,
        action_type: "REMOVE_RESTAURANT",
        metadata: { restaurant_name: item.name, source_type: "favorite" }
      });
    } else {
      favoriteService.addFavorite(userId, item);
      setIsFav(true);
      toast.success(t("favorites.addedSuccess"));

      interactionService.logInteraction({
        res_id: item.id,
        action_type: "LIKE_RESTAURANT",
        metadata: { restaurant_name: item.name }
      });
    }
  };

  const handleCardClick = () => {
    // Guard: nếu item.id bị thiếu thì không navigate
    if (!item.id || item.id === "undefined" || item.id === "null") {
      console.warn("[FoodCard] item.id is missing, cannot navigate:", item);
      toast.error(t("favorites.cardDetailError"));
      return;
    }

    interactionService.logInteraction({
      res_id: item.id,
      action_type: "VIEW_RESTAURANT",
      metadata: { source: "food_card_click" }
    });
    
    if (item.id.startsWith("mock-")) {
      toast.info(t("favorites.sampleResultInfo"));
      return;
    }
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('came_from_search', 'false');
      sessionStorage.setItem('current_res_id', item.id);
    }
    router.push(`/restaurant/${item.id}`);
  };

  return (
    <div 
      className="bg-white dark:bg-[#3D312A] rounded-2xl border border-gray-100 dark:border-[#4D3D32] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group relative flex flex-col cursor-pointer"
      onClick={handleCardClick}
    >
      <div 
        className="relative h-[180px] overflow-hidden"
      >
        <img
          src={item.img || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop"}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        
        {/* Actions top right */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {!showRemove && (
            <button 
              onClick={toggleFavorite}
              className="w-8 h-8 rounded-full bg-white/90 dark:bg-[#2A2420]/80 flex items-center justify-center hover:scale-110 transition-all shadow-sm"
            >
              <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
            </button>
          )}
          {showRemove && onRemove && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(item); }}
              className="w-8 h-8 rounded-full bg-white/90 dark:bg-[#2A2420]/80 flex items-center justify-center hover:scale-110 hover:bg-red-50 transition-all shadow-sm"
              title={t("favorites.deleteBtn")}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          )}
          {showAddCollection && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (!userId) {
                  toast.error(t("favorites.pleaseLoginAction"));
                  return;
                }
                // [FIX-CONFLICT]: Ngăn không cho mở Modal nếu món ăn đã có trong bộ sưu tập (tránh thêm trùng lặp), hiển thị toast với icon Bookmark
                if (isInColl) {
                  toast.info(t("favorites.alreadyInCollection"), {
                    icon: <Bookmark className="w-4 h-4" />
                  });
                  return;
                }
                setIsCollectionModalOpen(true);
                if (onAddCollection) onAddCollection(item);
              }}
              className={`w-8 h-8 rounded-full bg-white/90 dark:bg-[#2A2420]/80 flex items-center justify-center hover:scale-110 transition-all shadow-sm ${isInColl ? 'hover:bg-yellow-50' : 'hover:bg-brand-muted'}`}
              title={isInColl ? t("collections.alreadyInCollectionCheck") : t("collections.addToCollection")}
            >
              {isInColl ? (
                <Check className="w-4 h-4 text-yellow-500" />
              ) : (
                <Plus className="w-4 h-4 text-brand dark:text-[#E8735A]" />
              )}
            </button>
          )}
        </div>

        {/* Badges bottom */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {item.match && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand text-white whitespace-nowrap">
              ⭐ {/^\d+%?$/.test(item.match) ? `${item.match} Match` : item.match}
            </span>
          )}
          {item.dist && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-[#2A2420]/80 text-gray-600 dark:text-[#C8BFB0] backdrop-blur-sm whitespace-nowrap">
              <MapPin className="w-3 h-3" /> {item.dist}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-bold text-gray-800 dark:text-[#E6DFD5] mb-1 line-clamp-1">
          {item.name}
        </h3>
        {item.restaurantName && (
          <p className="text-xs font-semibold text-brand dark:text-[#E8735A] mb-2 line-clamp-1">
            {item.restaurantName}
          </p>
        )}
        {item.reason && (
          <p className="text-xs text-gray-500 dark:text-[#9A8A7A] leading-relaxed mb-3 line-clamp-2 flex-1">
            {translateReason(item.reason)}
          </p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
            {item.tags.map(tag => (
              <span key={tag} className="px-2 py-1 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-[#4D3D32] text-gray-600 dark:text-[#C8BFB0]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <AddToCollectionModal 
          isOpen={isCollectionModalOpen} 
          onClose={() => setIsCollectionModalOpen(false)} 
          item={item} 
          onSuccess={refreshCollectionStatus}
        />
      </div>
    </div>
  );
}
