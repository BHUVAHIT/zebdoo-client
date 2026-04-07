import { createElement } from "react";
import { Inbox } from "lucide-react";

const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const iconNode = createElement(Icon, { size: 18, "aria-hidden": true });

  return (
    <article className="exam-vault-empty-state">
      {iconNode}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="exam-vault-empty-state__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
};

export default EmptyState;