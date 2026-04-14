const TopContributorsCard = ({ contributors, compact = false }) => {
  if (!contributors.length) {
    return (
      <section className="community-card community-contributors-card">
        <header>
          <h3>Weekly Top Contributors</h3>
          <p>Scores refresh based on meaningful participation in the last 7 days.</p>
        </header>
        <p className="community-muted">No contributions yet. Start a helpful discussion to appear here.</p>
      </section>
    );
  }

  return (
    <section className="community-card community-contributors-card">
      <header>
        <h3>Weekly Top Contributors</h3>
        <p>Weighted by posts, helpful votes, and reactions.</p>
      </header>

      <ol className={`community-contributors-list ${compact ? "is-compact" : ""}`}>
        {contributors.map((row) => (
          <li key={row.userId}>
            <div className="community-contributors-list__main">
              <strong>#{row.rank} {row.name}</strong>
              <small>
                {row.messagesLast7Days} posts • {row.helpfulScore} helpful • {row.reactionScore} reactions
              </small>
            </div>
            <span>{row.totalScore} pts</span>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default TopContributorsCard;
