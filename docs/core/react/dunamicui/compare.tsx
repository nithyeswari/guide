// Yup Approach - Validation Only
import React, { useState } from 'react';
import * as yup from 'yup';

const YupForm = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  
  const validate = () => {
    try {
      yup.string().email().required().validateSync(email);
      alert('Valid!');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <button onClick={validate}>Submit</button>
      {error && <p>{error}</p>}
    </div>
  );
};

// JSON Schema Approach - UI Generated
import { JsonForms } from '@jsonforms/react';
import { materialRenderers } from '@jsonforms/material-renderers';

const JsonSchemaForm = () => {
  const schema = {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        format: 'email'
      }
    }
  };

  return (
    <JsonForms
      schema={schema}
      data={{}}
      renderers={materialRenderers}
      onChange={({ data }) => console.log(data)}
    />
  );
};