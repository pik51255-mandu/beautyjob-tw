import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Eye, MessageSquare, Edit, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { COMMUNITY_CATEGORY_LABELS } from "@shared/constants";
import { format, formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { toast } from "sonner";
import ReportButton from "@/components/ReportButton";

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [comment, setComment] = useState("");

  const { data: post, isLoading } = trpc.community.byId.useQuery({ id: Number(id) });
  const { data: comments } = trpc.comments.list.useQuery({ postType: "community", postId: Number(id) });

  const deletePost = trpc.community.delete.useMutation({
    onSuccess: () => { toast.success("文章已刪除"); navigate("/community"); },
  });

  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      setComment("");
      utils.comments.list.invalidate({ postType: "community", postId: Number(id) });
      toast.success("留言已送出");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteComment = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ postType: "community", postId: Number(id) });
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-10 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">文章不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/community")}>返回社群</Button>
      </div>
    );
  }

  const isOwner = user?.id === post.authorId;

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/community")} className="mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回社群
      </Button>

      <div className="bg-white rounded-xl border border-border overflow-hidden mb-6">
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Badge className={`mb-3 text-xs ${post.category === "technique" ? "bg-blue-100 text-blue-700" : post.category === "education" ? "bg-purple-100 text-purple-700" : post.category === "news" ? "bg-amber-100 text-amber-700" : post.category === "qa" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                {COMMUNITY_CATEGORY_LABELS[post.category] ?? post.category}
              </Badge>
              <h1 className="text-2xl font-bold">{post.title}</h1>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span>{format(new Date(post.createdAt), "yyyy/MM/dd HH:mm")}</span>
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{post.viewCount}</span>
                <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.commentCount}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {isOwner ? (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/community/${post.id}/edit`}><Edit className="w-4 h-4 mr-1" />編輯</a>
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/5"
                    onClick={() => { if (confirm("確定要刪除？")) deletePost.mutate({ id: post.id }); }}>
                    <Trash2 className="w-4 h-4 mr-1" />刪除
                  </Button>
                </>
              ) : (
                <ReportButton targetType="community" targetId={post.id} />
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
            {post.content}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">留言 ({comments?.length ?? 0})</h2>
        </div>

        <div className="divide-y divide-border">
          {comments && comments.length > 0 ? (
            comments.map((c) => (
              <div key={c.id} className="p-4 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  {c.authorId}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: zhTW })}
                    </span>
                    {user?.id === c.authorId && (
                      <button
                        onClick={() => deleteComment.mutate({ id: c.id })}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                  <p className="text-sm mt-1 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              尚無留言，來第一個留言吧！
            </div>
          )}
        </div>

        {isAuthenticated ? (
          <div className="p-4 border-t border-border">
            <div className="flex gap-3">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="寫下您的留言..."
                rows={2}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (!comment.trim()) return;
                  createComment.mutate({ postType: "community", postId: post.id, content: comment });
                }}
                disabled={!comment.trim() || createComment.isPending}
                size="icon"
                className="shrink-0 self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-border text-center text-sm text-muted-foreground">
            <a href="/api/oauth/callback" className="text-primary hover:underline">登入</a> 後才能留言
          </div>
        )}
      </div>
    </div>
  );
}
