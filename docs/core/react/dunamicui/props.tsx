import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

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
 * Component Registry with PropTypes extraction
 */
class PropTypesRegistry {
  constructor() {
    this.components = new Map();
    this.propTypes = new Map();
    this.defaultProps = new Map();
    this.reduxStateMappers = new Map();
  }

  /**
   * Register a component and extract its PropTypes
   * @param {string} type - The component type identifier
   * @param {React.ComponentType} component - The component to register
   * @param {Function} [mapState] - Optional Redux state mapper function
   */
  register(type, component, mapState = state => state.form) {
    // Store the component
    this.components.set(type, component);
    
    // Extract and store PropTypes if they exist
    if (component.propTypes) {
      this.propTypes.set(type, component.propTypes);
    }
    
    // Extract and store defaultProps if they exist
    if (component.defaultProps) {
      this.defaultProps.set(type, component.defaultProps);
    }
    
    // Store the Redux state mapper
    this.reduxStateMappers.set(type, mapState);
    
    console.log(`Component "${type}" registered with PropTypes:`, component.propTypes);
  }

  /**
   * Validate props against a component's PropTypes
   * @param {string} type - The component type
   * @param {Object} props - The props to validate
   * @returns {Object} - Validation result with errors if any
   */
  validateProps(type, props) {
    const propTypes = this.propTypes.get(type);
    
    if (!propTypes) {
      return { valid: true, errors: {} };
    }
    
    // Create a custom validation context
    const result = { valid: true, errors: {} };
    const originalConsoleError = console.error;
    
    // Override console.error to capture PropTypes validation errors
    console.error = (message) => {
      // Parse the PropType error message to extract the property name
      const propMatch = message.match(/Warning: Failed (.*) type: (.*)\n/);
      if (propMatch && propMatch.length >= 3) {
        const errorMsg = propMatch[2].trim();
        // Extract property name from the error message
        const propNameMatch = errorMsg.match(/The prop `(.+)` is marked as required/);
        if (propNameMatch && propNameMatch.length >= 2) {
          const propName = propNameMatch[1];
          result.errors[propName] = errorMsg;
          result.valid = false;
        } else {
          // For other types of errors, just store the full message
          result.errors['_general'] = result.errors['_general'] || [];
          result.errors['_general'].push(errorMsg);
          result.valid = false;
        }
      }
    };
    
    // Run validation on each prop type
    Object.keys(propTypes).forEach(propName => {
      try {
        propTypes[propName](props, propName, type, 'prop', null, 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED');
      } catch (error) {
        result.errors[propName] = error.message;
        result.valid = false;
      }
    });
    
    // Restore the original console.error
    console.error = originalConsoleError;
    
    return result;
  }

  /**
   * Get a component by type, enhanced with Redux if a state mapper exists
   * @param {string} type - The component type to retrieve
   * @returns {React.ComponentType} - The component, possibly enhanced with Redux
   */
  get(type) {
    const component = this.components.get(type);
    
    if (!component) {
      console.warn(`Component type "${type}" not found in registry`);
      return null;
    }
    
    // If we have a state mapper for this component, enhance it with Redux
    if (this.reduxStateMappers.has(type)) {
      const mapState = this.reduxStateMappers.get(type);
      return withRedux(component, mapState);
    }
    
    // Otherwise return the original component
    return component;
  }

  /**
   * Get PropTypes for a component
   * @param {string} type - The component type
   * @returns {Object} - The component's PropTypes or null
   */
  getPropTypes(type) {
    return this.propTypes.get(type) || null;
  }

  /**
   * Get formatted PropTypes documentation
   * @param {string} type - The component type
   * @returns {Object} - Human-readable PropTypes documentation
   */
  getPropTypesDoc(type) {
    const propTypes = this.propTypes.get(type);
    
    if (!propTypes) {
      return null;
    }
    
    const doc = {};
    
    Object.keys(propTypes).forEach(propName => {
      // Try to determine the prop type by checking against common PropTypes
      let propType = 'unknown';
      
      if (propTypes[propName] === PropTypes.string) {
        propType = 'string';
      } else if (propTypes[propName] === PropTypes.number) {
        propType = 'number';
      } else if (propTypes[propName] === PropTypes.bool) {
        propType = 'boolean';
      } else if (propTypes[propName] === PropTypes.array) {
        propType = 'array';
      } else if (propTypes[propName] === PropTypes.object) {
        propType = 'object';
      } else if (propTypes[propName] === PropTypes.func) {
        propType = 'function';
      } else if (propTypes[propName] === PropTypes.node) {
        propType = 'React node';
      } else if (propTypes[propName] === PropTypes.element) {
        propType = 'React element';
      } else if (propTypes[propName] === PropTypes.any) {
        propType = 'any';
      } else if (propTypes[propName].isRequired) {
        // Check if it's a required prop
        propType = this.getRequiredPropType(propTypes[propName]) + ' (required)';
      }
      
      // Include default value if available
      const defaultProps = this.defaultProps.get(type) || {};
      if (propName in defaultProps) {
        const defaultValue = defaultProps[propName];
        propType += ` (default: ${JSON.stringify(defaultValue)})`;
      }
      
      doc[propName] = propType;
    });
    
    return doc;
  }
  
  /**
   * Helper to determine the type of a required prop
   * @param {PropTypes.Validator} propType - The PropType validator
   * @returns {string} - The prop type as a string
   */
  getRequiredPropType(propType) {
    // Compare against isRequired versions of common PropTypes
    if (propType === PropTypes.string.isRequired) {
      return 'string';
    } else if (propType === PropTypes.number.isRequired) {
      return 'number';
    } else if (propType === PropTypes.bool.isRequired) {
      return 'boolean';
    } else if (propType === PropTypes.array.isRequired) {
      return 'array';
    } else if (propType === PropTypes.object.isRequired) {
      return 'object';
    } else if (propType === PropTypes.func.isRequired) {
      return 'function';
    } else if (propType === PropTypes.node.isRequired) {
      return 'React node';
    } else if (propType === PropTypes.element.isRequired) {
      return 'React element';
    } else if (propType === PropTypes.any.isRequired) {
      return 'any';
    }
    
    return 'unknown';
  }

  /**
   * Check if a component type is registered
   * @param {string} type - The component type to check
   * @returns {boolean} - Whether the component is registered
   */
  has(type) {
    return this.components.has(type);
  }

  /**
   * Get all registered component types
   * @returns {Array<string>} - Array of registered component types
   */
  getTypes() {
    return Array.from(this.components.keys());
  }
}

// Create a singleton instance
export const propTypesRegistry = new PropTypesRegistry();

/**
 * Dynamic Component Renderer that uses the registry and validates props
 */
export const PropTypesDynamicComponent = ({ type, ...props }) => {
  if (!propTypesRegistry.has(type)) {
    return <div>Component type "{type}" not found</div>;
  }
  
  // Validate props against PropTypes
  const validation = propTypesRegistry.validateProps(type, props);
  
  // If validation failed, show error
  if (!validation.valid) {
    return (
      <div className="prop-validation-error">
        <h3>PropTypes Validation Failed for "{type}" Component</h3>
        <ul>
          {Object.keys(validation.errors).map(prop => (
            <li key={prop}>
              <strong>{prop}:</strong> {validation.errors[prop]}
            </li>
          ))}
        </ul>
        <div>
          <h4>Expected PropTypes:</h4>
          <pre>{JSON.stringify(propTypesRegistry.getPropTypesDoc(type), null, 2)}</pre>
          <h4>Received Props:</h4>
          <pre>{JSON.stringify(props, null, 2)}</pre>
        </div>
      </div>
    );
  }
  
  const Component = propTypesRegistry.get(type);
  return <Component {...props} />;
};

/**
 * Example component implementations with PropTypes
 */

// Text input component with PropTypes
const TextInput = ({ fieldName, label, type, placeholder, required, disabled, dispatch, reduxState }) => {
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
      <label htmlFor={fieldName}>{label || fieldName}{required && <span className="required">*</span>}</label>
      <input
        type={type}
        id={fieldName}
        name={fieldName}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        value={reduxState[fieldName] || ''}
        onChange={handleChange}
      />
    </div>
  );
};

