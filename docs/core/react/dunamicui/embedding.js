// Hybrid Approach to UI Field Grouping
// Combines embedding-based clustering with domain knowledge for optimal field organization

// Sample UI fields defined in JSON
const uiFields = [
  { id: "firstName", label: "First Name", type: "text" },
  { id: "lastName", label: "Last Name", type: "text" },
  { id: "email", label: "Email Address", type: "email" },
  { id: "phone", label: "Phone Number", type: "tel" },
  { id: "streetAddress", label: "Street Address", type: "text" },
  { id: "city", label: "City", type: "text" },
  { id: "state", label: "State/Province", type: "select" },
  { id: "postalCode", label: "Postal Code", type: "text" },
  { id: "country", label: "Country", type: "select" },
  { id: "creditCardNumber", label: "Credit Card Number", type: "text" },
  { id: "expiryDate", label: "Expiry Date", type: "date" },
  { id: "cvv", label: "Security Code (CVV)", type: "text" },
  { id: "companyName", label: "Company Name", type: "text" },
  { id: "jobTitle", label: "Job Title", type: "text" },
  { id: "department", label: "Department", type: "select" }
];

// Step 1: Define domain knowledge as semantic categories with seed terms
const domainKnowledge = {
  categories: {
    'personal_info': {
      seedTerms: ['name', 'first', 'last', 'birth', 'age'],
      label: 'Personal Information',
      confidence: 0 // Will be updated during analysis
    },
    'contact': {
      seedTerms: ['email', 'phone', 'mobile', 'contact'],
      label: 'Contact Details',
      confidence: 0
    },
    'address': {
      seedTerms: ['address', 'street', 'city', 'state', 'zip', 'postal', 'country'],
      label: 'Address Information',
      confidence: 0
    },
    'payment': {
      seedTerms: ['payment', 'credit', 'card', 'cvv', 'expiry'],
      label: 'Payment Details',
      confidence: 0
    },
    'professional': {
      seedTerms: ['company', 'job', 'title', 'department', 'position'],
      label: 'Professional Information',
      confidence: 0
    }
  },
  
  // Common field relationships (fields that often appear together)
  relationships: [
    ['firstName', 'lastName'],
    ['streetAddress', 'city', 'state', 'postalCode', 'country'],
    ['creditCardNumber', 'expiryDate', 'cvv'],
    ['companyName', 'jobTitle', 'department']
  ],
  
  // Field type information for better grouping
  fieldTypes: {
    'contact': ['email', 'tel', 'url'],
    'location': ['text'], // Fields that are likely address components
    'identity': ['text'], // Fields that identify a person
    'payment': ['text', 'number', 'date'] // Payment-related fields
  }
};

// Step 2: Create vector embeddings for fields
// In a real implementation, you'd use pre-trained models
function createFieldEmbedding(field) {
  // For this example, we'll create a simple feature vector based on word presence
  // Common words that might appear in fields
  const featureWords = [
    'name', 'first', 'last', 'email', 'phone', 'address', 'street', 'city', 
    'state', 'zip', 'postal', 'country', 'card', 'credit', 'payment', 'company', 
    'job', 'professional', 'security', 'code', 'date', 'expiry'
  ];
  
  // Create a string that combines field id and label
  const fieldText = `${field.id} ${field.label}`.toLowerCase();
  
  // Generate vector: 1 if word is present, 0 if not
  return featureWords.map(word => fieldText.includes(word) ? 1 : 0);
}

// Step 3: Calculate semantic similarity between fields
function calculateSimilarity(embedding1, embedding2) {
  // Using cosine similarity
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    magnitude1 += embedding1[i] * embedding1[i];
    magnitude2 += embedding2[i] * embedding2[i];
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

// Step 4: Initial category assignment based on domain knowledge
function initialCategorization(fields) {
  const categorizedFields = {};
  const uncategorized = [];
  
  // Initialize categories
  for (const category in domainKnowledge.categories) {
    categorizedFields[category] = [];
  }
  
  // First pass: Assign fields to categories based on seed terms
  fields.forEach(field => {
    const fieldText = `${field.id} ${field.label}`.toLowerCase();
    let bestCategory = null;
    let highestScore = 0;
    
    for (const [category, info] of Object.entries(domainKnowledge.categories)) {
      let score = 0;
      
      // Check how many seed terms match
      for (const term of info.seedTerms) {
        if (fieldText.includes(term)) {
          score++;
        }
      }
      
      // Normalize by number of seed terms
      score = score / info.seedTerms.length;
      
      if (score > highestScore) {
        highestScore = score;
        bestCategory = category;
      }
    }
    
    // Only categorize if we have a reasonable match
    if (highestScore > 0.2) {
      categorizedFields[bestCategory].push({
        field,
        confidence: highestScore
      });
      
      // Update category confidence
      domainKnowledge.categories[bestCategory].confidence += highestScore;
    } else {
      uncategorized.push(field);
    }
  });
  
  // Normalize category confidence
  for (const category in domainKnowledge.categories) {
    const count = categorizedFields[category].length;
    if (count > 0) {
      domainKnowledge.categories[category].confidence /= count;
    }
  }
  
  return { categorizedFields, uncategorized };
}

// Step 5: Cluster uncategorized fields
function clusterFields(uncategorizedFields, categorizedFields) {
  if (uncategorizedFields.length === 0) return categorizedFields;
  
  // Create embeddings for uncategorized fields
  const embeddings = uncategorizedFields.map(createFieldEmbedding);
  
  // Create representative embeddings for each category
  const categoryEmbeddings = {};
  
  for (const [category, fieldsWithConfidence] of Object.entries(categorizedFields)) {
    if (fieldsWithConfidence.length > 0) {
      // Average the embeddings of fields in this category
      const categoryFields = fieldsWithConfidence.map(fc => fc.field);
      const fieldEmbeddings = categoryFields.map(createFieldEmbedding);
      
      const avgEmbedding = fieldEmbeddings[0].map((_, i) => {
        return fieldEmbeddings.reduce((sum, emb) => sum + emb[i], 0) / fieldEmbeddings.length;
      });
      
      categoryEmbeddings[category] = avgEmbedding;
    }
  }
  
  // Assign uncategorized fields to closest category
  uncategorizedFields.forEach((field, index) => {
    const embedding = embeddings[index];
    let bestCategory = null;
    let highestSimilarity = -1;
    
    for (const [category, categoryEmbedding] of Object.entries(categoryEmbeddings)) {
      const similarity = calculateSimilarity(embedding, categoryEmbedding);
      
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestCategory = category;
      }
    }
    
    // If we found a reasonably similar category, assign to it
    if (highestSimilarity > 0.3) {
      categorizedFields[bestCategory].push({
        field,
        confidence: highestSimilarity
      });
    } else {
      // Create a new category if no good match
      // This is where we'd typically use clustering to create new groups
      // For simplicity, we'll just create a miscellaneous category
      if (!categorizedFields['miscellaneous']) {
        categorizedFields['miscellaneous'] = [];
        domainKnowledge.categories['miscellaneous'] = {
          label: 'Other Information',
          confidence: 0
        };
      }
      
      categorizedFields['miscellaneous'].push({
        field,
        confidence: 1.0 // High confidence that it belongs in miscellaneous
      });
    }
  });
  
  return categorizedFields;
}

