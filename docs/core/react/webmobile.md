import React, { useState } from 'react';

// Sample schema definition for our form
const sampleSchema = {
  title: "User Profile",
  type: "object",
  properties: {
    firstName: {
      type: "string",
      title: "First Name",
      required: true
    },
    lastName: {
      type: "string",
      title: "Last Name",
      required: true
    },
    email: {
      type: "string",
      title: "Email",
      format: "email",
      required: true
    },
    age: {
      type: "number",
      title: "Age",
      minimum: 18,
      maximum: 100
    },
    userType: {
      type: "string",
      title: "User Type",
      enum: ["admin", "editor", "viewer"],
      enumNames: ["Administrator", "Editor", "Viewer"]
    },
    subscribe: {
      type: "boolean",
      title: "Subscribe to newsletter",
      default: false
    }
  }
};

// Web Form Component
const WebForm = ({ schema, onSubmit }) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    Object.entries(schema.properties).forEach(([name, config]) => {
      if (config.required && !formData[name]) {
        newErrors[name] = `${config.title} is required`;
      } else if (config.type === 'number' && formData[name]) {
        const val = Number(formData[name]);
        if (isNaN(val)) {
          newErrors[name] = `${config.title} must be a number`;
        } else if (config.minimum !== undefined && val < config.minimum) {
          newErrors[name] = `${config.title} must be at least ${config.minimum}`;
        } else if (config.maximum !== undefined && val > config.maximum) {
          newErrors[name] = `${config.title} must be at most ${config.maximum}`;
        }
      } else if (config.format === 'email' && formData[name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[name])) {
          newErrors[name] = 'Invalid email format';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const renderField = (name, config) => {
    const value = formData[name] !== undefined ? formData[name] : config.default;
    
    switch (config.type) {
      case 'string':
        if (config.enum) {
          // Select/dropdown field
          return (
            <div className="form-group" key={name}>
              <label htmlFor={name}>{config.title}</label>
              <select
                id={name}
                className="form-control"
                value={value || ''}
                onChange={(e) => handleChange(name, e.target.value)}
              >
                <option value="">Select {config.title}</option>
                {config.enum.map((option, index) => (
                  <option key={option} value={option}>
                    {config.enumNames ? config.enumNames[index] : option}
                  </option>
                ))}
              </select>
              {errors[name] && <div className="error">{errors[name]}</div>}
            </div>
          );
        }
        // Text input
        return (
          <div className="form-group" key={name}>
            <label htmlFor={name}>{config.title}</label>
            <input
              type="text"
              id={name}
              className="form-control"
              value={value || ''}
              onChange={(e) => handleChange(name, e.target.value)}
              placeholder={`Enter ${config.title.toLowerCase()}`}
            />
            {errors[name] && <div className="error">{errors[name]}</div>}
          </div>
        );
      
      case 'number':
        return (
          <div className="form-group" key={name}>
            <label htmlFor={name}>{config.title}</label>
            <input
              type="number"
              id={name}
              className="form-control"
              min={config.minimum}
              max={config.maximum}
              value={value || ''}
              onChange={(e) => handleChange(name, e.target.value)}
              placeholder={`Enter ${config.title.toLowerCase()}`}
            />
            {errors[name] && <div className="error">{errors[name]}</div>}
          </div>
        );
        
      case 'boolean':
        return (
          <div className="form-group checkbox" key={name}>
            <input
              type="checkbox"
              id={name}
              checked={!!value}
              onChange={(e) => handleChange(name, e.target.checked)}
            />
            <label htmlFor={name}>{config.title}</label>
            {errors[name] && <div className="error">{errors[name]}</div>}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="web-form">
      <h3>{schema.title}</h3>
      {Object.entries(schema.properties).map(([name, config]) => 
        renderField(name, config)
      )}
      <button type="submit" className="submit-button">Submit</button>
    </form>
  );
};

// Mobile Form Component (simulated React Native style)
const MobileForm = ({ schema, onSubmit }) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    Object.entries(schema.properties).forEach(([name, config]) => {
      if (config.required && !formData[name]) {
        newErrors[name] = `${config.title} is required`;
      } else if (config.type === 'number' && formData[name]) {
        const val = Number(formData[name]);
        if (isNaN(val)) {
          newErrors[name] = `${config.title} must be a number`;
        } else if (config.minimum !== undefined && val < config.minimum) {
          newErrors[name] = `${config.title} must be at least ${config.minimum}`;
        } else if (config.maximum !== undefined && val > config.maximum) {
          newErrors[name] = `${config.title} must be at most ${config.maximum}`;
        }
      } else if (config.format === 'email' && formData[name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[name])) {
          newErrors[name] = 'Invalid email format';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData);
    }
  };

  const renderField = (name, config) => {
    const value = formData[name] !== undefined ? formData[name] : config.default;
    
    switch (config.type) {
      case 'string':
        if (config.enum) {
          // Select/dropdown field
          return (
            <div className="mobile-field" key={name}>
              <div className="mobile-label">{config.title}</div>
              <select
                className="mobile-select"
                value={value || ''}
                onChange={(e) => handleChange(name, e.target.value)}
              >
                <option value="">Select {config.title}</option>
                {config.enum.map((option, index) => (
                  <option key={option} value={option}>
                    {config.enumNames ? config.enumNames[index] : option}
                  </option>
                ))}
              </select>
              {errors[name] && <div className="mobile-error">{errors[name]}</div>}
            </div>
          );
        }
        // Text input
        return (
          <div className="mobile-field" key={name}>
            <div className="mobile-label">{config.title}</div>
            <input
              type="text"
              className="mobile-input"
              value={value || ''}
              onChange={(e) => handleChange(name, e.target.value)}
              placeholder={`Enter ${config.title.toLowerCase()}`}
            />
            {errors[name] && <div className="mobile-error">{errors[name]}</div>}
          </div>
        );
      
      case 'number':
        return (
          <div className="mobile-field" key={name}>
            <div className="mobile-label">{config.title}</div>
            <input
              type="number"
              className="mobile-input"
              min={config.minimum}
              max={config.maximum}
              value={value || ''}
              onChange={(e) => handleChange(name, e.target.value)}
              placeholder={`Enter ${config.title.toLowerCase()}`}
            />
            {errors[name] && <div className="mobile-error">{errors[name]}</div>}
          </div>
        );
        
      case 'boolean':
        return (
          <div className="mobile-switch" key={name}>
            <div className="mobile-label">{config.title}</div>
            <label className="switch">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => handleChange(name, e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
            {errors[name] && <div className="mobile-error">{errors[name]}</div>}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="mobile-form">
      <div className="mobile-form-title">{schema.title}</div>
      {Object.entries(schema.properties).map(([name, config]) => 
        renderField(name, config)
      )}
      <button 
        className="mobile-button" 
        onClick={handleSubmit}
      >
        Submit
      </button>
    </div>
  );
};

// Phone mockup component
const PhoneFrame = ({ children }) => {
  return (
    <div className="phone-frame">
      <div className="phone-header">
        <div className="phone-notch"></div>
      </div>
      <div className="phone-content">
        {children}
      </div>
      <div className="phone-home-indicator"></div>
    </div>
  );
};

// Main component that shows both forms side by side
const SideBySideDemo = () => {
  const [webData, setWebData] = useState(null);
  const [mobileData, setMobileData] = useState(null);

  const handleWebSubmit = (data) => {
    setWebData(data);
    console.log('Web form submitted:', data);
  };

  const handleMobileSubmit = (data) => {
    setMobileData(data);
    console.log('Mobile form submitted:', data);
  };

  return (
    <div className="container">
      <h1>Schema-Driven UI Demo</h1>
      <p className="description">
        This demo shows how the same JSON schema can be rendered as UI components on both web and mobile platforms.
      </p>
      
      <div className="demo-container">
        <div className="column">
          <h2>Web UI</h2>
          <div className="web-preview">
            <WebForm 
              schema={sampleSchema} 
              onSubmit={handleWebSubmit} 
            />
          </div>
          
          {webData && (
            <div className="result-panel">
              <h3>Submitted Data (Web):</h3>
              <pre>{JSON.stringify(webData, null, 2)}</pre>
            </div>
          )}
        </div>
        
        <div className="column">
          <h2>Mobile UI</h2>
          <div className="mobile-preview">
            <PhoneFrame>
              <MobileForm 
                schema={sampleSchema} 
                onSubmit={handleMobileSubmit} 
              />
            </PhoneFrame>
          </div>
          
          {mobileData && (
            <div className="result-panel">
              <h3>Submitted Data (Mobile):</h3>
              <pre>{JSON.stringify(mobileData, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
      
      <div className="schema-panel">
        <h2>Schema Definition</h2>
        <p>Both UIs are generated from this single JSON schema:</p>
        <pre>{JSON.stringify(sampleSchema, null, 2)}</pre>
      </div>

      <div className="explanation">
        <h2>How It Works</h2>
        <p>
          This demo shows how a schema-driven UI approach allows you to define your form structure once as a JSON schema 
          and render it appropriately on different platforms. In a real implementation with React Native, you would:
        </p>
        <ul>
          <li>Use React for web UI</li>
          <li>Use React Native for mobile UI</li>
          <li>Use React Native Web to share code between platforms</li>
          <li>Use platform detection to render the appropriate components</li>
        </ul>
        <p>
          The schema serves as a single source of truth for form structure, validation rules, and data types,
          while the rendering implementation adapts to each platform's UI conventions.
        </p>
      </div>
    </div>
  );
};

// Add styles to make it look nice
const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f5f5f5',
  },
  description: {
    fontSize: '16px',
    marginBottom: '30px',
    textAlign: 'center',
  },
  demoContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: '30px',
    marginBottom: '40px',
  },
  column: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
  },
  webPreview: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  mobilePreview: {
    display: 'flex',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: '270px',
    height: '550px',
    backgroundColor: 'black',
    borderRadius: '36px',
    padding: '12px',
    position: 'relative',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
  },
  phoneHeader: {
    height: '30px',
    width: '100%',
    position: 'relative',
  },
  phoneNotch: {
    width: '130px',
    height: '28px',
    backgroundColor: 'black',
    borderBottomLeftRadius: '14px',
    borderBottomRightRadius: '14px',
    position: 'absolute',
    top: '0',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  phoneContent: {
    backgroundColor: 'white',
    height: 'calc(100% - 30px - 5px)',
    borderRadius: '24px',
    overflow: 'auto',
    padding: '15px',
  },
  phoneHomeIndicator: {
    width: '100px',
    height: '5px',
    backgroundColor: '#CCCCCC',
    borderRadius: '2.5px',
    position: 'absolute',
    bottom: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  resultPanel: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  schemaPanel: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    marginBottom: '40px',
  },
  explanation: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  // Web form styles
  webForm: {
    maxWidth: '500px',
    margin: '0 auto',
  },
  formGroup: {
    marginBottom: '15px',
  },
  formControl: {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#495057',
    backgroundColor: '#fff',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
  },
  error: {
    color: '#dc3545',
    fontSize: '12px',
    marginTop: '5px',
  },
  submitButton: {
    display: 'inline-block',
    fontWeight: '400',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    userSelect: 'none',
    border: '1px solid transparent',
    padding: '8px 16px',
    fontSize: '14px',
    lineHeight: '1.5',
    borderRadius: '4px',
    color: '#fff',
    backgroundColor: '#007bff',
    cursor: 'pointer',
  },
  // Mobile form styles
  mobileForm: {
    padding: '10px',
  },
  mobileFormTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '20px',
  },
  mobileField: {
    marginBottom: '15px',
  },
  mobileLabel: {
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '5px',
  },
  mobileInput: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ccc',
    borderRadius: '8px',
  },
  mobileSelect: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#ccc',
    borderRadius: '8px',
    backgroundColor: 'white',
  },
  mobileSwitch: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '24px',
  },
  slider: {
    position: 'absolute',
    cursor: 'pointer',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: '#ccc',
    transition: '.4s',
    borderRadius: '24px',
  },
  round: {
    borderRadius: '24px',
  },
  mobileError: {
    color: '#ff3b30',
    fontSize: '12px',
    marginTop: '3px',
  },
  mobileButton: {
    backgroundColor: '#007aff',
    color: 'white',
    padding: '12px',
    borderRadius: '20px',
    marginTop: '10px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
    width: '100%',
  }
};

export default function App() {
  return (
    <div style={styles.container}>
      <h1 style={{textAlign: 'center', marginBottom: '20px'}}>Schema-Driven UI Demo</h1>
      <p style={styles.description}>
        This demo shows how the same JSON schema can be rendered as UI components on both web and mobile platforms.
      </p>
      
      <div style={styles.demoContainer}>
        <div style={styles.column}>
          <h2 style={{textAlign: 'center', marginBottom: '15px'}}>Web UI</h2>
          <div style={styles.webPreview}>
            <WebForm 
              schema={sampleSchema} 
              onSubmit={() => {}} 
            />
          </div>
        </div>
        
        <div style={styles.column}>
          <h2 style={{textAlign: 'center', marginBottom: '15px'}}>Mobile UI</h2>
          <div style={styles.mobilePreview}>
            <div style={styles.phoneFrame}>
              <div style={styles.phoneHeader}>
                <div style={styles.phoneNotch}></div>
              </div>
              <div style={styles.phoneContent}>
                <MobileForm 
                  schema={sampleSchema} 
                  onSubmit={() => {}} 
                />
              </div>
              <div style={styles.phoneHomeIndicator}></div>
            </div>
          </div>
        </div>
      </div>
      
      <div style={styles.explanation}>
        <h2>How It Works</h2>
        <p>
          This demo shows how a schema-driven UI approach allows you to define your form structure once as a JSON schema 
          and render it appropriately on different platforms. In a real implementation with React Native, you would:
        </p>
        <ul>
          <li>Use React for web UI</li>
          <li>Use React Native for mobile UI</li>
          <li>Use React Native Web to share code between platforms</li>
          <li>Use platform detection to render the appropriate components</li>
        </ul>
        <p>
          The schema serves as a single source of truth for form structure, validation rules, and data types,
          while the rendering implementation adapts to each platform's UI conventions.
        </p>
      </div>
    </div>
  );
}