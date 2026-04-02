import { Component } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../routes/routePaths";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    if (typeof this.props.onError === "function") {
      this.props.onError(error, info);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="app-error-boundary" role="alert">
        <section className="app-error-boundary__card">
          <p className="app-error-boundary__kicker">Unexpected application error</p>
          <h1>We could not complete your request.</h1>
          <p>
            The issue has been captured for investigation. You can retry this action or return
            to a safe page.
          </p>
          <p className="app-error-boundary__message">{this.state.error?.message || "Unknown error"}</p>

          <div className="app-error-boundary__actions">
            <button type="button" className="btn-primary" onClick={this.reset}>
              Retry
            </button>
            <Link className="btn-secondary" to={ROUTES.home}>
              Go to Home
            </Link>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
