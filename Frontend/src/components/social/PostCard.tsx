import React, { useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '../ui/alert-dialog';
import { Heart, MessageCircle, MapPin, MoreHorizontal, Trash2, Flag, Link as LinkIcon, Send, Loader2, Pencil, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { LinkPreview } from './LinkPreview';
import { useLanguage } from '../LanguageProvider';
import { CommentSkeleton } from '../ui/LoadingState';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SocialPost {
  id: string;
  user_id: string;
  content?: string;
  mood?: string | null;
  media_urls?: string[];
  res_id?: string;
  restaurant_name?: string;
  restaurant_image_url?: string;
  parent_id?: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  is_liked?: boolean;
  metadata?: {
    is_food_review?: boolean;
    rating?: number;
    spicy_level?: string;
    price?: number;
    ai_match?: number;
    mood?: string;
  };
}

interface PostCardProps {
  post: SocialPost;
  onLikeToggle?: (postId: string, currentStatus: boolean) => void;
  onReplyClick?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

const urlMatchRegex = /^(https?:\/\/[^\s]+)$|^([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)$/i;

const parseLinks = (text: string) => {
  const words = text.split(/(\s+)/);
  return words.map((word, i) => {
    let cleanWord = word;
    let punctuation = '';
    const lastChar = word[word.length - 1];
    if (lastChar && ['.', ',', '!', '?'].includes(lastChar)) {
      cleanWord = word.slice(0, -1);
      punctuation = lastChar;
    }
    
    const match = cleanWord.match(urlMatchRegex);
    if (match) {
      let href = cleanWord;
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        href = 'https://' + href;
      }
      return (
        <React.Fragment key={i}>
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline break-all" onClick={(e) => e.stopPropagation()}>
            {cleanWord}
          </a>
          {punctuation}
        </React.Fragment>
      );
    }
    return word;
  });
};

interface CommentNodeProps {
  comment: SocialPost;
  currentUserId: string | null;
  onLikeComment: (commentId: string) => void;
  onEditComment: (commentId: string, content: string) => Promise<boolean>;
  onDeleteComment: (commentId: string) => void;
  activeReplyId: string | null;
  setActiveReplyId: (id: string | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  isSendingReply: boolean;
  onSendReply: (commentId: string) => void;
  formatTime: (date: string) => string;
  parseLinks: (text: string) => React.ReactNode;
  t: (key: string) => string;
}

const CommentNode = ({
  comment,
  currentUserId,
  onLikeComment,
  onEditComment,
  onDeleteComment,
  activeReplyId,
  setActiveReplyId,
  replyText,
  setReplyText,
  isSendingReply,
  onSendReply,
  formatTime,
  parseLinks,
  t
}: CommentNodeProps) => {
  const cName = comment.full_name || comment.username || t('socialPost.anonymous');
  const cInitial = cName.charAt(0).toUpperCase();
  const cProfileUrl = `/profile/${comment.user_id}`;
  const isLiked = comment.is_liked || false;
  const likesCount = comment.likes_count || 0;
  const showReplyInput = activeReplyId === comment.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  React.useEffect(() => {
    if (!isEditing) {
      setEditText(comment.content || '');
    }
  }, [comment.content, isEditing]);

  const saveEdit = async () => {
    const content = editText.trim();
    if (!content) return;
    setIsSavingEdit(true);
    const saved = await onEditComment(comment.id, content);
    setIsSavingEdit(false);
    if (saved) {
      setIsEditing(false);
    }
  };

  return (
    <div className="group/comment animate-fade-in-up">
      <div className="flex items-start gap-2.5">
        <Link href={cProfileUrl} className="shrink-0 mt-0.5">
          <Avatar className="w-7 h-7 border border-border">
            <AvatarImage src={comment.avatar_url || ''} alt={cName} />
            <AvatarFallback className="text-xs">{cInitial}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="bg-muted/45 hover:bg-muted/60 transition-colors rounded-2xl px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <Link href={cProfileUrl} className="text-xs font-bold text-foreground hover:underline truncate">
                {cName}
              </Link>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatTime(comment.created_at)}
              </span>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveEdit();
                    } else if (e.key === 'Escape') {
                      setIsEditing(false);
                    }
                  }}
                  className="flex-1 text-sm px-2 py-1 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-brand/30"
                  disabled={isSavingEdit}
                  autoFocus
                />
                <button
                  onClick={saveEdit}
                  disabled={isSavingEdit || !editText.trim()}
                  className="p-1 text-brand disabled:opacity-40"
                  title={t('socialPost.save')}
                >
                  {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSavingEdit}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title={t('socialPost.cancel')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                {parseLinks(comment.content || '')}
              </p>
            )}
          </div>
          
          {/* Heart, Chat bubble and Trash controls */}
          <div className="flex items-center space-x-4 ml-3 mt-1 text-[11px] text-muted-foreground">
            <button 
              onClick={() => onLikeComment(comment.id)}
              className={`flex items-center gap-1 transition-colors hover:text-rose-500 ${isLiked ? 'text-rose-500' : ''}`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>
            
            <button 
              onClick={() => setActiveReplyId(showReplyInput ? null : comment.id)}
              className={`flex items-center gap-1 transition-colors hover:text-blue-500 ${showReplyInput ? 'text-blue-500' : ''}`}
            >
              <MessageCircle className={`w-3.5 h-3.5 ${showReplyInput ? 'fill-blue-100 dark:fill-blue-900/30' : ''}`} />
            </button>

            {currentUserId === comment.user_id && (
              <>
                <button
                  onClick={() => {
                    setActiveReplyId(null);
                    setEditText(comment.content || '');
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1 transition-colors text-muted-foreground/60 hover:text-brand"
                  title={t('socialPost.editComment')}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteComment(comment.id)}
                  className="flex items-center gap-1 transition-colors text-muted-foreground/60 hover:text-rose-500"
                  title={t('socialPost.deleteComment') || 'Delete comment'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Inline Reply Input */}
          {showReplyInput && (
            <div className="mt-2 ml-3 flex items-center gap-2 animate-fade-in-down">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSendReply(comment.id);
                  }
                }}
                placeholder={t('socialPost.replyPlaceholder') || 'Write a reply...'}
                className="flex-1 text-xs px-3 py-1.5 rounded-full border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder:text-muted-foreground transition-all"
                disabled={isSendingReply}
                autoFocus
              />
              <button
                onClick={() => onSendReply(comment.id)}
                disabled={isSendingReply || !replyText.trim()}
                className="p-1.5 rounded-full bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isSendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function PostCard({ post, onLikeToggle, onDelete }: PostCardProps) {
  const { language, t } = useLanguage();
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postContent, setPostContent] = useState(post.content || '');
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostText, setEditPostText] = useState(post.content || '');
  const [isSavingPost, setIsSavingPost] = useState(false);

  // Comments & Replies State
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<SocialPost[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [repliesCount, setRepliesCount] = useState(post.replies_count || 0);

  const [repliesData, setRepliesData] = useState<Record<string, SocialPost[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [isSendingReply, setIsSendingReply] = useState(false);

  React.useEffect(() => {
    setCurrentUserId(localStorage.getItem('user_id'));
  }, []);

  React.useEffect(() => {
    setPostContent(post.content || '');
    setEditPostText(post.content || '');
  }, [post.content]);

  // Utility to generate SEO-friendly slug
  const generateSlug = (name: string) => {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleLike = () => {
    const token = localStorage.getItem('access_token');
    if (!token) { toast.error(t('socialPost.loginRequired')); return; }
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    if (onLikeToggle) onLikeToggle(post.id, isLiked);
    // Fire API
    fetch(`${BACKEND_URL}/api/v1/social/posts/${post.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
  };

  const handleDelete = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/social/posts/${post.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(t('socialPost.deleteSuccess'));
        if (onDelete) onDelete(post.id);
        else window.location.reload();
      } else {
        toast.error(t('socialPost.deleteError'));
      }
    } catch {
      toast.error(t('socialPost.deleteError'));
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast.success(t('socialPost.copySuccess'));
  };

  const handleReport = () => {
    toast.success(t('socialPost.reportThanks'));
  };

  const handleEditPost = async () => {
    const content = editPostText.trim();
    const token = localStorage.getItem('access_token');
    if (!content) return;
    if (!token) {
      toast.error(t('socialPost.loginRequired'));
      return;
    }

    setIsSavingPost(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/social/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        const updatedPost: SocialPost = await res.json();
        setPostContent(updatedPost.content || '');
        setEditPostText(updatedPost.content || '');
        setIsEditingPost(false);
        toast.success(t('socialPost.editSuccess'));
      } else {
        toast.error(t('socialPost.editError'));
      }
    } catch {
      toast.error(t('socialPost.connectionError'));
    } finally {
      setIsSavingPost(false);
    }
  };

  // ── Replies handler ──
  const fetchReplies = async (commentId: string) => {
    setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BACKEND_URL}/api/v1/social/posts/${commentId}/thread?include_descendants=true`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const replies: SocialPost[] = await res.json();
        setRepliesData(prev => ({ ...prev, [commentId]: replies }));
      }
    } catch (err) {
      console.error("Failed to fetch replies:", err);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
    }
  };

  // ── Comment handlers ──
  const fetchComments = async () => {
    setIsLoadingComments(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BACKEND_URL}/api/v1/social/posts/${post.id}/thread`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const list: SocialPost[] = await res.json();
        setComments(list);
      }
    } catch { /* silent */ }
    finally { setIsLoadingComments(false); }
  };

  const toggleComments = () => {
    if (!showComments) fetchComments();
    setShowComments(!showComments);
  };

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    const token = localStorage.getItem('access_token');
    if (!token) { toast.error(t('socialPost.commentLoginRequired')); return; }

    setIsSendingComment(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/social/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: text, parent_id: post.id })
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [...prev, newComment]);
        setRepliesCount(prev => prev + 1);
        setCommentText('');
      } else {
        toast.error(t('socialPost.commentSendError'));
      }
    } catch {
      toast.error(t('socialPost.connectionError'));
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleSendReply = async (commentId: string) => {
    const text = replyText.trim();
    if (!text) return;
    const token = localStorage.getItem('access_token');
    if (!token) { toast.error(t('socialPost.commentLoginRequired')); return; }

    setIsSendingReply(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/social/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: text, parent_id: commentId })
      });
      if (res.ok) {
        const newReply = await res.json();
        const rootCommentId = comments.some(comment => comment.id === commentId)
          ? commentId
          : Object.keys(repliesData).find(id => repliesData[id].some(reply => reply.id === commentId));
        if (rootCommentId) {
          setRepliesData(prev => ({
            ...prev,
            [rootCommentId]: [...(prev[rootCommentId] || []), newReply]
          }));
          setExpandedComments(prev => ({ ...prev, [rootCommentId]: true }));
        }
        setReplyText('');
        setActiveReplyId(null);
        
        // Update reply counts in comments list & repliesData recursively
        const incrementCount = (list: SocialPost[]): SocialPost[] =>
          list.map(c => c.id === commentId ? { ...c, replies_count: (c.replies_count || 0) + 1 } : c);

        setComments(prev => incrementCount(prev));
        setRepliesData(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
            updated[key] = incrementCount(updated[key]);
          });
          return updated;
        });
        
        toast.success(t('socialPost.commentSendSuccess') || 'Reply posted successfully!');
      } else {
        toast.error(t('socialPost.commentSendError'));
      }
    } catch {
      toast.error(t('socialPost.connectionError'));
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) { toast.error(t('socialPost.loginRequired')); return; }

    const updatePostInList = (list: SocialPost[]) =>
      list.map(c => {
        if (c.id === commentId) {
          const wasLiked = c.is_liked || false;
          return {
            ...c,
            is_liked: !wasLiked,
            likes_count: wasLiked ? c.likes_count - 1 : c.likes_count + 1
          };
        }
        return c;
      });

    setComments(prev => updatePostInList(prev));
    setRepliesData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key] = updatePostInList(updated[key]);
      });
      return updated;
    });

    try {
      await fetch(`${BACKEND_URL}/api/v1/social/posts/${commentId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch { /* silent */ }
  };

  const handleEditComment = async (commentId: string, content: string): Promise<boolean> => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/social/posts/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      if (!res.ok) {
        toast.error(t('socialPost.editError'));
        return false;
      }

      const updatedComment: SocialPost = await res.json();
      const updatePostInList = (list: SocialPost[]) =>
        list.map(item => item.id === commentId ? updatedComment : item);

      setComments(prev => updatePostInList(prev));
      setRepliesData(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          updated[key] = updatePostInList(updated[key]);
        });
        return updated;
      });
      toast.success(t('socialPost.editSuccess'));
      return true;
    } catch {
      toast.error(t('socialPost.connectionError'));
      return false;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const visibleComments = [...comments, ...Object.values(repliesData).flat()];
    const commentToDelete = visibleComments.find(c => c.id === commentId);
    const parentId = commentToDelete?.parent_id;
    const deletedIds = new Set([commentId]);
    let foundDescendant = true;
    while (foundDescendant) {
      foundDescendant = false;
      visibleComments.forEach(comment => {
        if (comment.parent_id && deletedIds.has(comment.parent_id) && !deletedIds.has(comment.id)) {
          deletedIds.add(comment.id);
          foundDescendant = true;
        }
      });
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/social/posts/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok || res.status === 404) {
        if (res.ok) {
          toast.success(t('socialPost.commentDeleteSuccess') || 'Comment deleted successfully');
        }
        
        setComments(prev => prev.filter(c => !deletedIds.has(c.id)));
        
        setRepliesData(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
            if (deletedIds.has(key)) {
              delete updated[key];
            } else {
              updated[key] = updated[key].filter(c => !deletedIds.has(c.id));
            }
          });
          return updated;
        });
        setExpandedComments(prev => {
          const updated = { ...prev };
          deletedIds.forEach(id => delete updated[id]);
          return updated;
        });
        if (activeReplyId && deletedIds.has(activeReplyId)) {
          setActiveReplyId(null);
          setReplyText('');
        }

        if (res.ok && parentId) {
          if (parentId === post.id) {
            setRepliesCount(prev => Math.max(0, prev - 1));
          } else {
            const decrementCount = (list: SocialPost[]): SocialPost[] =>
              list.map(c => c.id === parentId ? { ...c, replies_count: Math.max(0, (c.replies_count || 0) - 1) } : c);
            
            setComments(prev => decrementCount(prev));
            setRepliesData(prev => {
              const updated = { ...prev };
              Object.keys(updated).forEach(key => {
                updated[key] = decrementCount(updated[key]);
              });
              return updated;
            });
          }
        }
      } else {
        toast.error(t('socialPost.deleteError'));
      }
    } catch {
      toast.error(t('socialPost.connectionError'));
    }
  };

  const displayName = post.full_name || post.username || t('socialPost.anonymousUser');
  const displayUsername = post.username || 'anonymous';
  const initial = displayName.charAt(0).toUpperCase();
  const profileUrl = `/profile/${post.user_id}`;
  const isOwner = currentUserId === post.user_id;

  const formatTime = (dateStr: string) => {
    return formatDistanceToNow(
      new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z'),
      { addSuffix: true, locale: language === 'en' ? enUS : vi }
    );
  };

  return (
    <div className="bg-card text-card-foreground border rounded-xl p-4 mb-4 shadow-sm transition-all hover:shadow-md hover:scale-[1.005] group animate-fade-in">
      <div className="flex items-start space-x-3">
        <Link href={profileUrl} className="shrink-0">
          <Avatar className="w-10 h-10 border border-border hover:opacity-80 transition-opacity">
            <AvatarImage src={post.avatar_url || ''} alt={displayName} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center flex-wrap gap-1.5 truncate">
              <Link href={profileUrl} className="text-sm font-semibold text-foreground hover:underline shrink-0">
                {displayName}
              </Link>
              <Link href={profileUrl} className="text-xs text-muted-foreground truncate hover:underline shrink-0">
                @{displayUsername}
              </Link>
            </div>
            
            <div className="flex items-center space-x-2 mt-1 sm:mt-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTime(post.created_at)}
              </span>
              
              {/* Options Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
                    <LinkIcon className="w-4 h-4 mr-2" /> {t('socialPost.copyLink')}
                  </DropdownMenuItem>
                  {isOwner ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditPostText(postContent);
                          setIsEditingPost(true);
                        }}
                        className="cursor-pointer"
                      >
                        <Pencil className="w-4 h-4 mr-2" /> {t('socialPost.editPost')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="cursor-pointer text-rose-500 focus:text-rose-500 focus:bg-rose-50">
                        <Trash2 className="w-4 h-4 mr-2" /> {t('socialPost.deletePost')}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={handleReport} className="cursor-pointer text-orange-500 focus:text-orange-500 focus:bg-orange-50">
                      <Flag className="w-4 h-4 mr-2" /> {t('socialPost.report')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {isEditingPost ? (
            <div className="mt-2 flex items-end gap-2">
              <textarea
                value={editPostText}
                onChange={(e) => setEditPostText(e.target.value)}
                className="flex-1 min-h-[64px] resize-none text-sm px-3 py-2 rounded-xl border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                disabled={isSavingPost}
                autoFocus
              />
              <button
                onClick={handleEditPost}
                disabled={isSavingPost || !editPostText.trim()}
                className="p-2 rounded-full bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title={t('socialPost.save')}
              >
                {isSavingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setEditPostText(postContent);
                  setIsEditingPost(false);
                }}
                disabled={isSavingPost}
                className="p-2 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
                title={t('socialPost.cancel')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : postContent && (
            <div className="mt-2 text-sm text-foreground whitespace-pre-wrap break-words">
              {parseLinks(postContent)}
            </div>
          )}

          {(() => {
            if (!postContent || isEditingPost) return null;
            const linkMatchRegex = /(https?:\/\/[^\s]+)|([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i;
            const match = postContent.match(linkMatchRegex);
            if (match && match[0]) {
              let url = match[0];
              const lastChar = url[url.length - 1];
              if (['.', ',', '!', '?'].includes(lastChar)) url = url.slice(0, -1);
              if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
              return <LinkPreview url={url} />;
            }
            return null;
          })()}

          {post.res_id && (
            <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all group max-w-sm">
              <Link 
                href={`/restaurant/${post.restaurant_name ? generateSlug(post.restaurant_name) : post.res_id}`} 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('current_res_id', post.res_id!);
                  }
                }}
                className="flex items-center p-2.5 gap-3"
              >
                {post.restaurant_image_url ? (
                  <img src={post.restaurant_image_url} alt={post.restaurant_name || t('socialPost.restaurant')} className="w-12 h-12 rounded-lg object-cover bg-muted" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-0.5 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5" />
                    {t('socialPost.taggedRestaurant')}
                  </div>
                  <h4 className="text-sm font-bold truncate group-hover:underline text-foreground">
                    {post.restaurant_name || t('socialPost.suggestedRestaurant')}
                  </h4>
                </div>
              </Link>
            </div>
          )}

          {post.media_urls && post.media_urls.length > 0 && (
            <div className={`mt-3 grid gap-2 ${post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {post.media_urls.map((url, idx) => (
                <div key={idx} className="relative rounded-lg overflow-hidden border border-border aspect-video bg-muted">
                  {url.startsWith('data:video/') || url.match(/\.(mp4|webm)$/i) ? (
                    <video src={url} controls className="object-cover w-full h-full" />
                  ) : (
                    <img src={url} alt="Post attachment" className="object-cover w-full h-full" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex items-center space-x-6">
            <button 
              onClick={handleLike}
              className={`flex items-center space-x-1.5 text-sm transition-colors ${isLiked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500'}`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likesCount > 0 ? likesCount : ''}</span>
            </button>

            <button 
              onClick={toggleComments}
              className={`flex items-center space-x-1.5 text-sm transition-colors ${showComments ? 'text-blue-500' : 'text-muted-foreground hover:text-blue-500'}`}
            >
              <MessageCircle className={`w-4 h-4 ${showComments ? 'fill-blue-100 dark:fill-blue-900/30' : ''}`} />
              <span>{repliesCount > 0 ? repliesCount : ''}</span>
            </button>
          </div>

          {/* ── Comment Section ── */}
          {showComments && (
            <div className="mt-4 border-t border-border pt-4 space-y-3">
              {/* Comment Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); }}}
                  placeholder={t('socialPost.commentPlaceholder')}
                  className="flex-1 text-sm px-3 py-2 rounded-full border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder:text-muted-foreground transition-all"
                  disabled={isSendingComment}
                />
                <button
                  onClick={handleSendComment}
                  disabled={isSendingComment || !commentText.trim()}
                  className="p-2 rounded-full bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {isSendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              {/* Comments List */}
              {isLoadingComments ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => <CommentSkeleton key={i} />)}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">{t('socialPost.noComments')}</p>
              ) : (
                <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                  {comments.map((comment) => {
                    const visibleReplies = repliesData[comment.id] || [];
                    const isExpanded = expandedComments[comment.id] || false;
                    return (
                      <div key={comment.id} className="space-y-2">
                        <CommentNode
                          comment={comment}
                          currentUserId={currentUserId}
                          onLikeComment={handleLikeComment}
                          onEditComment={handleEditComment}
                          onDeleteComment={handleDeleteComment}
                          activeReplyId={activeReplyId}
                          setActiveReplyId={setActiveReplyId}
                          replyText={replyText}
                          setReplyText={setReplyText}
                          isSendingReply={isSendingReply}
                          onSendReply={handleSendReply}
                          formatTime={formatTime}
                          parseLinks={parseLinks}
                          t={t}
                        />

                        {comment.replies_count > 0 && (
                          <div className="ml-10 mt-1">
                            {!isExpanded ? (
                              <button
                                onClick={() => {
                                  setExpandedComments(prev => ({ ...prev, [comment.id]: true }));
                                  if (!repliesData[comment.id]) {
                                    fetchReplies(comment.id);
                                  }
                                }}
                                className="text-[11px] text-brand hover:underline font-bold flex items-center gap-1.5 cursor-pointer"
                                disabled={loadingReplies[comment.id]}
                              >
                                {loadingReplies[comment.id] && <Loader2 className="w-3 h-3 animate-spin" />}
                                {t('socialPost.viewReplies')}
                              </button>
                            ) : (
                              <button
                                onClick={() => setExpandedComments(prev => ({ ...prev, [comment.id]: false }))}
                                className="text-[11px] text-muted-foreground hover:underline font-bold flex items-center gap-1 cursor-pointer"
                              >
                                {t('socialPost.hideReplies')}
                              </button>
                            )}
                          </div>
                        )}

                        {isExpanded && visibleReplies.length > 0 && (
                          <div className="space-y-3 ml-3 pl-3 border-l border-border/60 mt-2">
                            {visibleReplies.map((reply) => {
                              const isNestedReply = reply.parent_id !== comment.id;
                              return (
                                <div key={reply.id} className={isNestedReply ? 'ml-3 pl-3 border-l border-border/60' : ''}>
                                  <CommentNode
                                    comment={reply}
                                    currentUserId={currentUserId}
                                    onLikeComment={handleLikeComment}
                                    onEditComment={handleEditComment}
                                    onDeleteComment={handleDeleteComment}
                                    activeReplyId={activeReplyId}
                                    setActiveReplyId={setActiveReplyId}
                                    replyText={replyText}
                                    setReplyText={setReplyText}
                                    isSendingReply={isSendingReply}
                                    onSendReply={handleSendReply}
                                    formatTime={formatTime}
                                    parseLinks={parseLinks}
                                    t={t}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('socialPost.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('socialPost.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('socialPost.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600 text-white">
              {t('socialPost.deletePost')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
