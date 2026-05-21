'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, MoreHorizontal, Play, Pause, Volume2, VolumeX, Heart, Send, Trash2, Loader2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  created_at: string;
  expires_at: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  views_count: number;
  overlays?: any[];
}

interface StoryViewerItem {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  reaction: string | null;
  viewed_at: string;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: () => void;
}

const STORY_DURATION_MS = 5000; // 5 seconds per story

export function StoryViewer({ stories, initialIndex, onClose, onDelete }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<{id: string, emoji: string}[]>([]);
  const [localViews, setLocalViews] = useState<Record<string, number>>({});
  const [showViewers, setShowViewers] = useState(false);
  const [viewersList, setViewersList] = useState<StoryViewerItem[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  const viewedStoriesRef = useRef<Set<string>>(new Set());
  const lastUpdateRef = useRef<number>(Date.now());
  const requestRef = useRef<number>();

  useEffect(() => {
    setMounted(true);
    // Vô hiệu hóa cuộn trang khi mở Story
    document.body.style.overflow = 'hidden';
    // Get current user id from token
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub || payload.user_id || payload.id);
      } catch (e) {}
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const currentStory = stories[currentIndex];

  // Logic gọi API tăng view khi xem story
  useEffect(() => {
    if (!currentStory) return;
    if (!viewedStoriesRef.current.has(currentStory.id)) {
      viewedStoriesRef.current.add(currentStory.id);
      
      // Update view count locally so it feels instant
      setLocalViews(prev => ({
        ...prev,
        [currentStory.id]: (currentStory.views_count || 0) + 1
      }));

      // Gọi API ngầm
      const token = localStorage.getItem('access_token');
      if (token) {
        fetch(`http://localhost:8000/api/v1/social/stories/${currentStory.id}/view`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reaction: null })
        }).catch(err => console.error("Error updating view count:", err));
      }
    }
  }, [currentStory]);

  const handleNext = () => {
    setShowMenu(false);
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    setShowMenu(false);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  useEffect(() => {
    lastUpdateRef.current = Date.now();
    
    const animate = () => {
      if (!isPaused) {
        const now = Date.now();
        const delta = now - lastUpdateRef.current;
        
        setProgress(prev => {
          const nextProgress = prev + (delta / STORY_DURATION_MS) * 100;
          if (nextProgress >= 100) {
            // Reached end of story
            setTimeout(handleNext, 0); // push to next tick to avoid state update loops
            return 100;
          }
          return nextProgress;
        });
      }
      lastUpdateRef.current = Date.now();
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [currentIndex, isPaused]); // Re-bind when index changes so it doesn't loop incorrectly

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === ' ') setIsPaused(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const handleDelete = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    if (!window.confirm("Bạn có chắc chắn muốn xóa Story này?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/social/stories/${currentStory.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onClose();
        if (onDelete) onDelete();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReaction = (emoji: string) => {
    const id = Date.now().toString() + Math.random();
    setFloatingReactions(prev => [...prev, { id, emoji }]);
    toast.success(`Đã gửi cảm xúc ${emoji}`);
    
    // Auto remove after animation
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);

    // Call API
    const token = localStorage.getItem('access_token');
    if (token && currentStory) {
      fetch(`http://localhost:8000/api/v1/social/stories/${currentStory.id}/view`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reaction: emoji })
      }).catch(err => console.error("Error sending reaction:", err));
    }
  };

  const handleOpenViewers = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUserId !== currentStory?.user_id) return;
    
    setIsPaused(true);
    setShowViewers(true);
    setIsLoadingViewers(true);
    
    const token = localStorage.getItem('access_token');
    if (token && currentStory) {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/social/stories/${currentStory.id}/viewers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setViewersList(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingViewers(false);
      }
    }
  };

  if (!mounted || !currentStory) return null;

  const displayName = currentStory.full_name || currentStory.username || 'User';
  const avatar = currentStory.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;

  const portalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm">
      {/* Top Close Button (Desktop) */}
      <div className="absolute top-6 right-6 z-50 hidden md:flex items-center gap-4">
        <button 
          onClick={() => setIsPaused(!isPaused)}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          {isPaused ? <Play className="w-6 h-6 fill-white" /> : <Pause className="w-6 h-6 fill-white" />}
        </button>
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
        <button 
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Container */}
      <div className="relative w-full max-w-[500px] h-[100dvh] md:h-[90dvh] md:rounded-2xl overflow-hidden bg-black flex flex-col">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full px-2 pt-3 flex gap-1 z-20">
          <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Header (User Info & Mobile Controls) */}
        <div className="absolute top-0 left-0 w-full pt-6 pb-4 px-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <img src={avatar} alt={displayName} className="w-10 h-10 rounded-full border border-white/30" />
            <div className="flex flex-col">
              <span className="text-white font-semibold text-sm drop-shadow-md">{displayName}</span>
              <span className="text-white/70 text-xs drop-shadow-md">
                {new Date(currentStory.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white drop-shadow-md">
            {currentUserId === currentStory.user_id && (
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-white/10 rounded-full"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-[100]"
                    >
                      <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-muted transition-colors text-left font-medium disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {isDeleting ? "Đang xóa..." : "Xóa Story"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button className="md:hidden p-1 hover:bg-white/10 rounded-full" onClick={onClose}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Media Content */}
        <div 
          className="relative w-full h-full flex items-center justify-center bg-zinc-900 overflow-hidden"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={currentStory.id}
              src={currentStory.media_url}
              alt="Story"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full object-contain pointer-events-none"
            />
          </AnimatePresence>
          
          {/* Floating Reactions */}
          <AnimatePresence>
            {floatingReactions.map(reaction => (
              <motion.div
                key={reaction.id}
                initial={{ opacity: 1, y: 0, scale: 0.5, x: Math.random() * 40 - 20 }}
                animate={{ opacity: 0, y: -200, scale: 2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute bottom-24 right-8 text-4xl z-50 pointer-events-none"
              >
                {reaction.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Render Overlays */}
          {currentStory.overlays && currentStory.overlays.map((overlay: any) => (
            <div
              key={overlay.id}
              className="absolute pointer-events-none"
              style={{
                transform: `translate(${overlay.x}px, ${overlay.y}px)`,
                color: overlay.color,
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              {overlay.text}
            </div>
          ))}
        </div>

        {/* Navigation Overlays */}
        <div 
          className="absolute top-16 left-0 w-1/3 h-[calc(100%-8rem)] z-10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
        />
        <div 
          className="absolute top-16 right-0 w-1/3 h-[calc(100%-8rem)] z-10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
        />

        {/* Bottom Action Bar */}
        <div className="absolute bottom-0 left-0 w-full p-4 flex items-center justify-between z-20 bg-gradient-to-t from-black/80 to-transparent">
          {/* Lượt xem */}
          <div 
            className={`flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-full text-white/90 text-sm font-medium backdrop-blur-md ${currentUserId === currentStory.user_id ? 'cursor-pointer hover:bg-black/60 transition-colors' : ''}`}
            onClick={handleOpenViewers}
          >
            <Eye className="w-4 h-4" />
            <span>{localViews[currentStory.id] || currentStory.views_count || 0}</span>
          </div>

          {/* Cụm Reaction Facebook-style */}
          {currentUserId !== currentStory.user_id && (
            <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1.5 rounded-full backdrop-blur-md">
              {REACTIONS.map(emoji => (
                <button 
                  key={emoji}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/20 hover:scale-125 rounded-full transition-all duration-200 origin-bottom"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReaction(emoji);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Viewers Modal (Chỉ hiện cho tác giả) */}
      <AnimatePresence>
        {showViewers && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 z-30"
              onClick={(e) => {
                e.stopPropagation();
                setShowViewers(false);
                setIsPaused(false);
              }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-2xl z-40 max-h-[70vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-gray-500" />
                  <h3 className="font-bold text-gray-900">
                    Người xem ({localViews[currentStory.id] || currentStory.views_count || 0})
                  </h3>
                </div>
                <button 
                  onClick={() => { setShowViewers(false); setIsPaused(false); }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4">
                {isLoadingViewers ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  </div>
                ) : viewersList.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    Chưa có ai xem Story này.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {viewersList.map(viewer => (
                      <div key={viewer.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img 
                              src={viewer.avatar_url || 'https://via.placeholder.com/150'} 
                              alt={viewer.username}
                              className="w-12 h-12 rounded-full object-cover border border-gray-200"
                            />
                            {viewer.reaction && (
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm text-sm">
                                {viewer.reaction}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {viewer.full_name || viewer.username}
                            </p>
                            <p className="text-gray-500 text-xs">@{viewer.username}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(portalContent, document.body);
}
