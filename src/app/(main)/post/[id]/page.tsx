import { notFound } from "next/navigation";
import { Comments } from "@/features/feed/comments";
import { PostCard } from "@/features/feed/post-card";
import { getComments, getCurrentProfile, getFeed } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { z } from "zod";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return {};
  const [post] = await getFeed({ post: id, limit: 1 });
  if (!post) return {};
  const who = post.business?.name ?? post.author.full_name;
  const desc = post.body.trim().slice(0, 160);
  return {
    title: `${who}: ${desc.slice(0, 50)}`, description: desc,
    openGraph: { title: who, description: desc, type: "article", images: [{ url: post.media[0]?.url ?? "/og-default.png" }] },
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [[post], { t, locale }, profile] = await Promise.all([getFeed({ post: id, limit: 1 }), getI18n(), getCurrentProfile()]);
  if (!post) notFound();
  const comments = await getComments(id);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PostCard post={post} t={t} locale={locale} userId={profile?.id ?? null} detail />
      <Comments postId={id} comments={comments} t={t} locale={locale} userId={profile?.id ?? null} />
    </div>
  );
}
