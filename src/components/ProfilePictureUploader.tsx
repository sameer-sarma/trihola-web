import { useState } from "react";
import { supabase } from "../supabaseClient"; // Ensure you've configured this
import "../css/EditProfile.css";

interface Props {
  userId: string;
  onUploadComplete: (imageUrl: string) => void;
}

export default function ProfilePictureUploader({ userId, onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  
  const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET!;
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const filePath = `user_${userId}/avatar.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { upsert: true });

    if (error) {
      alert("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    const publicUrl = data?.publicUrl;

    if (publicUrl) {
      onUploadComplete(publicUrl); // Send URL to Ktor later
    }

    setUploading(false);
  };

return (
  <div className="form-group">
    <label htmlFor="profile-picture">Upload profile picture:</label>
    <input
      id="profile-picture"
      type="file"
      accept="image/*"
      onChange={handleFileChange}
    />
    {uploading && <p className="info-text">Uploading...</p>}
  </div>
);
}
