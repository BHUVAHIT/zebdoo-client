import { memo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import {
  COMMUNITY_FEED_FILTER_OPTIONS,
  COMMUNITY_FEED_FILTERS,
} from "../constants/community.constants";

const CommunityFeedToolbar = ({
  searchQuery,
  onSearch,
  feedFilter = COMMUNITY_FEED_FILTERS.LATEST,
  onFilterChange,
  selectedTopic,
  topics = [],
  onTopicSelect,
  showBookmarksOnly,
  onToggleBookmarksOnly,
}) => {
  return (
    <section className="community-card community-feed-toolbar" aria-label="Feed filters">
      <div className="community-feed-toolbar__search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search posts, code snippets, doubts, or tags"
          aria-label="Search community posts"
        />
      </div>

      <div className="community-feed-toolbar__controls">
        <div className="community-feed-filters" role="group" aria-label="Post sorting">
          <span>
            <SlidersHorizontal size={14} aria-hidden="true" /> Sort
          </span>
          {COMMUNITY_FEED_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={feedFilter === option.value ? "is-active" : ""}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`btn-secondary ${showBookmarksOnly ? "is-active" : ""}`}
          onClick={() => onToggleBookmarksOnly(!showBookmarksOnly)}
        >
          {showBookmarksOnly ? "Showing saved" : "Show saved only"}
        </button>
      </div>

      <div className="community-topic-chips" role="group" aria-label="Topic filters">
        <button
          type="button"
          className={!selectedTopic ? "is-active" : ""}
          onClick={() => onTopicSelect("")}
        >
          All topics
        </button>
        {topics.map((topic) => (
          <button
            key={topic.topic}
            type="button"
            className={selectedTopic === topic.topic ? "is-active" : ""}
            onClick={() => onTopicSelect(topic.topic)}
          >
            #{topic.topic} ({topic.count})
          </button>
        ))}
      </div>
    </section>
  );
};

export default memo(CommunityFeedToolbar);
