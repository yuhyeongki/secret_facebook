import React, { useState, useEffect } from 'react';
import { AnonymousPost, PostComment } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  MessageSquareHeart,
  Plus,
  Send,
  Heart,
  Sparkles,
  ShieldCheck,
  Tag,
  Clock,
  MessageCircle,
  HelpCircle,
  RefreshCw,
  X,
  GraduationCap,
} from 'lucide-react';
import { triggerPushAlert } from '../lib/push.ts';

const CATEGORIES = [
  '전체',
  '학업/성적',
  '친구관계',
  '진로/미래',
  '학교생활',
  '가족/가정',
  '기타',
];

const RANDOM_NICKNAMES = [
  '토닥토닥 다람쥐',
  '따뜻한 판다',
  '빛나는 별무리',
  '걱정많은 참새',
  '새벽녘 솔개',
  '햇살가득 쿼카',
  '포근한 곰돌이',
  '조용한 파랑새',
  '달콤한 나무늘보',
];

export const AnonymousBoard: React.FC = () => {
  const { getAuthToken, role, currentUser } = useAuth();
  const [posts, setPosts] = useState<AnonymousPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  // New post form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('학업/성적');
  const [nickname, setNickname] = useState(
    RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)]
  );
  const [submitting, setSubmitting] = useState(false);

  // Comment input per post
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (e) {
      console.error('Failed to fetch posts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRandomizeNickname = () => {
    const next = RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)];
    setNickname(next);
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          nickname: nickname.trim(),
          isAnonymous: true,
        }),
      });

      if (res.ok) {
        const createdPost = await res.json();
        setPosts((prev) => [
          { ...createdPost, comments: [], reactions: [] },
          ...prev,
        ]);
        setIsWriteModalOpen(false);
        setTitle('');
        setContent('');
        triggerPushAlert(
          '마음 우체통에 새 편지가 도착했어요 📮',
          `"${title.trim()}" - 따뜻한 응원의 한마디를 남겨주세요!`
        );
      }
    } catch (err) {
      console.error('Submit post error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (postId: number, reactionType: 'cheer' | 'sympathy' | 'hug' | 'warmth') => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reactionType }),
      });

      if (res.ok) {
        await fetchPosts();
      }
    } catch (e) {
      console.error('Reaction failed:', e);
    }
  };

  const handleAddComment = async (postId: number) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      const token = await getAuthToken();
      const isTeacher = role === 'teacher';
      const authorName = isTeacher
        ? '담임선생님 🍎'
        : RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)];

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: text,
          authorName,
          isTeacher,
        }),
      });

      if (res.ok) {
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
        setExpandedComments((prev) => ({ ...prev, [postId]: true }));
        await fetchPosts();
      }
    } catch (e) {
      console.error('Comment failed:', e);
    }
  };

  const filteredPosts =
    selectedCategory === '전체'
      ? posts
      : posts.filter((p) => p.category === selectedCategory);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-rose-500 p-6 sm:p-8 text-white shadow-lg shadow-amber-500/15 mb-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            완전 익명 보장 · 안심 나눔터
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            우리들의 마음 우체통 📮
          </h1>
          <p className="mt-2 text-sm sm:text-base text-amber-50 leading-relaxed">
            말 못할 고민이나 힘든 일이 있나요? 이름 없이 편하게 털어놓으세요.
            선생님과 친구들이 따뜻한 위로와 응원으로 함께할게요.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsWriteModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-stone-900 font-bold text-sm shadow-md hover:bg-amber-50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>고민 편지 띄우기</span>
            </button>
            <div className="text-xs text-amber-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>누적된 공감 {posts.reduce((acc, p) => acc + p.empathyCount, 0)}회</span>
            </div>
          </div>
        </div>
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={fetchPosts}
          className="p-2 text-stone-400 hover:text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors shrink-0 cursor-pointer"
          title="새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Post List */}
      {loading ? (
        <div className="py-20 text-center text-stone-400">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">따뜻한 고민 편지들을 불러오는 중입니다...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-stone-200 p-8 shadow-xs">
          <MessageSquareHeart className="w-12 h-12 mx-auto text-amber-400 mb-3" />
          <h3 className="text-base font-bold text-stone-800">
            {selectedCategory === '전체'
              ? '아직 등록된 고민 편지가 없습니다.'
              : `'${selectedCategory}' 카테고리의 고민 편지가 없습니다.`}
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            가장 먼저 솔직한 마음을 털어놓아 보세요. 따뜻한 위로와 공감이 기다리고 있습니다.
          </p>
          <button
            onClick={() => setIsWriteModalOpen(true)}
            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            첫 번째 고민 나누기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const isCommentsOpen = Boolean(expandedComments[post.id]);
            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs hover:border-amber-300 transition-all"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800">
                      {post.category}
                    </span>
                    <span className="text-xs font-bold text-stone-700 flex items-center gap-1">
                      {post.nickname}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-stone-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(post.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Post Title & Content */}
                <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Empathy Reaction Action Bar */}
                <div className="mt-5 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleReaction(post.id, 'cheer')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60 transition-colors cursor-pointer"
                    >
                      <span>💛</span>
                      <span>힘내요</span>
                    </button>
                    <button
                      onClick={() => handleReaction(post.id, 'sympathy')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 transition-colors cursor-pointer"
                    >
                      <span>🌱</span>
                      <span>공감해요</span>
                    </button>
                    <button
                      onClick={() => handleReaction(post.id, 'hug')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60 transition-colors cursor-pointer"
                    >
                      <span>🤗</span>
                      <span>따뜻한 포옹</span>
                    </button>
                    {role === 'teacher' && (
                      <button
                        onClick={() => handleReaction(post.id, 'warmth')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 transition-colors cursor-pointer"
                      >
                        <span>🍎</span>
                        <span>선생님 응원</span>
                      </button>
                    )}
                    <span className="text-xs text-stone-400 font-medium ml-1">
                      공감 {post.empathyCount}
                    </span>
                  </div>

                  {/* Toggle Comments Button */}
                  <button
                    onClick={() =>
                      setExpandedComments((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-stone-400" />
                    <span>응원 댓글 {post.comments?.length || 0}</span>
                  </button>
                </div>

                {/* Comments Section */}
                {isCommentsOpen && (
                  <div className="mt-4 pt-4 border-t border-stone-100 space-y-3 bg-stone-50/70 p-3.5 rounded-xl">
                    {post.comments?.length > 0 ? (
                      <div className="space-y-2.5">
                        {post.comments.map((comment: PostComment) => (
                          <div
                            key={comment.id}
                            className={`p-3 rounded-xl text-xs leading-relaxed ${
                              comment.isTeacher
                                ? 'bg-amber-100/70 border border-amber-300 text-stone-900 shadow-2xs'
                                : 'bg-white border border-stone-200 text-stone-800 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1 font-semibold">
                              <span className="flex items-center gap-1">
                                {comment.isTeacher ? (
                                  <>
                                    <GraduationCap className="w-3.5 h-3.5 text-amber-700" />
                                    <span className="text-amber-900 font-bold">
                                      {comment.authorName}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-stone-700">
                                    {comment.authorName}
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                {new Date(comment.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 text-center py-2">
                        첫 번째 따뜻한 응원의 말을 남겨주세요.
                      </p>
                    )}

                    {/* Add Comment Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                        placeholder={
                          role === 'teacher'
                            ? '담임선생님으로서 따뜻한 조언 한마디...'
                            : '익명으로 친구에게 따뜻한 응원 한마디...'
                        }
                        className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim()}
                        className="p-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                        title="전송"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Write New Post Modal */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <MessageSquareHeart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    고민 편지 띄우기
                  </h3>
                  <p className="text-xs text-stone-500">
                    작성자의 신원은 완벽히 보호됩니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWriteModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPost} className="mt-4 space-y-4">
              {/* Nickname selection */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  익명 닉네임
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-xs text-stone-900 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="익명 닉네임"
                    maxLength={20}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleRandomizeNickname}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>랜덤 생성</span>
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  고민 분야
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {CATEGORIES.filter((c) => c !== '전체').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  제목
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="고민의 핵심을 짧게 적어주세요"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  maxLength={60}
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  고민 내용
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="어떤 고민이든 괜찮아요. 솔직하고 편안하게 털어놓아 보세요."
                  rows={4}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                  required
                />
              </div>

              {/* Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  서로를 존중하고 비방이나 비하 표현은 삼가주세요. 긴급한 위험이나 개인적인 비밀이 필요한 고민은 <strong>1:1 비밀 상담</strong> 탭을 이용해 주세요.
                </span>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !content.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {submitting ? '등록 중...' : '마음 우체통에 띄우기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
