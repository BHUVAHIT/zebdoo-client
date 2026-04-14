const CommunityStatCard = ({ label, value, tone = "neutral" }) => {
  return (
    <article className={`community-card community-stat-card tone-${tone}`}>
      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
};

export default CommunityStatCard;
