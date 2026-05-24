"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { collectionService, Collection } from "../services/collectionService";
import { RecommendResult } from "../app/result/page";
import { FolderPlus, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { interactionService } from "../services/interactionService";

import { useLanguage } from "./LanguageProvider";

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RecommendResult | null;
  onSuccess?: () => void;
}

export function AddToCollectionModal({ isOpen, onClose, item, onSuccess }: AddToCollectionModalProps) {
  const { t } = useLanguage();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  useEffect(() => {
    if (isOpen && userId) {
      setCollections(collectionService.getCollections(userId));
    }
  }, [isOpen, userId]);

  if (!item || !userId) return null;

  // [FIX-CONFLICT]: Bổ sung hàm handleAddToCollection (bị mất) để xử lý việc chọn bộ sưu tập có sẵn và gọi callback onSuccess
  const handleAddToCollection = async (collectionId: string) => {
    await collectionService.addItemToCollection(userId, collectionId, item);
    toast.success(t("collections.addedSuccess"));
    
    const coll = collections.find(c => c.id === collectionId);
    const collName = coll ? coll.name : t("collections.defaultName");
    
    interactionService.logInteraction({
      res_id: item.id,
      action_type: "SAVE_RESTAURANT",
      metadata: { restaurant_name: item.name, collection_name: collName }
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  const handleCreateAndAdd = async () => {
    const collName = newCollectionName.trim();
    const newColl = await collectionService.createCollection(userId, collName);
    if (newColl) {
      await collectionService.addItemToCollection(userId, newColl.id, item);
      toast.success(t("collections.createAndAddedSuccess"));
      
      interactionService.logInteraction({
        res_id: item.id,
        action_type: "SAVE_RESTAURANT",
        metadata: { restaurant_name: item.name, collection_name: collName }
      });

      setNewCollectionName("");
      setIsCreating(false);
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{t("collections.addToCollection")}</DialogTitle>
          <DialogDescription>
            {t("collections.selectToSave")} "{item.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 max-h-[300px] overflow-y-auto space-y-2">
          {collections.length === 0 && !isCreating ? (
            <div className="text-center py-6 text-gray-500 dark:text-[#9A8A7A] text-sm">
              {t("collections.noCollectionsYet")}
            </div>
          ) : (
            collections.map(coll => {
              const isAdded = coll.items.some(i => i.name === item.name);
              return (
                <button
                  key={coll.id}
                  onClick={() => !isAdded && handleAddToCollection(coll.id)}
                  disabled={isAdded}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                    isAdded 
                      ? 'bg-gray-50 dark:bg-[#3D312A]/50 border-gray-100 dark:border-[#3D312A] opacity-70 cursor-not-allowed' 
                      : 'bg-white dark:bg-[#3D312A] border-gray-200 dark:border-[#4D3D32] hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FolderPlus className={`w-5 h-5 ${isAdded ? 'text-gray-400' : 'text-indigo-500'}`} />
                    <span className={`font-medium ${isAdded ? 'text-gray-500 dark:text-[#9A8A7A]' : 'text-gray-900 dark:text-[#E6DFD5]'}`}>
                      {coll.name}
                    </span>
                  </div>
                  {isAdded && <Check className="w-4 h-4 text-green-500" />}
                </button>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-[#3D312A]">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors w-full p-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t("collections.createModalTitle")}
            </button>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder={t("collections.collectionNamePlaceholder")}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#4D3D32] bg-gray-50 dark:bg-[#2A2420] text-gray-900 dark:text-[#E6DFD5] focus:ring-2 focus:ring-indigo-500 outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateAndAdd();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <button
                onClick={handleCreateAndAdd}
                disabled={!newCollectionName.trim()}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {t("collections.save")}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
