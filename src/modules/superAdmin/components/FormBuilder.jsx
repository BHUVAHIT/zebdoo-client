import { useEffect, useMemo, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import StyledSelect from "./StyledSelect";

const readFieldValue = (field, values) => {
  const value = values[field.name];
  return value ?? "";
};

const isBlankValue = (value) => {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
};

const createFieldSchema = (field) => {
  let schema = Yup.mixed();

  if (field.required) {
    schema = schema.test("required", `${field.label} is required.`, (value) => {
      if (typeof value === "boolean") {
        return true;
      }

      if (typeof value === "number") {
        return !Number.isNaN(value);
      }

      return !isBlankValue(value);
    });
  }

  if (field.type === "email") {
    schema = schema.test("email", "Enter a valid email address.", (value) => {
      const normalized = String(value ?? "").trim();
      if (!normalized) {
        return true;
      }

      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    });
  }

  if (typeof field.validate === "function") {
    schema = schema.test("custom", "", function validateWithField(value) {
      const message = field.validate(value, this.parent);
      if (!message) {
        return true;
      }

      return this.createError({ message });
    });
  }

  return schema;
};

const FormBuilder = ({
  fields,
  values,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}) => {
  const [submitError, setSubmitError] = useState("");
  const [passwordVisibility, setPasswordVisibility] = useState({});
  const textareaRefs = useRef({});

  const initialValues = useMemo(() => {
    return fields.reduce((accumulator, field) => {
      if (field.type === "hidden") {
        return accumulator;
      }

      accumulator[field.name] = readFieldValue(field, values);
      return accumulator;
    }, {});
  }, [fields, values]);

  const validationSchema = useMemo(() => {
    const shape = fields.reduce((accumulator, field) => {
      if (field.type === "hidden") {
        return accumulator;
      }

      accumulator[field.name] = createFieldSchema(field);
      return accumulator;
    }, {});

    return Yup.object().shape(shape);
  }, [fields]);

  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async () => {},
  });

  const handleFieldChange = (field, nextValue) => {
    onChange(field.name, nextValue);
    formik.setFieldValue(field.name, nextValue, false);

    if (formik.touched[field.name]) {
      formik.validateField(field.name);
    }
  };

  const handleFieldBlur = (fieldName) => {
    formik.setFieldTouched(fieldName, true, true);
  };

  const togglePasswordVisibility = (fieldName) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const resizeTextarea = (textarea) => {
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    fields.forEach((field) => {
      if (field.type === "textarea" && field.autoResize) {
        resizeTextarea(textareaRefs.current[field.name]);
      }
    });
  }, [fields, values]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const touchedState = fields.reduce((accumulator, field) => {
      if (field.type === "hidden") {
        return accumulator;
      }

      accumulator[field.name] = true;
      return accumulator;
    }, {});

    await formik.setTouched(touchedState, true);

    const nextErrors = await formik.validateForm();
    if (Object.keys(nextErrors).length > 0) {
      return;
    }


    try {
      await onSubmit();
      setSubmitError("");
    } catch (error) {
      setSubmitError(error?.message || "Unable to save changes. Please try again.");
    }
  };

  return (
    <form className="sa-form" onSubmit={handleSubmit}>
      {fields.map((field) => {
        if (field.type === "hidden") {
          return null;
        }

        const value = readFieldValue(field, values);
        const inputId = `form-field-${field.name}`;
        const errorId = `${inputId}-error`;
        const errorMessage =
          formik.touched[field.name] && formik.errors[field.name]
            ? String(formik.errors[field.name])
            : "";
        const isPassword = field.type === "password";
        const inputType = isPassword
          ? passwordVisibility[field.name]
            ? "text"
            : "password"
          : field.type || "text";
        const inputClassName = `sa-input ${errorMessage ? "is-error" : ""}`.trim();
        const isFullWidthField = field.fullWidth ?? field.type === "textarea";

        return (
          <label
            key={field.name}
            className={`sa-field ${isFullWidthField ? "sa-field--full" : ""}`.trim()}
          >
            <div className="sa-field__label-row">
              <span>
                {field.label}
              </span>
              {field.required ? <span className="sa-field__required">*</span> : null}
            </div>

            {field.type === "select" ? (
              <StyledSelect
                value={value}
                onChange={(nextValue) => {
                  handleFieldChange(field, nextValue);
                  handleFieldBlur(field.name);
                }}
                options={[
                  { label: `Select ${field.label}`, value: "" },
                  ...(field.options || []).map((option) => ({
                    label: option.label,
                    value: option.value,
                  })),
                ]}
                disabled={field.disabled}
                placeholder={`Select ${field.label}`}
                className="sa-field__select"
              />
            ) : null}

            {field.type === "textarea" ? (
              <textarea
                id={inputId}
                rows={field.rows || 4}
                value={value}
                onChange={(event) => {
                  handleFieldChange(field, event.target.value);
                  if (field.autoResize) {
                    resizeTextarea(event.target);
                  }
                }}
                onBlur={() => handleFieldBlur(field.name)}
                placeholder={field.placeholder || ""}
                disabled={field.disabled}
                readOnly={field.readOnly}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? errorId : undefined}
                className={`${inputClassName} sa-input--textarea`}
                ref={(element) => {
                  textareaRefs.current[field.name] = element;
                }}
              />
            ) : null}

            {(!field.type ||
              field.type === "text" ||
              field.type === "email" ||
              field.type === "number" ||
              field.type === "password") ? (
              <div className="sa-field__control">
                <input
                  id={inputId}
                  type={inputType}
                  value={value}
                  min={field.min}
                  onChange={(event) => handleFieldChange(field, event.target.value)}
                  onBlur={() => handleFieldBlur(field.name)}
                  placeholder={field.placeholder || ""}
                  disabled={field.disabled}
                  readOnly={field.readOnly}
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={errorMessage ? errorId : undefined}
                  autoComplete={isPassword ? "new-password" : undefined}
                  className={inputClassName}
                />

                {isPassword ? (
                  <button
                    type="button"
                    className="sa-field__toggle"
                    onClick={() => togglePasswordVisibility(field.name)}
                    aria-label={passwordVisibility[field.name] ? "Hide password" : "Show password"}
                  >
                    {passwordVisibility[field.name] ? "Hide" : "Show"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {errorMessage ? <p id={errorId} className="sa-field__error">{errorMessage}</p> : null}
          </label>
        );
      })}

      {submitError ? (
        <div className="sa-form__error">
          <p>{submitError}</p>
        </div>
      ) : null}

      <div className="sa-form__actions">
        <button 
          type="button" 
          className="sa-btn"
          onClick={onCancel} 
          disabled={submitting}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="sa-btn sa-btn--primary"
          disabled={submitting}
        >
          {submitting ? "Saving..." : submitLabel || "Save"}
        </button>
      </div>
    </form>
  );
};

export default FormBuilder;
