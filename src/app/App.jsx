import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "../routes";
import AppProviders from "./providers/AppProviders";

const App = () => {
  return (
    <Router>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </Router>
  );
};

export default App;
