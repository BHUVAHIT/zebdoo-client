import { superAdminService } from "../../superAdmin/services/superAdminService";
import { catalogMutationService } from "./catalogMutation.service";

export const chapterService = {
  list: (query, options) => superAdminService.listChapters(query, options),
  addChapter: (payload) => catalogMutationService.addChapter(payload),
  create: (payload) => catalogMutationService.addChapter(payload),
  update: (id, payload) => catalogMutationService.updateChapter(id, payload),
  remove: (id) => catalogMutationService.removeChapter(id),
};
