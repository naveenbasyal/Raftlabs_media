import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { supabase } from "../supabaseClient";

const AuthButtons: React.FC = () => {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();
  const [currentUser, setCurrentUser] = useState<{ id: any } | null>(null);

  useEffect(() => {
   
    if (isAuthenticated && user) {
      const insertUser = async () => {
        // Check if user already exists
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", user.email)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching user", error);
          return;
        }

        // If user doesn't exist, insert them
        if (!data) {
          const { error: insertError } = await supabase.from("users").insert([
            {
              email: user.email,
              name: user.name,
              picture: user.picture || "",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

          if (insertError) {
            console.error("Error inserting user", insertError);
          } else {
            console.log("User inserted successfully!");
          }
        }
        setCurrentUser(data);
      };

      insertUser();
    }
  }, [isAuthenticated, user]);

  return (
    <div className="flex items-center space-x-4">
      {isAuthenticated && user && (
        <div className="w-10 h-10 rounded-full overflow-hidden">
          <img
            src={user?.picture}
            alt={user.name || "User"}
            className="w-full h-full object-cover"
          />
          {user.name}
        </div>
      )}
      {!isAuthenticated ? (
        <button
          onClick={() => loginWithRedirect()}
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors duration-300"
        >
          Log In
        </button>
      ) : (
        <button
          onClick={() =>
            logout({ logoutParams: { returnTo: window.location.origin } })
          }
          className="bg-gray-200 text-black px-4 py-2 rounded-md hover:bg-gray-300 transition-colors duration-300"
        >
          Log Out
        </button>
      )}
    </div>
  );
};

export default AuthButtons;
