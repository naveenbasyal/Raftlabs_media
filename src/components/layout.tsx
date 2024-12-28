import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { logout, isAuthenticated, user } = useAuth0();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={"/"} className="text-xl font-bold">
            RaftLabs
          </Link>
          <div className="flex items-center gap-x-5">
            {isAuthenticated && user && (
              <Link
                to={"/profile"}
                className="w-10 h-10 rounded-full overflow-hidden"
              >
                <img
                  src={
                    user?.picture ||
                    "https://www.pngkey.com/png/full/73-730477_first-name-profile-image-placeholder-png.png"
                  }
                  alt={user.name || "User"}
                />
              </Link>
            )}
            {isAuthenticated && (
              <button
                onClick={() =>
                  logout({ logoutParams: { returnTo: window.location.origin } })
                  
                }
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="pt-16">
        <div className="max-w-6xl mx-auto px-4">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
