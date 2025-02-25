// types/rules.ts
interface ValidationRule {
  type: 'required' | 'pattern' | 'minLength' | 'maxLength' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

interface FieldRule {
  id: string;
  type: 'text' | 'number' | 'date' | 'select' | 'custom';
  label: string;
  placeholder?: string;
  validations: ValidationRule[];
  dependencies?: {
    field: string;
    value: any;
    action: 'show' | 'hide' | 'require' | 'disable';
  }[];
  options?: { value: string; label: string }[];
  component?: React.ComponentType<any>;
}

interface SectionRule {
  id: string;
  title: string;
  fields: FieldRule[];
  conditions?: {
    field: string;
    value: any;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  }[];
}

// hooks/useDynamicForm.ts
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

export const useDynamicForm = (rules: SectionRule[], initialData = {}) => {
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
    setValue,
    clearErrors
  } = useForm({
    defaultValues: initialData
  });

  const formValues = watch();

  useEffect(() => {
    updateFieldVisibility(formValues);
  }, [formValues]);

  const updateFieldVisibility = (values: any) => {
    const visible: string[] = [];
    const required: string[] = [];

    rules.forEach(section => {
      section.fields.forEach(field => {
        let shouldShow = true;
        let isRequired = field.validations.some(v => v.type === 'required');

        // Check field dependencies
        field.dependencies?.forEach(dep => {
          const dependentValue = values[dep.field];
          if (dep.action === 'show') {
            shouldShow = shouldShow && dependentValue === dep.value;
          } else if (dep.action === 'require') {
            isRequired = isRequired || dependentValue === dep.value;
          }
        });

        if (shouldShow) {
          visible.push(field.id);
          if (isRequired) required.push(field.id);
        }
      });
    });

    setVisibleFields(visible);
    setRequiredFields(required);
  };

  return {
    register,
    handleSubmit,
    errors,
    setValue,
    clearErrors,
    visibleFields,
    requiredFields
  };
};

// components/DynamicField.tsx
import React from 'react';

interface DynamicFieldProps {
  field: FieldRule;
  register: any;
  errors: any;
  isVisible: boolean;
  isRequired: boolean;
}

export const DynamicField: React.FC<DynamicFieldProps> = ({
  field,
  register,
  errors,
  isVisible,
  isRequired
}) => {
  if (!isVisible) return null;

  if (field.component) {
    return <field.component {...field} register={register} />;
  }

  const renderField = () => {
    switch (field.type) {
      case 'select':
        return (
          <select
            {...register(field.id, {
              required: isRequired && 'This field is required',
              validate: (value: any) => {
                for (const validation of field.validations) {
                  if (validation.type === 'custom' && validation.validator) {
                    if (!validation.validator(value)) {
                      return validation.message;
                    }
                  }
                }
                return true;
              }
            })}
            className="w-full p-2 border rounded"
          >
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type={field.type}
            {...register(field.id, {
              required: isRequired && 'This field is required',
              pattern: field.validations.find(v => v.type === 'pattern')?.value,
              minLength: field.validations.find(v => v.type === 'minLength')?.value,
              maxLength: field.validations.find(v => v.type === 'maxLength')?.value,
              validate: (value: any) => {
                for (const validation of field.validations) {
                  if (validation.type === 'custom' && validation.validator) {
                    if (!validation.validator(value)) {
                      return validation.message;
                    }
                  }
                }
                return true;
              }
            })}
            placeholder={field.placeholder}
            className="w-full p-2 border rounded"
          />
        );
    }
  };

  return (
    <div className="mb-4">
      <label className="block mb-2">
        {field.label}
        {isRequired && <span className="text-red-500">*</span>}
      </label>
      {renderField()}
      {errors[field.id] && (
        <span className="text-red-500 text-sm">
          {errors[field.id].message}
        </span>
      )}
    </div>
  );
};

// components/DynamicForm.tsx
import React from 'react';
import { DynamicField } from './DynamicField';
import { useDynamicForm } from '../hooks/useDynamicForm';

interface DynamicFormProps {
  rules: SectionRule[];
  onSubmit: (data: any) => void;
  initialData?: any;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  rules,
  onSubmit,
  initialData
}) => {
  const {
    register,
    handleSubmit,
    errors,
    visibleFields,
    requiredFields
  } = useDynamicForm(rules, initialData);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {rules.map(section => (
        <div key={section.id} className="border p-4 rounded">
          <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
          <div className="space-y-4">
            {section.fields.map(field => (
              <DynamicField
                key={field.id}
                field={field}
                register={register}
                errors={errors}
                isVisible={visibleFields.includes(field.id)}
                isRequired={requiredFields.includes(field.id)}
              />
            ))}
          </div>
        </div>
      ))}
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Submit
      </button>
    </form>
  );
};

// Example usage
const exampleRules: SectionRule[] = [
  {
    id: 'partyInfo',
    title: 'Party Information',
    fields: [
      {
        id: 'partyType',
        type: 'select',
        label: 'Party Type',
        options: [
          { value: 'individual', label: 'Individual' },
          { value: 'organization', label: 'Organization' }
        ],
        validations: [
          { type: 'required', message: 'Party type is required' }
        ]
      },
      {
        id: 'orgName',
        type: 'text',
        label: 'Organization Name',
        validations: [
          { type: 'required', message: 'Organization name is required' }
        ],
        dependencies: [
          { field: 'partyType', value: 'organization', action: 'show' }
        ]
      },
      {
        id: 'firstName',
        type: 'text',
        label: 'First Name',
        validations: [
          { type: 'required', message: 'First name is required' }
        ],
        dependencies: [
          { field: 'partyType', value: 'individual', action: 'show' }
        ]
      }
    ]
  }
];

// App.tsx
const App = () => {
  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
  };

  return (
    <div className="container mx-auto p-4">
      <DynamicForm
        rules={exampleRules}
        onSubmit={handleSubmit}
        initialData={{ partyType: 'individual' }}
      />
    </div>
  );
};
