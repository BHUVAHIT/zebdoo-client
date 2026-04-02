import ConfirmDialog from "../../../modules/superAdmin/components/ConfirmDialog";
import ModalDrawer from "../../../modules/superAdmin/components/ModalDrawer";

export const ModalSystem = ({ open, title, width, onClose, children }) => (
  <ModalDrawer open={open} title={title} width={width} onClose={onClose}>
    {children}
  </ModalDrawer>
);

export const ConfirmModalSystem = (props) => <ConfirmDialog {...props} />;
