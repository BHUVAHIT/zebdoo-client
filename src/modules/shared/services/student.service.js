import { superAdminService } from "../../superAdmin/services/superAdminService";

export const studentService = {
  list: (query, options) => superAdminService.listStudents(query, options),
  create: (payload) => superAdminService.createStudent(payload),
  update: (id, payload) => superAdminService.updateStudent(id, payload),
  remove: (id) => superAdminService.deleteStudent(id),
  resetPassword: (id, payload) => superAdminService.resetStudentPassword(id, payload),
};
