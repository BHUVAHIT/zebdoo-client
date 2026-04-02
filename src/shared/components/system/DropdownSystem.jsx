import FilterSingleSelect from "../../../modules/student/questionBank/components/FilterSingleSelect";

const DropdownSystem = ({
  id,
  label,
  value,
  options,
  placeholder,
  disabled,
  isOpen,
  onOpen,
  onClose,
  onChange,
}) => {
  return (
    <FilterSingleSelect
      id={id}
      label={label}
      value={value}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      onChange={onChange}
    />
  );
};

export default DropdownSystem;
