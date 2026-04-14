const CommunityTabs = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="community-tabs" role="tablist" aria-label="Community sections">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.value}
          className={`community-tab ${activeTab === tab.value ? "is-active" : ""}`}
          onClick={() => onChange(tab.value)}
        >
          <span>{tab.label}</span>
          {typeof tab.badge === "number" ? <em>{tab.badge}</em> : null}
        </button>
      ))}
    </div>
  );
};

export default CommunityTabs;
