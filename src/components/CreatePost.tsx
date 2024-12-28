import React, { useState, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { ImagePlus } from "lucide-react";
import { supabase } from "../supabaseClient";

interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

interface Mention {
  id: string;
  name: string;
}

const CreatePost: React.FC = () => {
  const { user, isAuthenticated } = useAuth0();
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [images, setImages] = useState<FileList | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserList, setShowUserList] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, picture");
    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setCursorPosition(e.target.selectionStart);

    const lastWord = newContent.slice(0, cursorPosition).split(" ").pop();
    if (lastWord && lastWord.startsWith("@") && lastWord.length > 1) {
      setShowUserList(true);
    } else {
      setShowUserList(false);
    }

    // Adjust textarea height
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleUserMention = (user: User) => {
    const contentBefore = content.slice(0, cursorPosition);
    const contentAfter = content.slice(cursorPosition);
    const lastWordIndex = contentBefore.lastIndexOf("@");
    const newContent =
      contentBefore.slice(0, lastWordIndex) + `@${user.name} ` + contentAfter;
    setContent(newContent);
    setMentions([...mentions, { id: user.id, name: user.name }]);
    setShowUserList(false);

    if (textareaRef.current) {
      textareaRef.current.focus();
      const newCursorPosition = lastWordIndex + user.name.length + 2;
      textareaRef.current.setSelectionRange(
        newCursorPosition,
        newCursorPosition
      );
    }
  };

  const renderContent = () => {
    let renderedContent = content;
    mentions.forEach((mention) => {
      const regex = new RegExp(`@${mention.name}`, "g");
      renderedContent = renderedContent.replace(
        regex,
        `<span class="text-blue-500 font-bold">@${mention.name}</span>`
      );
    });
    return <div dangerouslySetInnerHTML={{ __html: renderedContent }} />;
  };

  const handleCreatePost = async () => {
    if (!isAuthenticated || !user) return;

    setLoading(true);
    setError(null);

    try {
      const { data: currentUser, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!currentUser) throw new Error("User not found");
      if (error) throw error;

      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert([
          {
            title,
            content,
            user_id: currentUser.id,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (postError) throw postError;

      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const fileName = `${Date.now()}-${image.name}`;
          const { data, error: uploadError } = await supabase.storage
            .from("post_images")
            .upload(fileName, image);

          if (uploadError) throw uploadError;

          const imageUrl = supabase.storage
            .from("post_images")
            .getPublicUrl(data?.path || "").data.publicUrl;

          if (!imageUrl) throw new Error("Failed to retrieve image URL.");

          await supabase.from("post_images").insert([
            {
              post_id: post[0].id,
              image_url: imageUrl,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      }

      for (const mention of mentions) {
        await supabase.from("tags").insert([
          {
            post_id: post[0].id,
            user_id: mention.id,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      setTitle("");
      setContent("");
      setMentions([]);
      setImages(null);
      alert("Post created successfully!");
    } catch (err: any) {
      console.error(err);
      setError("Error creating post: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const FileList = (files: File[]) => {
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    return dt.files;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 w-full">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img
              src={user?.picture}
              alt={user?.name || "User"}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="flex-1 space-y-4">
          <input
            type="text"
            placeholder="Enter title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="relative">
            <textarea
              ref={textareaRef}
              placeholder="Enter description"
              value={content}
              onChange={handleContentChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none overflow-hidden"
            />
            {showUserList && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleUserMention(user)}
                  >
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full mr-2"
                    />
                    <span>{user.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-gray-700">{renderContent()}</div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
              <ImagePlus className="w-5 h-5" />
              <span>Upload Image</span>
              <span className="text-xs text-gray-400">(Optional)</span>
              <input
                type="file"
                multiple
                onChange={(e) => setImages(e.target.files)}
                className="hidden"
              />
            </label>
            <button
              onClick={handleCreatePost}
              disabled={loading || !title.trim() || !content.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Posting..." : "Post"}
            </button>
          </div>

          {images && images.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Image Preview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from(images).map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                  >
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`preview-${index}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <button
                        onClick={() => {
                          const newImages = Array.from(images);
                          newImages.splice(index, 1);
                          setImages(
                            newImages.length > 0
                              ? (() => {
                                  const dt = new DataTransfer();
                                  newImages.forEach(file => dt.items.add(file));
                                  return dt.files;
                                })()
                              : null
                          );
                        }}
                        className="text-white bg-red-500 hover:bg-red-600 font-bold py-1 px-2 rounded-full text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
