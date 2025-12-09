import type { CampaignAttachmentDTO } from "../types/campaign";

export default function AttachmentsList({ items }: { items: CampaignAttachmentDTO[] }) {
  if (!items?.length) return <div className="th-muted">No attachments</div>;
  return (
    <div className="th-list">
      {items.map((a, i) => (
        <div key={i} className="th-row">
          <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <a href={a.url} target="_blank" rel="noreferrer" className="link">{a.fileName || a.url}</a>
          </div>
          <div className="th-muted" style={{ marginLeft: 12 }}>
            {a.mimeType || "—"}{a.sizeBytes ? ` · ${formatBytes(a.sizeBytes)}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
function formatBytes(n: number) {
  if (!n) return "0 B";
  const k = 1024, units = ["B","KB","MB","GB","TB"];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${(n / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}
