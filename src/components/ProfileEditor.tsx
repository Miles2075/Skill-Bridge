import { useRef, useState } from "react";
import { Camera, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lmsClient } from "@/lib/lms-client";
import { updateLocalSessionProfile, type LocalUser } from "@/lib/local-db";

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read the image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Invalid image file."));
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Unable to process the image."));
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileEditor({
  user,
  accent = "indigo",
  roleLabel,
}: {
  user: LocalUser;
  accent?: "indigo" | "teal";
  roleLabel: string;
}) {
  const [name, setName] = useState(user.user_metadata?.display_name || "");
  const [avatar, setAvatar] = useState(user.user_metadata?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const styles =
    accent === "teal"
      ? { button: "bg-teal-700 hover:bg-teal-800 text-white", ring: "ring-teal-200", text: "text-teal-700", bg: "bg-teal-700" }
      : { button: "bg-indigo-600 hover:bg-indigo-700 text-white", ring: "ring-indigo-200", text: "text-indigo-700", bg: "bg-indigo-600" };

  async function handleImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage("Image must be 8 MB or smaller.");
      return;
    }
    try {
      setMessage("");
      setAvatar(await resizeImage(file));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to process image.");
    }
  }

  async function save() {
    const displayName = name.trim();
    if (!displayName) {
      setMessage("Please enter your name.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await lmsClient.updateProfile({
        displayName,
        avatarUrl: avatar || null,
      });
      updateLocalSessionProfile({
        displayName,
        avatarUrl: avatar || null,
      });
      setMessage("Profile updated successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`group relative grid size-24 place-items-center overflow-hidden rounded-full bg-slate-100 text-2xl font-bold text-slate-500 ring-4 ${styles.ring}`}
            title="Change profile picture"
          >
            {avatar ? (
              <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span>{(name[0] || "U").toUpperCase()}</span>
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-6" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => void handleImage(e.target.files?.[0])}
          />
          <div className="mt-2 flex justify-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className={`text-[11px] font-bold ${styles.text}`}>
              Change photo
            </button>
            {avatar && (
              <button type="button" onClick={() => setAvatar("")} className="text-[11px] font-bold text-red-600">
                <Trash2 className="inline size-3 mr-0.5" /> Remove
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
            <p className="mt-1 text-xs text-slate-500">Update how your profile appears across Skillbridge.</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Display Name</label>
            <Input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Email</label>
            <Input value={user.email} disabled className="mt-1.5 bg-slate-50" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">{message}</span>
            <Button onClick={() => void save()} disabled={saving} className={styles.button}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save Profile
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
        Account type: <span className="font-semibold text-slate-700">{roleLabel}</span>
      </div>
    </div>
  );
}
