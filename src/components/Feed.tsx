/* eslint-disable jsx-a11y/img-redundant-alt */
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { supabase } from "../supabaseClient";

interface PostImage {
  image_url: string;
}

interface User {
  id: string;
  name: string;
  picture: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user: User;
  images: PostImage[];
  mentions: User[];
}

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth0();

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPosts();
    }
  }, [isAuthenticated, user]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      if (!user?.email) {
        setError("User email not found");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();

      if (userError || !userData) throw userError;

      const { data: followersData, error: followersError } = await supabase
        .from("followers")
        .select("followee_id")
        .eq("follower_id", userData.id);

      if (followersError) throw followersError;

      const followeeIds = followersData?.map(
        (follower) => follower.followee_id
      );

      if (!followeeIds || followeeIds.length === 0) {
        setPosts([]);
        return;
      }

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(
          `
          id,
          title,
          content,
          created_at,
          users:user_id (id, name, picture),
          post_images (image_url),
          tags (user_id)
        `
        )
        .in("user_id", followeeIds)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      const formattedPosts: Post[] = await Promise.all(
        postsData?.map(async (post: any) => {
          const mentionedUserIds = post.tags.map((tag: any) => tag.user_id);
          const { data: mentionedUsers } = await supabase
            .from("users")
            .select("id, name, picture")
            .in("id", mentionedUserIds);

          return {
            id: post.id,
            title: post.title,
            content: post.content,
            created_at: post.created_at,
            user: post.users,
            images: post.post_images || [],
            mentions: mentionedUsers || [],
          };
        })
      );

      setPosts(formattedPosts);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching posts");
    } finally {
      setLoading(false);
    }
  };

  const ImageGrid: React.FC<{ images: PostImage[] }> = ({ images }) => {
    if (images.length === 0) return null;

    const gridClasses =
      {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-2",
        4: "grid-cols-2",
      }[Math.min(images.length, 4)] || "grid-cols-3";

    return (
      <div className={`grid ${gridClasses} gap-1 mt-4`}>
        {images.map((image, index) => (
          <div
            key={index}
            className={`
              ${
                images.length === 3 && index === 0
                  ? "col-span-2 row-span-2"
                  : ""
              }
              ${images.length === 4 && index < 2 ? "row-span-2" : ""}
              ${images.length > 4 && index >= 4 ? "hidden md:block" : ""}
              relative overflow-hidden
            `}
            style={{ aspectRatio: images.length === 1 ? "16/9" : "1/1" }}
          >
            <img
              src={image.image_url}
              alt={`Post image ${index + 1}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    );
  };

  const formatContent = (content: string, mentions: User[]) => {
    
    let formattedContent = content;
    mentions.forEach((user) => {
      const regex = new RegExp(`@${user.name}`, "g");
      formattedContent = formattedContent.replace(
        regex,
        `<span class="text-blue-500 font-semibold">@${user.name}</span>`
      );
    });
    return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />;
  };

  return (
    <div className="space-y-6 w-full">
      <h2 className="text-xl font-semibold text-gray-900 w-full">News Feed</h2>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading posts...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No posts to show</div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-lg shadow p-4 mx-auto"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img
                      src={post.user.picture}
                      alt={post.user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-medium">{post.user.name}</h3>
                    <span className="text-sm text-gray-500">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-medium mt-2">{post.title}</h4>
                  <div className="mt-1 text-gray-600">
                    {formatContent(post.content, post.mentions)}
                  </div>
                  <ImageGrid images={post.images} />
                  {post.mentions.length > 0 && (
                    <div className="mt-2 text-sm text-gray-500">
                      Mentioned:{" "}
                      {post.mentions.map((user) => user.name).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed;
