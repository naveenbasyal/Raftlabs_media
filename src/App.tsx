import React, { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Layout from "./components/layout";
import CreatePost from "./components/CreatePost";
import Feed from "./components/Feed";
import UserList from "./components/UserList";
import "./App.css";
import { supabase } from "./supabaseClient";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Profile from "./components/Profile";
import toast, { Toaster } from "react-hot-toast";

const App: React.FC = () => {
  const { isAuthenticated, loginWithRedirect, user } = useAuth0();

  useEffect(() => {
    if (isAuthenticated && user) {
      const insertUser = async () => {
        // Check if user already exists
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", user.email)
          .limit(1)
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
      };

      insertUser();
    }
  }, [isAuthenticated, user]);
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Toaster />
        <button
          onClick={() => {
            toast.loading("Redirecting to login page...");
            loginWithRedirect();
          }}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Log In to Continue
        </button>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route
            path="/"
            element={
              <div className="py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
                <div className="space-y-6 flex flex-col items-center">
                  <CreatePost />
                  <Feed />
                </div>
                <div className="lg:sticky lg:top-20">
                  <UserList />
                </div>
              </div>
            }
          />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