// Step 6: Apply relationship rules to refine groupings
function applyRelationshipRules(categorizedFields) {
  // Check for known field relationships and ensure they're grouped together
  for (const relationshipGroup of domainKnowledge.relationships) {
    // Find which fields from this relationship exist in our data
    const existingFieldIds = new Set();
    const fieldToCategory = {};
    
    // Collect category assignments for related fields
    for (const [category, fieldsWithConfidence] of Object.entries(categorizedFields)) {
      for (const { field } of fieldsWithConfidence) {
        if (relationshipGroup.includes(field.id)) {
          existingFieldIds.add(field.id);
          fieldToCategory[field.id] = category;
        }
      }
    }
    
    // If we found at least 2 fields from this relationship
    if (existingFieldIds.size >= 2) {
      // Count category occurrences to find dominant category
      const categoryCounts = {};
      for (const fieldId of existingFieldIds) {
        const category = fieldToCategory[fieldId];
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
      
      // Find the dominant category
      let dominantCategory = null;
      let highestCount = 0;
      
      for (const [category, count] of Object.entries(categoryCounts)) {
        if (count > highestCount) {
          highestCount = count;
          dominantCategory = category;
        }
      }
      
      // Move all fields to the dominant category if not already there
      for (const [category, fieldsWithConfidence] of Object.entries(categorizedFields)) {
        if (category !== dominantCategory) {
          const fieldsToMove = [];
          const fieldsToKeep = [];
          
          for (const fieldWithConfidence of fieldsWithConfidence) {
            if (relationshipGroup.includes(fieldWithConfidence.field.id)) {
              fieldsToMove.push(fieldWithConfidence);
            } else {
              fieldsToKeep.push(fieldWithConfidence);
            }
          }
          
          // Update categories
          categorizedFields[category] = fieldsToKeep;
          categorizedFields[dominantCategory] = [
            ...categorizedFields[dominantCategory],
            ...fieldsToMove
          ];
        }
      }
    }
  }
  
  return categorizedFields;
}

// Step 7: Format the final output
function formatGroupedFields(categorizedFields) {
  return Object.entries(categorizedFields).map(([category, fieldsWithConfidence]) => {
    // Skip empty categories
    if (fieldsWithConfidence.length === 0) return null;
    
    return {
      groupId: category,
      groupLabel: domainKnowledge.categories[category]?.label || `Group ${category}`,
      // Extract just the fields without confidence scores
      fields: fieldsWithConfidence.map(fc => fc.field)
    };
  }).filter(Boolean); // Remove null entries
}

// Main function: Hybrid field grouping process
function hybridFieldGrouping(fields) {
  // Step 1: Initial categorization using domain knowledge
  const { categorizedFields, uncategorized } = initialCategorization(fields);
  
  // Step 2: Cluster remaining fields based on semantic similarity
  const enhancedCategories = clusterFields(uncategorized, categorizedFields);
  
  // Step 3: Apply relationship rules to refine groupings
  const refinedCategories = applyRelationshipRules(enhancedCategories);
  
  // Step 4: Format the final output
  return formatGroupedFields(refinedCategories);
}

// Execute the hybrid grouping algorithm
const groupedFields = hybridFieldGrouping(uiFields);
console.log(JSON.stringify(groupedFields, null, 2));

// In a production system, you would:
// 1. Use pre-trained language models like BERT for better embeddings
// 2. Implement a feedback loop to learn from user adjustments
// 3. Apply hierarchical clustering for multi-level organization
// 4. Use historical data on how fields have been grouped in the past
// 5. Consider field dependencies and conditional visibility relationships
