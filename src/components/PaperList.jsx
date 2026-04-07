import { memo } from "react";
import PaperCard from "./PaperCard";

const PaperList = ({
  papers = [],
  bookmarkedPaperIds = new Set(),
  onOpenPaper,
  onToggleBookmark,
}) => {
  if (papers.length === 0) {
    return null;
  }

  return (
    <div className="exam-vault-paper-grid">
      {papers.map((paper) => (
        <PaperCard
          key={paper.id}
          paper={paper}
          isBookmarked={bookmarkedPaperIds.has(paper.id)}
          onOpen={onOpenPaper}
          onToggleBookmark={onToggleBookmark}
        />
      ))}
    </div>
  );
};

export default memo(PaperList);