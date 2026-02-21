Key Components of the Hybrid Approach

Domain Knowledge Integration

Predefined categories with seed terms (like "address" contains "street", "city", etc.)
Known field relationships (fields that typically belong together)
Field type information to improve categorization


Vector Embeddings

Represents each field as a numerical vector based on its content
Enables mathematical comparison of field similarity
Uses cosine similarity to measure how closely related fields are


Multi-stage Grouping Process

Initial categorization using domain knowledge
Embedding-based assignment for uncategorized fields
Relationship rules to ensure logically related fields stay together


Confidence Scoring

Each field assignment includes a confidence score
Categories have overall confidence ratings
Helps identify weak groupings that might need refinement



Advantages of This Hybrid Approach

Better Cold Start Performance

The system works well even with minimal data thanks to built-in domain knowledge
No need to train on large datasets before getting reasonable results


Intelligent Handling of Edge Cases

Uncommon fields are handled gracefully through similarity measures
New groupings can emerge organically when needed


Explainable Results

The grouping decisions can be traced back to specific rules or similarities
Makes it easier to understand and refine the grouping logic


Adaptive to Different Domains

The domain knowledge component can be customized for different industries
The embedding approach works across various field naming conventions
