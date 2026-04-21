import React from "react";
import "../css/MessageBubble.css";

interface MessageBubbleProps {
  actorName: string;
  message: string;
  timestamp: string;
  isMine: boolean;
  attachments?: string[];
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  actorName,
  message,
  timestamp,
  isMine,
  attachments,
}) => {
  return (
<div className={`message-bubble ${isMine ? "mine" : "theirs"}`}>
  <div className="bubble-content">
    <div className="sender-label">
      {isMine ? "You wrote" : `${actorName} wrote`}
    </div>
    <div className="message-bubble-line">
      <div className="message-text">{message}</div>
      <span className="message-timestamp">{new Date(timestamp).toLocaleString()}</span>
    </div>
    {attachments?.map((url, index) => (
      <div className="attachment" key={index}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          📎 {url.split("/").pop()}
        </a>
      </div>
    ))}
  </div>
</div>
  );
};

export default MessageBubble;
