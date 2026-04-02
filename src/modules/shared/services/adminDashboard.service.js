import { superAdminService } from "../../superAdmin/services/superAdminService";

export const adminDashboardService = {
  getMetrics: () => superAdminService.getMetrics(),
  getInsights: () => superAdminService.getDashboardInsights(),
};
