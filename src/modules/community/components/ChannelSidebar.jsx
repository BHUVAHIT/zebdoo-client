import { memo, useMemo } from "react";

const ChannelSidebar = ({
  channels,
  selectedChannelId,
  onSelect,
  joinedGroups = [],
  showAdminControls = false,
  onToggleEnabled,
  onToggleReadOnly,
}) => {
  const groupedChannels = useMemo(
    () =>
      channels.reduce((acc, channel) => {
        const key = channel.category || "General";
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(channel);
        return acc;
      }, {}),
    [channels]
  );

  return (
    <aside className="community-card community-channel-sidebar" aria-label="Community channels">
      <header>
        <h3>Channels</h3>
        <p>Topic-focused public study conversations.</p>
      </header>

      <div className="community-channel-list">
        {Object.entries(groupedChannels).map(([groupName, rows]) => (
          <section key={groupName} className="community-channel-group">
            <h4>{groupName}</h4>
            {rows.map((channel) => (
              <article
                key={channel.id}
                className={`community-channel-item ${selectedChannelId === channel.id ? "is-active" : ""}`}
              >
                <button
                  type="button"
                  className="community-channel-item__main"
                  onClick={() => onSelect(channel.id)}
                >
                  <strong>#{channel.name}</strong>
                  <small>{channel.description}</small>
                </button>

                <div className="community-channel-item__meta">
                  {channel.memberCount ? <span>{channel.memberCount} members</span> : null}
                  {!channel.isEnabled ? <span>Disabled</span> : null}
                  {channel.isReadOnly ? <span>Read-only</span> : null}
                </div>

                {showAdminControls ? (
                  <div className="community-channel-item__controls">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onToggleEnabled(channel)}
                    >
                      {channel.isEnabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onToggleReadOnly(channel)}
                    >
                      {channel.isReadOnly ? "Unlock" : "Read-only"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ))}
      </div>

      {!showAdminControls ? (
        <div className="community-joined-groups">
          <h4>Joined groups</h4>
          {!joinedGroups.length ? <p className="community-muted">No custom groups joined yet.</p> : null}
          {joinedGroups.map((group) => (
            <button key={group.id} type="button" className="community-group-chip">
              {group.name}
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
};

export default memo(ChannelSidebar);
