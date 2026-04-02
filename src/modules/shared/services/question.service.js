import { superAdminService } from "../../superAdmin/services/superAdminService";
import { catalogMutationService } from "./catalogMutation.service";

export const questionService = {
  list: (query, options) => superAdminService.listQuestions(query, options),
  addQuestion: (payload) => catalogMutationService.addQuestion(payload),
  create: (payload) => catalogMutationService.addQuestion(payload),
  update: (id, payload) => catalogMutationService.updateQuestion(id, payload),
  remove: (id) => catalogMutationService.removeQuestion(id),
  bulkImport: (payload) => superAdminService.bulkImportQuestions(payload),
};
