import { nowIso, uuid } from "../utils/imagesUploaderHelper";
import type { UploaderFn, UploadedMedia } from "../types/imagesUploader";


export function defaultSupabaseUploader(supabase: any): UploaderFn {
return async ({ file, path, bucket, makePublic, signURLs, signTTLSeconds, options }) => {
// 1) Upload with pass-through options (upsert, cacheControl, contentType)
const { error: upErr } = await supabase.storage
.from(bucket)
.upload(path, file, {
upsert: options?.upsert ?? true, // overwrite by default (fits avatar / fixed-slot flows)
cacheControl: options?.cacheControl ?? "",
contentType: options?.contentType ?? (file.type || undefined),
});


if (upErr) throw new Error(upErr.message || "Upload failed");


// 2) Build URL
let url: string;
if (makePublic) {
const { data } = supabase.storage.from(bucket).getPublicUrl(path);
url = data.publicUrl;
} else if (signURLs) {
const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, signTTLSeconds);
if (error) throw new Error(error.message || "Failed to sign URL");
url = data.signedUrl;
} else {
url = ""; // private & not signed — caller can sign later
}


// 3) Return metadata
const media: UploadedMedia = {
id: uuid(),
url,
storageKey: path,
bucket,
mimeType: file.type,
sizeBytes: file.size,
uploadedAt: nowIso(),
originalName: file.name,
};


return media;
};
}