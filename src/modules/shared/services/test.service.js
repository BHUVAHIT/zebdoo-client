import { superAdminService } from "../../superAdmin/services/superAdminService";
import { catalogMutationService } from "./catalogMutation.service";

export const testService = {
  list: (query, options) => superAdminService.listTests(query, options),
  addTest: (payload) => catalogMutationService.addTest(payload),
  create: (payload) => catalogMutationService.addTest(payload),
  update: (id, payload) => catalogMutationService.updateTest(id, payload),
  remove: (id) => catalogMutationService.removeTest(id),
  autoGenerate: (payload) => superAdminService.autoGenerateTests(payload),
};
