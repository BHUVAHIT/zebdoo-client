import AppErrorBoundary from "../../components/AppErrorBoundary";
import { ToastProvider } from "../../components/notifications/ToastProvider";
import RuntimeSyncProvider from "./RuntimeSyncProvider";

const AppProviders = ({ children }) => {
  return (
    <ToastProvider>
      <RuntimeSyncProvider>
        <AppErrorBoundary>{children}</AppErrorBoundary>
      </RuntimeSyncProvider>
    </ToastProvider>
  );
};

export default AppProviders;
