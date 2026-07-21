import { v2 as cloudinary } from "cloudinary";

// Support both CLOUDINARY_URL and individual vars
// CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
const cloudinaryUrl = process.env.CLOUDINARY_URL;
if (cloudinaryUrl) {
  const match = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (match) {
    cloudinary.config({
      api_key: match[1],
      api_secret: match[2],
      cloud_name: match[3],
      secure: true,
    });
  }
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export default cloudinary;

/**
 * Uploads a base64 data URI or a URL to Cloudinary.
 * @param data - base64 data URI (e.g. "data:image/png;base64,...") or a URL
 * @param folder - Cloudinary folder to store the image in
 * @returns The secure URL of the uploaded image
 */
export async function uploadToCloudinary(data: string, folder = "estudiojoha/services"): Promise<string> {
  const result = await cloudinary.uploader.upload(data, {
    folder,
    resource_type: "image",
    // Auto format (webp on supporting browsers) + quality
    transformation: [
      { quality: "auto", fetch_format: "auto" },
      { width: 800, crop: "limit" },
    ],
  });
  return result.secure_url;
}

/**
 * Deletes an image from Cloudinary by its secure URL.
 */
export async function deleteFromCloudinary(url: string): Promise<void> {
  try {
    // Extract public_id from URL: .../upload/v12345/estudiojoha/services/abc123.jpg
    const parts = url.split("/upload/");
    if (parts.length < 2) return;
    const withVersion = parts[1]; // e.g. "v12345/estudiojoha/services/abc123.jpg"
    const withoutVersion = withVersion.replace(/^v\d+\//, ""); // "estudiojoha/services/abc123.jpg"
    const publicId = withoutVersion.replace(/\.[^/.]+$/, ""); // remove extension
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // silently ignore errors on delete
  }
}
