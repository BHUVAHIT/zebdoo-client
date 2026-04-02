import { useCallback, useEffect, useState } from "react";
import { adminDashboardService } from "../../../shared/services/adminDashboard.service";
import "../adminDashboard.css";

const AdminDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState({
    analytics: {
      totalEntities: 0,
      activeEntities: 0,
      inactiveEntities: 0,
      questionCoverage: 0,
      generatedAt: null,
    },
    health: {
      auth: "Unknown",
      dataStore: "Unknown",
      apiLatencyMs: 0,
      incidents: 0,
    },
    contentWorkflow: {
      draft: 0,
      review: 0,
      published: 0,
    },
    studentMonitoring: {
      activeLearners: 0,
      lowPerformingStudents: 0,
      totalAttempts: 0,
    },
    topicDifficulty: [],
    recentActivity: [],
  });

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminDashboardService.getInsights();
      setInsights(response);
    } catch (requestError) {
      setError(requestError.message || "Unable to load admin dashboard insights.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  if (loading) {
    return <p className="sa-status">Loading admin analytics workspace...</p>;
  }

  if (error) {
    return (
      <div className="sa-data-card sa-admin-dashboard__error">
        <p className="sa-status sa-status--error">{error}</p>
        <button type="button" className="sa-btn sa-btn--primary" onClick={loadInsights}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="sa-admin-dashboard">
      <div className="sa-admin-dashboard__analytics">
        <article>
          <span>Total Entities</span>
          <strong>{insights.analytics.totalEntities}</strong>
        </article>
        <article>
          <span>Active Records</span>
          <strong>{insights.analytics.activeEntities}</strong>
        </article>
        <article>
          <span>Inactive Records</span>
          <strong>{insights.analytics.inactiveEntities}</strong>
        </article>
        <article>
          <span>Question Coverage</span>
          <strong>{insights.analytics.questionCoverage}%</strong>
        </article>
      </div>

      <div className="sa-admin-dashboard__grid">
        <article className="sa-data-card">
          <header className="sa-data-card__head">
            <div>
              <h2>System Health</h2>
              <p>Operational state across critical learning-platform services.</p>
            </div>
          </header>

          <dl className="sa-admin-dashboard__health-list">
            <div>
              <dt>Authentication</dt>
              <dd>{insights.health.auth}</dd>
            </div>
            <div>
              <dt>Data Store</dt>
              <dd>{insights.health.dataStore}</dd>
            </div>
            <div>
              <dt>API Latency</dt>
              <dd>{insights.health.apiLatencyMs}ms</dd>
            </div>
            <div>
              <dt>Open Incidents</dt>
              <dd>{insights.health.incidents}</dd>
            </div>
          </dl>
        </article>

        <article className="sa-data-card">
          <header className="sa-data-card__head">
            <div>
              <h2>Recent Management Activity</h2>
              <p>Latest resource changes and updates for administrative operations.</p>
            </div>
          </header>

          {insights.recentActivity.length === 0 ? (
            <p className="sa-status sa-status--empty">No recent admin activity found.</p>
          ) : (
            <ul className="sa-admin-dashboard__activity-list">
              {insights.recentActivity.map((activity) => (
                <li key={activity.id}>
                  <div>
                    <strong>{activity.entity}</strong>
                    <p>{activity.message}</p>
                  </div>
                  <span>{activity.status}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="sa-data-card">
          <header className="sa-data-card__head">
            <div>
              <h2>Content Workflow</h2>
              <p>Draft to publish throughput for question lifecycle governance.</p>
            </div>
          </header>

          <dl className="sa-admin-dashboard__health-list">
            <div>
              <dt>Draft</dt>
              <dd>{insights.contentWorkflow.draft}</dd>
            </div>
            <div>
              <dt>Review</dt>
              <dd>{insights.contentWorkflow.review}</dd>
            </div>
            <div>
              <dt>Published</dt>
              <dd>{insights.contentWorkflow.published}</dd>
            </div>
          </dl>
        </article>

        <article className="sa-data-card">
          <header className="sa-data-card__head">
            <div>
              <h2>Student Monitoring</h2>
              <p>Track learner activity and detect at-risk cohorts early.</p>
            </div>
          </header>

          <dl className="sa-admin-dashboard__health-list">
            <div>
              <dt>Active Learners</dt>
              <dd>{insights.studentMonitoring.activeLearners}</dd>
            </div>
            <div>
              <dt>Low Performing</dt>
              <dd>{insights.studentMonitoring.lowPerformingStudents}</dd>
            </div>
            <div>
              <dt>Total Attempts</dt>
              <dd>{insights.studentMonitoring.totalAttempts}</dd>
            </div>
          </dl>
        </article>

        <article className="sa-data-card">
          <header className="sa-data-card__head">
            <div>
              <h2>Most Difficult Topics</h2>
              <p>Topics with lowest student accuracy from static attempt analytics.</p>
            </div>
          </header>

          {insights.topicDifficulty.length === 0 ? (
            <p className="sa-status sa-status--empty">No topic analytics available yet.</p>
          ) : (
            <ul className="sa-admin-dashboard__activity-list">
              {insights.topicDifficulty.map((topic) => (
                <li key={topic.id}>
                  <div>
                    <strong>{topic.subjectName}</strong>
                    <p>{topic.chapterName}</p>
                  </div>
                  <span>{topic.averageAccuracy}%</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
};

export default AdminDashboardPage;
