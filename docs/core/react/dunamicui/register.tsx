import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

// Define common component prop types
interface BaseComponentProps {
  fieldName: string;
  label?: string;
}

// Input field component props
interface InputProps extends BaseComponentProps {
  type: 'text' | 'number' | 'email' | 'password';
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

// Select field component props
interface SelectProps extends BaseComponentProps {
  options: Array<{value: string, label: string}>;
  multiple?: boolean;
  required?: boolean;
}

// Define a union type for all possible component props
type ComponentProps = InputProps | SelectProps;

// Define prop validation functions
const validators = {
  input: (props: any): props is InputProps => {
    const requiredProps = ['fieldName', 'type'];
    const validTypes = ['text', 'number', 'email', 'password'];
    
    // Check required props
    if (!requiredProps.every(prop => prop in props)) {
      console.error('Input component missing required props:', 
        requiredProps.filter(prop => !(prop in props)));
      return false;
    }
    
    // Validate type value
    if (!validTypes.includes(props.type)) {
      console.error(`Invalid input type: ${props.type}. Must be one of: ${validTypes.join(', ')}`);
      return false;
    }
    
    // Validate numeric constraints
    if ('minLength' in props && typeof props.minLength !== 'number') {
      console.error('minLength must be a number');
      return false;
    }
    
    if ('maxLength' in props && typeof props.maxLength !== 'number') {
      console.error('maxLength must be a number');
      return false;
    }
    
    return true;
  },
  
  select: (props: any): props is SelectProps => {
    const requiredProps = ['fieldName', 'options'];
    
    // Check required props
    if (!requiredProps.every(prop => prop in props)) {
      console.error('Select component missing required props:', 
        requiredProps.filter(prop => !(prop in props)));
      return false;
    }
    
    // Validate options array
    if (!Array.isArray(props.options)) {
      console.error('options must be an array');
      return false;
    }
    
    // Validate each option has value and label
    const validOptions = props.options.every(option => 
      typeof option === 'object' && 'value' in option && 'label' in option
    );
    
    if (!validOptions) {
      console.error('Each option must have value and label properties');
      return false;
    }
    
    return true;
  }
};

// Redux HOC from previous example
export const withRedux = (WrappedComponent, mapState = state => state) => {
  const WithReduxComponent = (props) => {
    const dispatch = useDispatch();
    const reduxState = useSelector(mapState);
    
    return (
      <WrappedComponent
        {...props}
        dispatch={dispatch}
        reduxState={reduxState}
      />
    );
  };
  
  WithReduxComponent.displayName = `WithRedux(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithReduxComponent;
};

/**
 * Enhanced Component Registry with prop validation
 */
class TypedComponentRegistry {
  private components: Map<string, React.ComponentType<any>>;
  private validators: Map<string, (props: any) => boolean>;
  private reduxStateMappers: Map<string, (state: any) => any>;
  private propTypes: Map<string, Record<string, any>>;

  constructor() {
    this.components = new Map();
    this.validators = new Map();
    this.reduxStateMappers = new Map();
    this.propTypes = new Map();
  }

  /**
   * Register a component with validation and Redux state mapping
   */
  register(
    type: string, 
    component: React.ComponentType<any>, 
    validator: (props: any) => boolean,
    propTypes: Record<string, any> = {},
    mapState = (state: any) => state.form
  ) {
    this.components.set(type, component);
    this.validators.set(type, validator);
    this.reduxStateMappers.set(type, mapState);
    this.propTypes.set(type, propTypes);
    
    console.log(`Component "${type}" registered with prop types:`, propTypes);
  }

  /**
   * Get a component by type, enhanced with Redux
   */
  get(type: string) {
    const component = this.components.get(type);
    
    if (!component) {
      console.warn(`Component type "${type}" not found in registry`);
      return null;
    }
    
    // Apply Redux enhancement if mapper exists
    if (this.reduxStateMappers.has(type)) {
      const mapState = this.reduxStateMappers.get(type);
      return withRedux(component, mapState);
    }
    
    return component;
  }

  /**
   * Validate props for a specific component type
   */
  validateProps(type: string, props: any): boolean {
    if (!this.validators.has(type)) {
      console.warn(`No validator found for component type "${type}"`);
      return true;
    }
    
    const validator = this.validators.get(type);
    return validator(props);
  }

  /**
   * Get prop types for a specific component type
   */
  getPropsSchema(type: string): Record<string, any> | null {
    return this.propTypes.get(type) || null;
  }

  /**
   * Check if a component type is registered
   */
  has(type: string): boolean {
    return this.components.has(type);
  }

  /**
   * Get all registered component types
   */
  getTypes(): string[] {
    return Array.from(this.components.keys());
  }
}

// Create a singleton instance
export const typedComponentRegistry = new TypedComponentRegistry();

/**
 * Dynamic Component Renderer with prop validation
 */
export const ValidatedDynamicComponent = ({ type, ...props }) => {
  if (!typedComponentRegistry.has(type)) {
    return <div>Component type "{type}" not found</div>;
  }
  
  // Validate props before rendering
  if (!typedComponentRegistry.validateProps(type, props)) {
    return (
      <div className="error-boundary">
        <p>Invalid props for component type "{type}"</p>
        <p>Expected props schema:</p>
        <pre>{JSON.stringify(typedComponentRegistry.getPropsSchema(type), null, 2)}</pre>
        <p>Received props:</p>
        <pre>{JSON.stringify(props, null, 2)}</pre>
      </div>
    );
  }
  
  const Component = typedComponentRegistry.get(type);
  return <Component {...props} />;
};

/**
 * Higher-order function to create a form with validated components
 */
export const createValidatedForm = (config: any) => {
  return (props: any) => {
    return (
      <div className="validated-form">
        {config.fields.map(field => (
          <ValidatedDynamicComponent
            key={field.id}
            type={field.type}
            {...field.props}
            {...props}
          />
        ))}
      </div>
    );
  };
};

/**
 * Example component implementations
 */

// Text input component implementation
const TextInput = ({ fieldName, label, type, placeholder, minLength, maxLength, dispatch, reduxState }) => {
  const handleChange = (e) => {
    dispatch({
      type: 'UPDATE_FIELD',
      payload: {
        field: fieldName,
        value: e.target.value
      }
    });
  };

  return (
    <div className="form-group">
      <label htmlFor={fieldName}>{label || fieldName}</label>
      <input
        type={type || 'text'}
        id={fieldName}
        name={fieldName}
        placeholder={placeholder}
        minLength={minLength}
        maxLength={maxLength}
        value={reduxState[fieldName] || ''}
        onChange={handleChange}
      />
    </div>
  );
};

// Select component implementation
const SelectInput = ({ fieldName, label, options, multiple, required, dispatch, reduxState }) => {
  const handleChange = (e) => {
    let value;
    
    if (multiple) {
      value = Array.from(e.target.selectedOptions, option => option.value);
    } else {
      value = e.target.value;
    }
    
    dispatch({
      type: 'UPDATE_FIELD',
      payload: {
        field: fieldName,
        value
      }
    });
  };

  return (
    <div className="form-group">
      <label htmlFor={fieldName}>{label || fieldName}</label>
      <select
        id={fieldName}
        name={fieldName}
        multiple={multiple}
        required={required}
        value={reduxState[fieldName] || (multiple ? [] : '')}
        onChange={handleChange}
      >
        {!multiple && <option value="">Select...</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Register components with validators
typedComponentRegistry.register(
  'text', 
  TextInput,
  validators.input,
  {
    fieldName: 'string (required)',
    label: 'string',
    type: "one of: 'text', 'number', 'email', 'password'",
    placeholder: 'string',
    minLength: 'number',
    maxLength: 'number'
  }
);

typedComponentRegistry.register(
  'select',
  SelectInput,
  validators.select,
  {
    fieldName: 'string (required)',
    label: 'string',
    options: 'array of {value, label} objects (required)',
    multiple: 'boolean',
    required: 'boolean'
  }
);

// Sample Redux reducer
export const formReducer = (state = {}, action) => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.payload.field]: action.payload.value
      };
    default:
      return state;
  }
};

// Example usage
export const App = () => {
  // Valid form configuration
  const validFormConfig = {
    fields: [
      {
        id: 'name-field',
        type: 'text',
        props: {
          fieldName: 'fullName',
          label: 'Full Name',
          type: 'text',
          placeholder: 'Enter your full name',
          maxLength: 100
        }
      },
      {
        id: 'country-field',
        type: 'select',
        props: {
          fieldName: 'country',
          label: 'Country',
          options: [
            { value: 'us', label: 'United States' },
            { value: 'ca', label: 'Canada' },
            { value: 'uk', label: 'United Kingdom' }
          ]
        }
      }
    ]
  };
  
  // Invalid form configuration (for demonstration)
  const invalidFormConfig = {
    fields: [
      {
        id: 'email-field',
        type: 'text',
        props: {
          // Missing required 'fieldName'
          label: 'Email',
          type: 'invalid-type', // Invalid type
        }
      }
    ]
  };
  
  // Create a form component from the valid config
  const UserForm = createValidatedForm(validFormConfig);
  
  // Create a form component from the invalid config (for demo)
  const InvalidForm = createValidatedForm(invalidFormConfig);
  
  return (
    <div>
      <h1>Validated Form Components</h1>
      <h2>Valid Form</h2>
      <UserForm />
      
      <h2>Invalid Form (Demonstrates Validation)</h2>
      <InvalidForm />
    </div>
  );
};