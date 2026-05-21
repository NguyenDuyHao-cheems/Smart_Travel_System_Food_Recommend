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
import { Heart, MessageCircle, MapPin, MoreHorizontal, Trash2, Flag, Link as LinkIcon, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { LinkPreview } from './LinkPreview';

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

export function PostCard({ post, onLikeToggle, onDelete }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Comment state
  const [showComments, setShowComments] = useState(false);

  // Utility to generate SEO-friendly slug
  const generateSlug = (name: string) => {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };
  const [comments, setComments] = useState<SocialPost[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [repliesCount, setRepliesCount] = useState(post.replies_count || 0);

  React.useEffect(() => {
    setCurrentUserId(localStorage.getItem('user_id'));
  }, []);

  const handleLike = () => {
    const token = localStorage.getItem('access_token');
    if (!token) { toast.error('Vui lòng đăng nhập.'); return; }
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    if (onLikeToggle) onLikeToggle(post.id, isLiked);
    // Fire API
    fetch(`http://localhost:8000/api/v1/social/posts/${post.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
  };

  const handleDelete = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/social/posts/${post.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Đã xóa bài viết.');
        if (onDelete) onDelete(post.id);
        else window.location.reload();
      } else {
        toast.error('Lỗi khi xóa bài viết.');
      }
    } catch {
      toast.error('Lỗi khi xóa bài viết.');
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast.success('Đã sao chép liên kết');
  };

  const handleReport = () => {
    toast.success('Đã gửi báo cáo vi phạm. Cảm ơn bạn!');
  };

  // ── Comment handlers ──
  const fetchComments = async () => {
    setIsLoadingComments(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/v1/social/posts/${post.id}/thread`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) setComments(await res.json());
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
    if (!token) { toast.error('Vui lòng đăng nhập để bình luận.'); return; }

    setIsSendingComment(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/social/posts', {
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
        toast.error('Không thể gửi bình luận.');
      }
    } catch {
      toast.error('Lỗi kết nối.');
    } finally {
      setIsSendingComment(false);
    }
  };

  const displayName = post.full_name || post.username || 'Người dùng ẩn danh';
  const displayUsername = post.username || 'anonymous';
  const initial = displayName.charAt(0).toUpperCase();
  const profileUrl = `/profile/${post.user_id}`;
  const isOwner = currentUserId === post.user_id;

  const formatTime = (dateStr: string) => {
    return formatDistanceToNow(
      new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z'),
      { addSuffix: true, locale: vi }
    );
  };

  return (
    <div className="bg-card text-card-foreground border rounded-xl p-4 mb-4 shadow-sm transition-all hover:shadow-md hover:scale-[1.005] group">
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
                    <LinkIcon className="w-4 h-4 mr-2" /> Sao chép liên kết
                  </DropdownMenuItem>
                  {isOwner ? (
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="cursor-pointer text-rose-500 focus:text-rose-500 focus:bg-rose-50">
                      <Trash2 className="w-4 h-4 mr-2" /> Xóa bài viết
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleReport} className="cursor-pointer text-orange-500 focus:text-orange-500 focus:bg-orange-50">
                      <Flag className="w-4 h-4 mr-2" /> Báo cáo vi phạm
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {post.content && (
            <div className="mt-2 text-sm text-foreground whitespace-pre-wrap break-words">
              {post.content}
            </div>
          )}

          {(() => {
            if (!post.content) return null;
            const match = post.content.match(/(https?:\/\/[^\s]+)/);
            if (match && match[0]) {
              return <LinkPreview url={match[0]} />;
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
                  <img src={post.restaurant_image_url} alt={post.restaurant_name || "Nhà hàng"} className="w-12 h-12 rounded-lg object-cover bg-muted" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <MapPin className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-0.5 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5" />
                    Đã gắn thẻ quán
                  </div>
                  <h4 className="text-sm font-bold truncate group-hover:underline text-foreground">
                    {post.restaurant_name || "Nhà hàng gợi ý"}
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
              <MessageCircle className={`w-4 h-4 ${showComments ? 'fill-blue-100' : ''}`} />
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
                  placeholder="Viết bình luận..."
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
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {comments.map((comment) => {
                    const cName = comment.full_name || comment.username || 'Ẩn danh';
                    const cInitial = cName.charAt(0).toUpperCase();
                    const cProfileUrl = `/profile/${comment.user_id}`;
                    return (
                      <div key={comment.id} className="flex items-start gap-2.5 group">
                        <Link href={cProfileUrl} className="shrink-0">
                          <Avatar className="w-7 h-7 border border-border">
                            <AvatarImage src={comment.avatar_url || ''} alt={cName} />
                            <AvatarFallback className="text-xs">{cInitial}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="bg-muted/50 rounded-xl px-3 py-2">
                            <Link href={cProfileUrl} className="text-xs font-semibold text-foreground hover:underline">
                              {cName}
                            </Link>
                            <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                              {comment.content}
                            </p>
                          </div>
                          <span className="text-[11px] text-muted-foreground ml-3 mt-0.5 block">
                            {formatTime(comment.created_at)}
                          </span>
                        </div>
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
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa bài viết này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Bài viết của bạn sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600 text-white">
              Xóa bài viết
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
