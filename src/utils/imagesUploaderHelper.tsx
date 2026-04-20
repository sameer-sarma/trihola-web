export const DEFAULT_ACCEPT = [
"image/jpeg",
"image/png",
"image/webp",
"image/gif",
"video/mp4",
"video/quicktime",
];


export function uuid() {
return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
const v = c === "x" ? r : (r & 0x3) | 0x8;
return v.toString(16);
});
}


export function nowIso() {
return new Date().toISOString();
}


function pad2(n: number) {
return String(n).padStart(2, "0");
}


export function resolvePath(
pathTemplate: string,
tokenMap: Record<string, string | undefined>,
file: File
) {
const d = new Date();
const tokens = {
uuid: uuid(),
ext: (file.name.split(".").pop() || "bin").toLowerCase(),
yyyy: String(d.getFullYear()),
mm: pad2(d.getMonth() + 1),
dd: pad2(d.getDate()),
...tokenMap,
} as Record<string, string | undefined>;


return pathTemplate.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => tokens[k] ?? `{${k}}`);
}


export function pickPrimary(items: { url: string; isCover?: boolean }[]): string | null {
if (!items?.length) return null;
const cover = items.find(i => i.isCover);
return (cover?.url ?? items[0]?.url ?? null) as string | null;
}


// Simple dimension probe for images
export async function probeImage(file: File): Promise<{ width?: number; height?: number }> {
if (!file.type.startsWith("image/")) return {};
return new Promise((resolve) => {
const img = new Image();
img.onload = () => resolve({ width: img.width, height: img.height });
img.onerror = () => resolve({});
img.src = URL.createObjectURL(file);
});
}