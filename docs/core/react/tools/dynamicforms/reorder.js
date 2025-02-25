import React, { useState, useEffect } from 'react';

const FormBuilder = () => {
  // Form state
  const [elements, setElements] = useState([]);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  
  // Sample JSON with systemName property
  const sampleJson = JSON.stringify([
    { id: "field1", type: "text", label: "First Name", systemName: "firstName" },
    { id: "field2", type: "text", label: "Last Name", systemName: "lastName" },
    { id: "field3", type: "email", label: "Email Address", systemName: "emailAddress" },
    { id: "field4", type: "tel", label: "Phone Number", systemName: "phoneNumber" },
    { id: "field5", type: "select", label: "Country", systemName: "country" }
  ], null, 2);

  // Load sample data on start
  useEffect(() => {
    setJsonInput(sampleJson);
  }, []);
  
  // Generate ID
  const generateId = () => `field-${Math.random().toString(36).substr(2, 9)}`;
  
  // Convert label to systemName (camelCase)
  const labelToSystemName = (label) => {
    return label
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[A-Z]/, c => c.toLowerCase());
  };
  
  // Load from JSON
  const loadFromJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      
      // Ensure all elements have systemName
      const parsedWithSystemNames = parsed.map(item => {
        if (!item.systemName) {
          return {
            ...item,
            systemName: labelToSystemName(item.label)
          };
        }
        return item;
      });
      
      setElements(parsedWithSystemNames);
    } catch (e) {
      alert("Invalid JSON format");
    }
  };
  
  // Export to JSON
  const exportJson = () => {
    const json = JSON.stringify(elements, null, 2);
    setJsonOutput(json);
  };
  
  // Add a group
  const addGroup = () => {
    const groupName = "New Group";
    setElements([
      ...elements, 
      {
        id: generateId(),
        type: "group",
        label: groupName,
        systemName: labelToSystemName(groupName),
        fields: []
      }
    ]);
  };
  
  // Move field into group
  const moveIntoGroup = (fieldId, groupId) => {
    const newElements = [...elements];
    
    // Find the field
    let fieldToMove = null;
    let fieldIndex = -1;
    
    // Look for field in main list
    for (let i = 0; i < newElements.length; i++) {
      if (newElements[i].id === fieldId) {
        fieldToMove = {...newElements[i]};
        fieldIndex = i;
        break;
      }
    }
    
    // If not found in main list, look in groups
    if (!fieldToMove) {
      for (let i = 0; i < newElements.length; i++) {
        if (newElements[i].type === 'group' && newElements[i].fields) {
          for (let j = 0; j < newElements[i].fields.length; j++) {
            if (newElements[i].fields[j].id === fieldId) {
              fieldToMove = {...newElements[i].fields[j]};
              // Remove from current group
              const updatedFields = [...newElements[i].fields];
              updatedFields.splice(j, 1);
              newElements[i] = {
                ...newElements[i],
                fields: updatedFields
              };
              break;
            }
          }
          if (fieldToMove) break;
        }
      }
    } else {
      // Remove from main list
      newElements.splice(fieldIndex, 1);
    }
    
    if (!fieldToMove) return; // Field not found
    
    // Add to target group
    for (let i = 0; i < newElements.length; i++) {
      if (newElements[i].id === groupId) {
        newElements[i] = {
          ...newElements[i],
          fields: [...newElements[i].fields, fieldToMove]
        };
        break;
      }
    }
    
    setElements(newElements);
  };
  
  // Move field out of group
  const moveOutOfGroup = (fieldId, groupId) => {
    const newElements = [...elements];
    
    // Find the group and field
    let fieldToMove = null;
    let groupIndex = -1;
    
    for (let i = 0; i < newElements.length; i++) {
      if (newElements[i].id === groupId) {
        groupIndex = i;
        for (let j = 0; j < newElements[i].fields.length; j++) {
          if (newElements[i].fields[j].id === fieldId) {
            fieldToMove = {...newElements[i].fields[j]};
            
            // Remove from group
            const updatedFields = [...newElements[i].fields];
            updatedFields.splice(j, 1);
            newElements[i] = {
              ...newElements[i],
              fields: updatedFields
            };
            break;
          }
        }
        break;
      }
    }
    
    if (!fieldToMove || groupIndex === -1) return; // Field or group not found
    
    // Add to main list after the group
    newElements.splice(groupIndex + 1, 0, fieldToMove);
    
    setElements(newElements);
  };
  
  // Delete element (field or group)
  const deleteElement = (id) => {
    const newElements = elements.filter(el => el.id !== id);
    setElements(newElements);
  };
  
  // Delete field from group
  const deleteGroupField = (fieldId, groupId) => {
    const newElements = [...elements];
    
    for (let i = 0; i < newElements.length; i++) {
      if (newElements[i].id === groupId) {
        newElements[i] = {
          ...newElements[i],
          fields: newElements[i].fields.filter(field => field.id !== fieldId)
        };
        break;
      }
    }
    
    setElements(newElements);
  };
  
  // Update label and systemName
  const updateLabel = (id, newLabel) => {
    const newElements = elements.map(el => 
      el.id === id ? {
        ...el, 
        label: newLabel,
        systemName: labelToSystemName(newLabel)
      } : el
    );
    setElements(newElements);
  };
  
  // Update systemName directly
  const updateSystemName = (id, newSystemName) => {
    const newElements = elements.map(el => 
      el.id === id ? {...el, systemName: newSystemName} : el
    );
    setElements(newElements);
  };
  
  // Update group field label
  const updateGroupFieldLabel = (fieldId, groupId, newLabel) => {
    const newElements = [...elements];
    
    for (let i = 0; i < newElements.length; i++) {
      if (newElements[i].id === groupId) {
        newElements[i] = {
          ...newElements[i],
          fields: newElements[i].fields.map(field => 
            field.id === fieldId ? {
              ...field, 
              label: newLabel,
              systemName: labelToSystemName(newLabel)
            } : field
          )
        };
        break;
      }
    }
    
    setElements(newElements);
  };
  
  // Update group field systemName
  const updateGroupFieldSystemName = (fieldId, groupId, newSystemName) => {
    const newElements = [...elements];
    
    for (let i = 0; i < newElements.length; i++) {
      if (newElements[i].id === groupId) {
        newElements[i] = {
          ...newElements[i],
          fields: newElements[i].fields.map(field => 
            field.id === fieldId ? {...field, systemName: newSystemName} : field
          )
        };
        break;
      }
    }
    
    setElements(newElements);
  };
  
  // Render the form elements
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Form Builder with systemName</h1>
      
      <div className="flex space-x-4 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Input JSON</label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full h-32 p-2 border rounded font-mono text-sm"
          ></textarea>
          <div className="mt-2">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={loadFromJson}
            >
              Load Fields
            </button>
          </div>
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Output JSON</label>
          <textarea
            value={jsonOutput}
            readOnly
            className="w-full h-32 p-2 border rounded font-mono text-sm bg-gray-50"
          ></textarea>
          <div className="mt-2">
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={exportJson}
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>
      
      <div className="border-t border-b py-4 mb-4">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold">Form Fields</h2>
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
            onClick={addGroup}
          >
            + Add Group
          </button>
        </div>
        
        <div className="min-h-64 border-2 border-dashed border-gray-300 rounded-lg p-4">
          {elements.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              Load JSON to see form fields
            </div>
          ) : (
            <div className="space-y-3">
              {elements.map((element) => (
                <div
                  key={element.id}
                  className={`rounded ${element.type === 'group' 
                    ? 'border-2 border-blue-300 bg-blue-50 p-4' 
                    : 'border border-gray-300 bg-white p-3'}`}
                >
                  {element.type === 'group' ? (
                    <div>
                      <div className="flex flex-col mb-3 pb-2 border-b border-blue-200">
                        <div className="flex justify-between items-center mb-2">
                          <input
                            type="text"
                            value={element.label}
                            onChange={(e) => updateLabel(element.id, e.target.value)}
                            className="bg-transparent font-semibold outline-none"
                          />
                          <div>
                            <button 
                              className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
                              onClick={() => deleteElement(element.id)}
                            >
                              Delete Group
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <span className="mr-1">systemName:</span>
                          <input
                            type="text"
                            value={element.systemName}
                            onChange={(e) => updateSystemName(element.id, e.target.value)}
                            className="bg-transparent outline-none border-b border-gray-300 flex-grow"
                          />
                        </div>
                      </div>
                      
                      {/* Group fields */}
                      <div className="space-y-2">
                        {element.fields && element.fields.length > 0 ? (
                          element.fields.map((field) => (
                            <div
                              key={field.id}
                              className="p-3 bg-white border border-gray-200 rounded"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center">
                                  <span className="bg-gray-100 px-2 py-1 rounded text-xs mr-2">{field.type}</span>
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => updateGroupFieldLabel(field.id, element.id, e.target.value)}
                                    className="outline-none"
                                  />
                                </div>
                                <div>
                                  <button
                                    className="text-blue-500 hover:text-blue-700 text-sm mr-2 px-2 py-1"
                                    onClick={() => moveOutOfGroup(field.id, element.id)}
                                  >
                                    Move Out
                                  </button>
                                  <button
                                    className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
                                    onClick={() => deleteGroupField(field.id, element.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 flex items-center">
                                <span className="mr-1">systemName:</span>
                                <input
                                  type="text"
                                  value={field.systemName}
                                  onChange={(e) => updateGroupFieldSystemName(field.id, element.id, e.target.value)}
                                  className="bg-transparent outline-none border-b border-gray-300 flex-grow"
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-400 py-4 border-2 border-dashed border-gray-300 rounded">
                            No fields in this group
                          </div>
                        )}
                      </div>
                      
                      {/* Field selection for this group */}
                      <div className="mt-4 pt-3 border-t border-blue-200">
                        <div className="text-sm font-medium mb-2">Add field to this group:</div>
                        <div className="flex flex-wrap gap-2">
                          {elements.map(el => 
                            el.type !== 'group' && (
                              <button
                                key={el.id}
                                className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-sm"
                                onClick={() => moveIntoGroup(el.id, element.id)}
                              >
                                {el.label}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs mr-2">{element.type}</span>
                          <input
                            type="text"
                            value={element.label}
                            onChange={(e) => updateLabel(element.id, e.target.value)}
                            className="outline-none"
                          />
                        </div>
                        <div className="flex">
                          <div className="mr-2">
                            <select 
                              className="text-sm border rounded px-2 py-1"
                              onChange={(e) => {
                                if (e.target.value) {
                                  moveIntoGroup(element.id, e.target.value);
                                  e.target.value = ''; // Reset select
                                }
                              }}
                              value=""
                            >
                              <option value="">Move to group...</option>
                              {elements.filter(el => el.type === 'group').map(group => (
                                <option key={group.id} value={group.id}>{group.label}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            className="text-red-500 hover:text-red-700 px-2 py-1 text-sm"
                            onClick={() => deleteElement(element.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <span className="mr-1">systemName:</span>
                        <input
                          type="text"
                          value={element.systemName}
                          onChange={(e) => updateSystemName(element.id, e.target.value)}
                          className="bg-transparent outline-none border-b border-gray-300 flex-grow"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        <p>
          <strong>Instructions:</strong> Load fields from JSON, then use the "Move to group" dropdown 
          or buttons below each group to organize fields. Each field has a label (display name) and 
          systemName (for programmatic reference). The systemName is auto-generated from the label
          in camelCase format, but you can edit it directly.
        </p>
      </div>
    </div>
  );
};

export default FormBuilder;
