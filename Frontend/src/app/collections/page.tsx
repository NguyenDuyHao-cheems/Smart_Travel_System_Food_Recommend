"use client";

import React, { Suspense, useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { collectionService, Collection } from "../../services/collectionService";
import { FolderOpen, Plus, Trash2, ChevronLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { RecommendResult } from "../result/page";
import { FoodCard } from "../../components/FoodCard";
import { interactionService } from "../../services/interactionService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

import { useLanguage } from "../../components/LanguageProvider";

function CollectionsPageInner() {
  const { t } = useLanguage();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);
  const [highlightedName, setHighlightedName] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (!id) {
      toast.error(t("collections.pleaseLogin"));
      router.push("/auth");
      return;
    }
    setUserId(id);
    setCollections(collectionService.getCollections(id));

    // Sync collections with DB in the background
    collectionService.fetchAndSyncCollections(id).then(dbColls => {
      setCollections(dbColls);
    });
  }, [router, t]);

  // Sync selectedCollection khi collections state cập nhật (sau khi DB sync hoàn thành)
  // Fix: đảm bảo items trong selectedCollection luôn có đúng shortuuid ID từ DB
  useEffect(() => {
    if (selectedCollection) {
      const updated = collections.find(c => c.id === selectedCollection.id || c.name === selectedCollection.name);
      if (updated) {
        setSelectedCollection(updated);
      }
    }
  }, [collections]);

  useEffect(() => {
    const collectionParam = searchParams.get("collection");
    const highlightParam = searchParams.get("highlight");
    
    if (collectionParam && collections.length > 0) {
      const found = collections.find(c => c.name.toLowerCase() === collectionParam.toLowerCase());
      if (found) {
        setSelectedCollection(found);
      }
    }
    
    if (highlightParam) {
      setHighlightedName(highlightParam);
      const timer = setTimeout(() => {
        setHighlightedName(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, collections]);

  const handleCreateCollection = async () => {
    if (!userId || !newCollectionName.trim()) return;
    const newColl = await collectionService.createCollection(userId, newCollectionName.trim(), "");
    if (newColl) {
      setCollections([...collections, newColl]);
      setNewCollectionName("");
      setIsCreateModalOpen(false);
      toast.success(t("collections.createSuccess"));
    }
  };

  const handleDeleteCollection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!userId) return;
    setDeleteCollectionId(id);
  };

  const confirmDeleteCollection = () => {
    if (!userId || !deleteCollectionId) return;
    collectionService.deleteCollection(userId, deleteCollectionId);
    setCollections(collections.filter(c => c.id !== deleteCollectionId));
    if (selectedCollection?.id === deleteCollectionId) {
      setSelectedCollection(null);
    }
    toast.success(t("collections.deleteSuccess"));
    setDeleteCollectionId(null);
  };

  const handleRemoveItem = (item: RecommendResult) => {
    if (!userId || !selectedCollection) return;
    collectionService.removeItemFromCollection(userId, selectedCollection.id, item.name);
    
    // Update local state
    const updatedCollection = {
      ...selectedCollection,
      items: selectedCollection.items.filter(i => i.name !== item.name)
    };
    setSelectedCollection(updatedCollection);
    setCollections(collections.map(c => c.id === updatedCollection.id ? updatedCollection : c));
    toast.success(t("collections.removeItemSuccess"));

    interactionService.logInteraction({
      res_id: item.id,
      action_type: "REMOVE_RESTAURANT",
      metadata: { restaurant_name: item.name, source_type: "collection", collection_name: selectedCollection.name }
    });
  };

  if (selectedCollection) {
    return (
      <PageLayout>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button 
              onClick={() => setSelectedCollection(null)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand transition-colors mb-4"
            >
              <ChevronLeft className="w-4 h-4" /> {t("collections.backBtn")}
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-brand dark:text-[#E8735A] fill-brand/20" />
              {selectedCollection.name}
            </h1>
            <p className="text-gray-500 dark:text-[#9A8A7A] mt-2">
              {selectedCollection.items.length}{t("collections.savedCount")}
            </p>
          </div>
        </div>

        {selectedCollection.items.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#3D312A] rounded-3xl border border-gray-100 dark:border-[#4D3D32]">
            <AlertCircle className="w-16 h-16 text-gray-300 dark:text-[#6A5A4A] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 dark:text-[#E6DFD5] mb-2">{t("collections.emptyTitle")}</h2>
            <p className="text-gray-500 dark:text-[#9A8A7A] mb-6">{t("collections.emptyDesc")}</p>
            <button 
              onClick={() => router.push('/')}
              className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-full font-semibold transition-colors"
            >
              {t("collections.exploreBtn")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {selectedCollection.items.map((item, idx) => (
              <div 
                key={item.id || idx} 
                className={`transition-all duration-500 rounded-2xl ${
                  highlightedName === item.name 
                    ? "ring-4 ring-yellow-400 dark:ring-orange-500 scale-[1.02] shadow-lg animate-pulse" 
                    : ""
                }`}
              >
                <FoodCard 
                  item={item} 
                  userId={userId!} 
                  showRemove={true}
                  onRemove={handleRemoveItem}
                />
              </div>
            ))}
          </div>
        )}
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-brand dark:text-[#E8735A] fill-brand/20" />
            {t("collections.title")}
          </h1>
          <p className="text-gray-500 dark:text-[#9A8A7A] mt-2">
            {t("collections.desc")}
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-muted dark:bg-brand/10 hover:bg-brand-muted dark:hover:bg-brand/20 text-brand-hover dark:text-[#E6DFD5] rounded-xl font-semibold transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          {t("collections.createBtn")}
        </button>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#3D312A] rounded-3xl border border-gray-100 dark:border-[#4D3D32]">
          <FolderOpen className="w-16 h-16 text-gray-300 dark:text-[#6A5A4A] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-[#E6DFD5] mb-2">{t("collections.emptyAllTitle")}</h2>
          <p className="text-gray-500 dark:text-[#9A8A7A] mb-6">{t("collections.emptyAllDesc")}</p>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-full font-semibold transition-colors flex items-center gap-2 mx-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {t("collections.createNowBtn")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((coll) => (
            <div 
              key={coll.id}
              onClick={() => setSelectedCollection(coll)}
              className="bg-white dark:bg-[#3D312A] p-6 rounded-2xl border border-gray-100 dark:border-[#4D3D32] shadow-sm hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-brand-muted dark:bg-brand/10 flex items-center justify-center text-brand dark:text-[#E8735A]">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <button 
                  onClick={(e) => handleDeleteCollection(e, coll.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  title={t("collections.deleteCollectionTooltip")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-[#E6DFD5] text-lg mb-1 group-hover:text-brand transition-colors">
                {coll.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-[#9A8A7A]">
                {coll.items.length} {t("collections.locationsCount")}
              </p>
              
              {coll.items.length > 0 && (
                <div className="mt-4 flex gap-2">
                  {coll.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="w-10 h-10 rounded-lg overflow-hidden border border-white dark:border-[#4D3D32] shadow-sm">
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {coll.items.length > 3 && (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#4D3D32] flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-[#C8BFB0]">
                      +{coll.items.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Tạo Bộ Sưu Tập */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{t("collections.createModalTitle")}</DialogTitle>
            <DialogDescription>
              {t("collections.createModalDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder={t("collections.createModalPlaceholder")}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#4D3D32] bg-gray-50 dark:bg-[#3D312A] text-gray-900 dark:text-[#E6DFD5] focus:ring-2 focus:ring-brand/50 outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateCollection();
                }
              }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-[#9A8A7A] dark:hover:text-gray-200 transition-colors"
            >
              {t("collections.cancelBtn")}
            </button>
            <button
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim()}
              className="px-5 py-2 text-sm font-semibold bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-white rounded-xl transition-colors cursor-pointer"
            >
              {t("collections.createNewBtn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Xóa Bộ Sưu Tập */}
      <Dialog open={!!deleteCollectionId} onOpenChange={(open) => !open && setDeleteCollectionId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600 dark:text-red-400">{t("collections.deleteModalTitle")}</DialogTitle>
            <DialogDescription>
              {t("collections.deleteModalDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <button
              onClick={() => setDeleteCollectionId(null)}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-[#9A8A7A] dark:hover:text-gray-200 transition-colors"
            >
              {t("collections.cancelBtn")}
            </button>
            <button
              onClick={confirmDeleteCollection}
              className="px-5 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors cursor-pointer"
            >
              {t("collections.deleteConfirmBtn")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense>
      <CollectionsPageInner />
    </Suspense>
  );
}
