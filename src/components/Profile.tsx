import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { supabase } from "../supabaseClient";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  bio: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  image_url?: string;
}

const Profile: React.FC = () => {
  const { user, isAuthenticated } = useAuth0();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchProfile();
    }
  }, [isAuthenticated, user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", user?.email)
        .single();

      if (error) throw error;

      setProfile(data);
      setName(data.name);
      setBio(data.bio || "");

      // here we r Fetching follower count
      const { count: followerCount, error: followerError } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("followee_id", data.id);

      if (followerError) throw followerError;
      setFollowerCount(followerCount || 0);

      // here we r Fetching following count
      const { count: followingCount, error: followingError } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", data.id);

      if (followingError) throw followingError;
      setFollowingCount(followingCount || 0);

      // here we r Fetching user's posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(
          `
          id,
          title,
          content,
          created_at,
          post_images (image_url)
        `
        )
        .eq("user_id", data.id)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      setPosts(
        postsData.map((post) => ({
          ...post,
          image_url: post.post_images?.[0]?.image_url,
        }))
      );
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ name, bio })
        .eq("id", profile?.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, name, bio } : null));
      setIsEditing(false);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return <div className="text-center py-8">Loading profile...</div>;
  if (error)
    return <div className="text-center py-8 text-red-500">{error}</div>;
  if (!profile) return <div className="text-center py-8">No profile found</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-8">
        <div className="flex items-center space-x-4">
          <img
            src={profile?.picture || user?.picture}
            alt={profile.name}
            className="w-20 h-20 rounded-full object-cover"
          />
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-2xl font-bold mb-2 border rounded px-2 py-1 w-full"
              />
            ) : (
              <h2 className="text-2xl font-bold">{profile.name}</h2>
            )}
            <p className="text-gray-600">{profile.email}</p>
            <div className="flex space-x-4 mt-2">
              <span className="text-sm text-gray-500">
                {followerCount} Followers
              </span>
              <span className="text-sm text-gray-500">
                {followingCount} Following
              </span>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Bio</h3>
          {isEditing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full h-32 border rounded px-2 py-1"
            />
          ) : (
            <p className="text-gray-700">{profile.bio || "No bio provided"}</p>
          )}
        </div>
        <div className="mt-6">
          {isEditing ? (
            <div className="space-x-4">
              <button
                onClick={handleSave}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
      <div className="border-t">
        <div className="p-8">
          <h3 className="text-xl font-semibold mb-4">My Posts</h3>
          {posts.length === 0 ? (
            <p className="text-gray-500">No posts yet.</p>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-lg shadow p-4"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <img
                      src={profile.picture}
                      alt={profile.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="font-medium text-lg">{post.title}</h4>
                      <span className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{post.content}</p>
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="rounded-lg max-h-64 w-full object-cover mb-4"
                    />
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
