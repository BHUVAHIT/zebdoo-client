import { superAdminService } from "../../superAdmin/services/superAdminService";

export const catalogMutationService = {
  addSubject: (payload) => superAdminService.createSubject(payload),
  addChapter: (payload) => superAdminService.createChapter(payload),
  addTest: (payload) => superAdminService.createTest(payload),
  addQuestion: (payload) => superAdminService.createQuestion(payload),

  updateSubject: (id, payload) => superAdminService.updateSubject(id, payload),
  updateChapter: (id, payload) => superAdminService.updateChapter(id, payload),
  updateTest: (id, payload) => superAdminService.updateTest(id, payload),
  updateQuestion: (id, payload) => superAdminService.updateQuestion(id, payload),

  removeSubject: (id) => superAdminService.deleteSubject(id),
  removeChapter: (id) => superAdminService.deleteChapter(id),
  removeTest: (id) => superAdminService.deleteTest(id),
  removeQuestion: (id) => superAdminService.deleteQuestion(id),
};
