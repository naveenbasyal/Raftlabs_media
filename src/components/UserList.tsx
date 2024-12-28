import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { supabase } from "../supabaseClient";

interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

const UserList: React.FC = () => {
  const { user, isAuthenticated } = useAuth0();
  const [users, setUsers] = useState<User[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      const fetchCurrentUser = async () => {
        const { data, error } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email)
          .limit(1)
          .single();

        if (error) {
          console.error("Error fetching current user data:", error);
        } else {
          setCurrentUserId(data?.id || null);
        }
      };
      fetchCurrentUser();
    }
  }, [isAuthenticated, user?.email]);

  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      const fetchUsers = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5);

          if (error) throw error;

          const filteredUsers = data?.filter(
            (userData: User) => userData.id !== currentUserId
          );
          setUsers(filteredUsers || []);
        } catch (error) {
          console.error("Error fetching users:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchUsers();
    }
  }, [isAuthenticated, currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      const fetchFollowing = async () => {
        const { data, error } = await supabase
          .from("followers")
          .select("followee_id")
          .eq("follower_id", currentUserId);

        if (error) {
          console.error("Error fetching following data:", error);
        } else {
          setFollowing(new Set(data?.map((item) => item.followee_id)));
        }
      };
      fetchFollowing();
    }
  }, [currentUserId]);

  const handleFollow = async (followee_id: string) => {
    if (!currentUserId) return;

    try {
      if (following.has(followee_id)) {
        await supabase
          .from("followers")
          .delete()
          .match({ follower_id: currentUserId, followee_id });

        setFollowing((prev) => {
          const next = new Set(prev);
          next.delete(followee_id);
          return next;
        });
      } else {
        await supabase.from("followers").insert([
          {
            follower_id: currentUserId,
            followee_id,
            created_at: new Date().toISOString(),
          },
        ]);

        setFollowing((prev) => new Set([...prev, followee_id]));
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Suggested People
      </h2>
      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No users to show</div>
      ) : (
        <div className="space-y-4">
          {users.map((userData) => (
            <div key={userData.id} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img
                    src={userData.picture}
                    alt={userData.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{userData.name}</h3>
                <p className="text-sm text-gray-500 truncate">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
              {userData.id !== currentUserId && (
                <button
                  onClick={() => handleFollow(userData.id)}
                  className={`flex-shrink-0 px-4 py-1 text-sm rounded-full border ${
                    following.has(userData.id)
                      ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                      : "border-blue-500 bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {following.has(userData.id) ? "Unfollow" : "Follow"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserList;
