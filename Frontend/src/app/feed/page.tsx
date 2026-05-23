'use client';
import React, { useState, useEffect } from 'react';
import { AppShell } from '../../components/AppShell';
import { PostCard, SocialPost } from '../../components/social/PostCard';
import { QuickCreateBox } from '../../components/social/QuickCreateBox';
import { StoryList } from '../../components/social/StoryList';
import { UserSearchPanel } from '../../components/social/UserSearchPanel';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const FEED_TABS = [
  { key: 'for_you', label: 'Dành cho bạn' },
  { key: 'following', label: 'Đang theo dõi' },
];

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function FeedPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('for_you');
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem('username'));
    setAvatar(localStorage.getItem('user_avatar'));
    fetchFeed('for_you');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFeed = async (mode = 'for_you') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${BACKEND_URL}/api/v1/social/feed?mode=${mode}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      } else {
        setPosts([]);
      }
    } catch {
      // Silent fail – feed can work without posts
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async (content: string, mediaUrls: string[], resId?: string, mood?: string | null) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Vui lòng đăng nhập để đăng bài viết.');
      return;
    }
    
    // Transform mood ID to mood label before sending
    let moodLabel = null;
    if (mood) {
      const MOODS = [
        { id: 'stress', label: '😭 Stress' },
        { id: 'study', label: '🧠 Chạy Deadline' },
        { id: 'chill', label: '🎉 Chill cuối tuần' },
        { id: 'dating', label: '💖 Hẹn hò' },
      ];
      const found = MOODS.find(m => m.id === mood);
      if (found) moodLabel = found.label;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/social/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content, media_urls: mediaUrls, res_id: resId, mood: moodLabel }),
      });
      if (res.ok) {
        const newPost = await res.json();
        setPosts((prev) => [newPost, ...prev]);
        toast.success('Đăng bài thành công!');
      } else if (res.status === 401) {
        toast.error('Vui lòng đăng nhập để đăng bài viết.');
      } else {
        toast.error('Không thể đăng bài lúc này.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    }
  };

  return (
    <AppShell>
      <div className="max-w-[680px] mx-auto px-4 pt-4 pb-8">
        <div className="flex flex-col gap-4">

            {/* Feed Header */}
            <div className="flex items-center py-1">
              <h1 className="text-3xl font-black text-[#3D312A] dark:text-[#E6DFD5] tracking-tight">
                Bảng tin
              </h1>
            </div>

            {/* Tìm kiếm bạn bè */}
            <UserSearchPanel />

            {/* Quick Story List */}
            <StoryList />

            {/* Quick Create Box */}
            <QuickCreateBox
              username={username}
              avatarUrl={avatar}
              onSubmit={handleCreatePost}
            />

            {/* Filter Tabs */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="flex">
                {FEED_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      const apiMode = tab.key === 'following' ? 'following' : 'for_you';
                      fetchFeed(apiMode);
                    }}
                    className={`flex-1 px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-brand text-brand bg-brand/5'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
                <p className="text-sm text-muted-foreground">Đang tải bảng tin...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20 bg-card border border-border rounded-xl shadow-sm">
                <div className="text-5xl mb-4">🍜</div>
                <p className="text-base font-semibold text-foreground">Chưa có bài viết nào.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Hãy theo dõi thêm foodie hoặc tự chia sẻ trải nghiệm ăn uống của bạn!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onDelete={(postId) => {
                      setPosts(prev => prev.filter(p => p.id !== postId));
                    }}
                  />
                ))}
              </div>
            )}
        </div>
      </div>
    </AppShell>
  );
}
