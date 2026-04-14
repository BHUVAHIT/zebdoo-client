import { useState } from "react";

const MessageComposer = ({
  disabled,
  replyTarget,
  onCancelReply,
  onSubmit,
  submitting,
}) => {
  const [value, setValue] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = String(value || "").trim();
    if (!trimmed) return;

    const tags = String(tagsInput || "")
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);

    const posted = await onSubmit({ bodyMarkdown: trimmed, tags });
    if (posted) {
      setValue("");
      setTagsInput("");
    }
  };

  return (
    <form className="community-card community-message-composer" onSubmit={handleSubmit}>
      <header>
        <h3>{replyTarget ? "Reply in thread" : "Start a discussion"}</h3>
        <p>
          Markdown supported: <strong>**bold**</strong>, lists, links, and fenced code blocks.
        </p>
      </header>

      {replyTarget ? (
        <div className="community-reply-banner">
          <span>Replying to: {replyTarget.author?.name}</span>
          <button type="button" onClick={onCancelReply}>
            Cancel
          </button>
        </div>
      ) : null}

      <textarea
        rows={4}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask a doubt, share a concept, or post a practical tip..."
      />

      <label className="community-composer-tags">
        <span>Tags (comma-separated)</span>
        <input
          type="text"
          value={tagsInput}
          disabled={disabled}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="example: optimization, algebra, mock-test"
        />
      </label>

      <div className="community-inline-actions">
        <button type="submit" className="btn-primary" disabled={disabled || submitting}>
          {submitting ? "Posting..." : replyTarget ? "Post reply" : "Post message"}
        </button>
        <small className="community-muted">{value.trim().length}/2500 characters</small>
      </div>
    </form>
  );
};

export default MessageComposer;
