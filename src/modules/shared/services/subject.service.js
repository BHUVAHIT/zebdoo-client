import { superAdminService } from "../../superAdmin/services/superAdminService";
import { catalogMutationService } from "./catalogMutation.service";

export const subjectService = {
  list: (query, options) => superAdminService.listSubjects(query, options),
  addSubject: (payload) => catalogMutationService.addSubject(payload),
  create: (payload) => catalogMutationService.addSubject(payload),
  update: (id, payload) => catalogMutationService.updateSubject(id, payload),
  remove: (id) => catalogMutationService.removeSubject(id),
};
