'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { StoryItemSkeleton } from '../../components/ui/LoadingState';
import { toast } from 'sonner';
import { useLanguage } from '../../components/LanguageProvider';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
import { supabase } from '../../lib/supabase';
import { StoryViewer, Story } from './StoryViewer';
import { StoryEditor } from './StoryEditor';



export function StoryList() {
  const { t } = useLanguage();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStories = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BACKEND_URL}/api/v1/social/stories`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        const data = await res.json();
        setStories(data);
      }
    } catch (err) {
      console.error('Failed to fetch stories', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error(t("feed.pleaseLoginStory"));
      return;
    }

    setEditorFile(file);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm overflow-hidden mb-4">
      <input 
        type="file" 
        accept="image/*,video/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Create Story Button */}
        <div 
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group w-[72px]"
        >
          <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20 group-hover:bg-muted/50 transition-colors">
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
            ) : (
              <Plus className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <span className="text-[11px] font-semibold text-foreground truncate w-full text-center">
            {t("feed.createNew")}
          </span>
        </div>

        {/* Stories List */}
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StoryItemSkeleton key={i} />)
          : stories.map((story, idx) => {
          const displayName = story.full_name || story.username || 'User';
          const avatar = story.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;
          return (
            <div 
              key={story.id} 
              onClick={() => setSelectedStoryIndex(idx)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group w-[72px] animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              <div className="relative w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-brand via-orange-400 to-amber-300 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full rounded-full border-2 border-card overflow-hidden">
                  <img src={story.media_url} alt="Story" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-card overflow-hidden bg-card">
                  <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                </div>
              </div>
              <span className="text-[11px] font-semibold text-foreground truncate w-full text-center">
                {displayName}
              </span>
            </div>
          );
        })}
      </div>

      {/* Story Viewer Overlay */}
      {selectedStoryIndex !== null && (
        <StoryViewer 
          stories={stories}
          initialIndex={selectedStoryIndex}
          onClose={() => setSelectedStoryIndex(null)}
          onDelete={fetchStories}
        />
      )}

      {/* Story Editor Overlay */}
      {editorFile && (
        <StoryEditor 
          file={editorFile}
          onClose={() => setEditorFile(null)}
          onSuccess={fetchStories}
        />
      )}
    </div>
  );
}
