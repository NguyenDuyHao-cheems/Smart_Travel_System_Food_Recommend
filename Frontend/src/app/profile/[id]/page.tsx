'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '../../../components/AppShell';
import { PostCard, SocialPost } from '../../../components/social/PostCard';
import { Loader2, ArrowLeft, Users, UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface PublicProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  cover_url?: string;
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export default function PublicProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers: any = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch profile
        const profileRes = await fetch(`http://localhost:8000/api/v1/social/users/${id}/profile`, { headers });
        if (!profileRes.ok) {
          if (profileRes.status === 404) {
            toast.error('Người dùng không tồn tại');
            router.push('/feed');
            return;
          }
          throw new Error('Failed to fetch profile');
        }
        const profileData = await profileRes.json();
        setProfile(profileData);
        setIsFollowing(profileData.is_following);
        setFollowersCount(profileData.followers_count);

        // Fetch posts
        const postsRes = await fetch(`http://localhost:8000/api/v1/social/users/${id}/posts`, { headers });
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData);
        }
      } catch (error) {
        console.error('Error fetching public profile:', error);
        toast.error('Không thể tải thông tin người dùng.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  const handleToggleFollow = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Vui lòng đăng nhập để theo dõi.');
      return;
    }
    
    // Optimistic Update
    const currentStatus = isFollowing;
    setIsFollowing(!currentStatus);
    setFollowersCount(prev => currentStatus ? prev - 1 : prev + 1);

    try {
      const res = await fetch(`http://localhost:8000/api/v1/social/users/${id}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to follow');
      }
      const data = await res.json();
      if (data.status === 'followed') {
        toast.success(`Đã theo dõi ${profile?.full_name || profile?.username}`);
      } else {
        toast.info(`Đã bỏ theo dõi ${profile?.full_name || profile?.username}`);
      }
    } catch (error) {
      // Revert Optimistic Update
      setIsFollowing(currentStatus);
      setFollowersCount(prev => currentStatus ? prev + 1 : prev - 1);
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleLikeToggle = async (postId: string, currentStatus: boolean) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Vui lòng đăng nhập để thích bài viết.');
      return;
    }
    try {
      await fetch(`http://localhost:8000/api/v1/social/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!profile) return null;

  const displayName = profile.full_name || profile.username || 'Khách';
  const displayUsername = profile.username || 'anonymous';
  const initial = displayName.charAt(0).toUpperCase();

  const coverUrl = profile.cover_url || 'https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=1600&auto=format&fit=crop';
  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`;

  return (
    <AppShell>
      <div className="max-w-[768px] mx-auto px-4 pt-8 pb-12">
        {/* Header Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Quay lại</span>
        </button>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm mb-6">
          {/* Cover Photo */}
          <div className="h-48 md:h-64 relative bg-muted w-full">
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          </div>

          <div className="px-6 pb-6 relative">
            {/* Avatar */}
            <div className="flex justify-between items-end -mt-16 mb-4 relative z-10">
              <div className="w-32 h-32 rounded-full border-4 border-card overflow-hidden bg-card shadow-md">
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              </div>
              
              {/* Follow Button */}
              <div className="mb-2">
                <button
                  onClick={handleToggleFollow}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all shadow-sm
                    ${isFollowing 
                      ? 'bg-muted text-foreground hover:bg-muted/80 border border-border' 
                      : 'bg-brand text-white hover:bg-brand-hover hover:shadow-md'
                    }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Đang theo dõi
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Theo dõi
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
              <p className="text-muted-foreground">@{displayUsername}</p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-foreground">
              <div className="flex flex-col">
                <span className="font-bold text-lg">{followersCount}</span>
                <span className="text-muted-foreground flex items-center gap-1">
                  Người theo dõi
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg">{profile.following_count}</span>
                <span className="text-muted-foreground flex items-center gap-1">
                  Đang theo dõi
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User's Posts Feed */}
        <h2 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
          Bài viết của {displayName}
        </h2>
        
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl shadow-sm">
            <div className="text-4xl mb-4 text-muted-foreground">📝</div>
            <p className="text-base font-semibold text-foreground">Chưa có bài viết nào.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Người dùng này chưa chia sẻ trải nghiệm nào.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeToggle={handleLikeToggle}
                onReplyClick={(id) => router.push(`/feed/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
