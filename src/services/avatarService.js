/**
 * Profile photos — Supabase Storage bucket "avatars" (see
 * supabase/migrations/20261124_profile_photos.sql).
 *
 * Every photo is resized in the browser before upload: centre-cropped to a
 * square and scaled to 256×256, saved as WebP (JPEG where WebP encoding isn't
 * supported). A phone photo of 3–8 MB becomes ~15–40 KB, so uploads are fast
 * on mobile data and storage stays tiny. The original file never leaves the
 * device.
 *
 * Files live at avatars/<user id>/<timestamp>.webp; storage policies only let
 * a user write inside their own folder. A new file name on every change means
 * browsers and the CDN never show a stale cached photo.
 */
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const BUCKET = "avatars";
const SIZE = 256;
export const MAX_INPUT_BYTES = 15 * 1024 * 1024; // reject anything larger than a normal phone photo
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export class AvatarError extends Error {
  constructor(code) {
    super(code);
    this.code = code; // "type" | "size" | "decode" | "unavailable"
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new AvatarError("decode"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** File → square 256×256 WebP/JPEG blob (EXIF orientation is applied by the browser). */
export async function prepareAvatar(file) {
  if (!file) throw new AvatarError("type");
  if (file.type && !ACCEPTED.includes(file.type)) throw new AvatarError("type");
  if (file.size > MAX_INPUT_BYTES) throw new AvatarError("size");

  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (!side) throw new AvatarError("decode");
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);

  let blob = await canvasToBlob(canvas, "image/webp", 0.85);
  if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", 0.85); // older Safari
  if (!blob) throw new AvatarError("decode");
  return blob;
}

/** Storage path from a public URL of this bucket, or null. */
function pathFromUrl(url) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = (url ?? "").indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length).split("?")[0]) : null;
}

/**
 * Resizes, uploads and saves the photo on the user's profile. Returns the new
 * public URL. The previous photo file is removed afterwards (best effort).
 */
export async function uploadAvatar(userId, file, previousUrl) {
  if (!isSupabaseConfigured) throw new AvatarError("unavailable");
  const blob = await prepareAvatar(file);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
  if (updateError) {
    await supabase.storage.from(BUCKET).remove([path]); // don't leave an orphan file
    throw updateError;
  }

  const oldPath = pathFromUrl(previousUrl);
  if (oldPath && oldPath !== path) supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  return publicUrl;
}

/** Removes the photo from the profile (and its file). */
export async function removeAvatar(userId, currentUrl) {
  if (!isSupabaseConfigured) throw new AvatarError("unavailable");
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) throw error;
  const oldPath = pathFromUrl(currentUrl);
  if (oldPath) supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
}
