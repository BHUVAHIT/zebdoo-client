import { Eye, Pencil, Trash2 } from "lucide-react";

const RowActions = ({ onEdit, onDelete, onResetPassword }) => (
  <div className="sa-row-actions">
    <button 
      type="button" 
      onClick={onEdit}
      className="sa-row-actions__btn is-edit"
      title="Edit record"
      aria-label="Edit record"
    >
      <Pencil size={14} className="h-4 w-4" />
      <span className="sa-row-actions__tooltip">
        Edit
      </span>
    </button>
    {onResetPassword ? (
      <button 
        type="button" 
        onClick={onResetPassword}
        className="sa-row-actions__btn is-reset"
        title="Reset password"
        aria-label="Reset password"
      >
        <Eye size={14} className="h-4 w-4" />
        <span className="sa-row-actions__tooltip">
          Reset
        </span>
      </button>
    ) : null}
    <button 
      type="button" 
      onClick={onDelete}
      className="sa-row-actions__btn is-delete"
      title="Delete record"
      aria-label="Delete record"
    >
      <Trash2 size={14} className="h-4 w-4" />
      <span className="sa-row-actions__tooltip">
        Delete
      </span>
    </button>
  </div>
);

export default RowActions;