// Define PropTypes for the TextInput component
TextInput.propTypes = {
  fieldName: PropTypes.string.isRequired,
  label: PropTypes.string,
  type: PropTypes.oneOf(['text', 'email', 'password', 'number']),
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  dispatch: PropTypes.func,
  reduxState: PropTypes.object
};

// Define default props
TextInput.defaultProps = {
  type: 'text',
  required: false,
  disabled: false
};

// Select dropdown component with PropTypes
const SelectInput = ({ fieldName, label, options, multiple, required, disabled, dispatch, reduxState }) => {
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
      <label htmlFor={fieldName}>{label || fieldName}{required && <span className="required">*</span>}</label>
      <select
        id={fieldName}
        name={fieldName}
        multiple={multiple}
        required={required}
        disabled={disabled}
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

// Define PropTypes for the SelectInput component
SelectInput.propTypes = {
  fieldName: PropTypes.string.isRequired,
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired,
  multiple: PropTypes.bool,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  dispatch: PropTypes.func,
  reduxState: PropTypes.object
};

// Define default props
SelectInput.defaultProps = {
  multiple: false,
  required: false,
  disabled: false
};

// Register components with the registry
propTypesRegistry.register('text', TextInput);
propTypesRegistry.register('select', SelectInput);

/**
 * Higher-order function to create a form with PropTypes validation
 */
export const createPropTypesForm = (config) => {
  return (props) => {
    return (
      <div className="proptypes-form">
        {config.fields.map(field => (
          <PropTypesDynamicComponent
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

// Redux reducer for form state
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
  // Form configuration
  const formConfig = {
    fields: [
      {
        id: 'name-field',
        type: 'text',
        props: {
          fieldName: 'fullName',
          label: 'Full Name',
          required: true,
          placeholder: 'Enter your name'
        }
      },
      {
        id: 'email-field',
        type: 'text',
        props: {
          fieldName: 'email',
          label: 'Email Address',
          type: 'email',
          required: true
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
  
  // Create a form component
  const UserForm = createPropTypesForm(formConfig);
  
  // Example of intentionally invalid props (for demonstration)
  const invalidFormConfig = {
    fields: [
      {
        id: 'invalid-field',
        type: 'text',
        props: {
          // Missing required 'fieldName' prop
          label: 'Invalid Field',
          type: 'invalid-type' // Invalid type that's not in the oneOf list
        }
      }
    ]
  };
  
  const InvalidForm = createPropTypesForm(invalidFormConfig);
  
  return (
    <div>
      <h1>PropTypes-Validated Form</h1>
      <h2>Valid Form</h2>
      <UserForm />
      
      <h2>Invalid Form (Demonstrates PropTypes Validation)</h2>
      <InvalidForm />
      
      <h2>Component PropTypes Documentation</h2>
      <div className="proptypes-docs">
        {propTypesRegistry.getTypes().map(type => (
          <div key={type} className="component-docs">
            <h3>"{type}" Component Props</h3>
            <pre>{JSON.stringify(propTypesRegistry.getPropTypesDoc(type), null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};