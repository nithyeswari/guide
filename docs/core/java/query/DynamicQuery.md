/**
 * Dynamic query generator for Google Cloud Spanner
 * 
 * This module helps build SQL queries dynamically based on input parameters
 * and handles proper parameter binding for Spanner.
 */

class SpannerQueryBuilder {
  /**
   * Creates a new SpannerQueryBuilder instance
   * 
   * @param {string} tableName - The name of the table to query
   */
  constructor(tableName) {
    this.tableName = tableName;
    this.selectFields = ['*'];
    this.whereConditions = [];
    this.orderByFields = [];
    this.limitValue = null;
    this.offsetValue = null;
    this.parameters = {};
    this.parameterCount = 0;
  }

  /**
   * Set specific fields to select
   * 
   * @param {Array<string>} fields - Array of field names to select
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  select(fields) {
    if (Array.isArray(fields) && fields.length > 0) {
      this.selectFields = fields;
    }
    return this;
  }

  /**
   * Add a where condition to the query
   * 
   * @param {string} field - Field name
   * @param {string} operator - Comparison operator (=, >, <, >=, <=, !=, LIKE, etc.)
   * @param {any} value - Value to compare against
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  where(field, operator, value) {
    const paramName = `p${this.parameterCount++}`;
    this.whereConditions.push(`${field} ${operator} @${paramName}`);
    this.parameters[paramName] = value;
    return this;
  }

  /**
   * Add an IN condition to the query
   * 
   * @param {string} field - Field name
   * @param {Array<any>} values - Array of values for the IN clause
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  whereIn(field, values) {
    if (Array.isArray(values) && values.length > 0) {
      const paramName = `p${this.parameterCount++}`;
      this.whereConditions.push(`${field} IN UNNEST(@${paramName})`);
      this.parameters[paramName] = values;
    }
    return this;
  }

  /**
   * Add a BETWEEN condition to the query
   * 
   * @param {string} field - Field name
   * @param {any} start - Start value
   * @param {any} end - End value
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  whereBetween(field, start, end) {
    const startParamName = `p${this.parameterCount++}`;
    const endParamName = `p${this.parameterCount++}`;
    this.whereConditions.push(`${field} BETWEEN @${startParamName} AND @${endParamName}`);
    this.parameters[startParamName] = start;
    this.parameters[endParamName] = end;
    return this;
  }

  /**
   * Add an IS NULL condition to the query
   * 
   * @param {string} field - Field name
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  whereNull(field) {
    this.whereConditions.push(`${field} IS NULL`);
    return this;
  }

  /**
   * Add an IS NOT NULL condition to the query
   * 
   * @param {string} field - Field name
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  whereNotNull(field) {
    this.whereConditions.push(`${field} IS NOT NULL`);
    return this;
  }

  /**
   * Add a full-text search condition
   * 
   * @param {string} field - Field name
   * @param {string} searchText - Text to search for
   * @param {boolean} exactMatch - Whether to search for exact match or partial
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  fullTextSearch(field, searchText, exactMatch = false) {
    const paramName = `p${this.parameterCount++}`;
    
    if (exactMatch) {
      // Exact match
      this.whereConditions.push(`${field} = @${paramName}`);
      this.parameters[paramName] = searchText;
    } else {
      // Partial match with LIKE
      this.whereConditions.push(`${field} LIKE @${paramName}`);
      this.parameters[paramName] = `%${searchText}%`;
    }
    return this;
  }
  
  /**
   * Add advanced search across multiple fields
   * 
   * @param {Array<string>} fields - Array of field names to search across
   * @param {string} searchText - Text to search for
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  multiFieldSearch(fields, searchText) {
    if (!Array.isArray(fields) || fields.length === 0 || !searchText) {
      return this;
    }
    
    const paramName = `p${this.parameterCount++}`;
    const searchConditions = fields.map(field => `${field} LIKE @${paramName}`).join(' OR ');
    this.whereConditions.push(`(${searchConditions})`);
    this.parameters[paramName] = `%${searchText}%`;
    return this;
  }

  /**
   * Add ORDER BY clause to the query
   * 
   * @param {string} field - Field name to order by
   * @param {string} direction - Direction ('ASC' or 'DESC'), defaults to 'ASC'
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  orderBy(field, direction = 'ASC') {
    // Validate direction
    const validDirection = ['ASC', 'DESC'].includes(direction.toUpperCase()) 
      ? direction.toUpperCase() 
      : 'ASC';
    
    this.orderByFields.push(`${field} ${validDirection}`);
    return this;
  }
  
  /**
   * Add multiple ORDER BY clauses at once
   * 
   * @param {Object} sortFields - Object with field names as keys and directions as values
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  orderByMultiple(sortFields) {
    if (typeof sortFields === 'object' && sortFields !== null) {
      Object.entries(sortFields).forEach(([field, direction]) => {
        this.orderBy(field, direction);
      });
    }
    return this;
  }
  
  /**
   * Add a NULLS FIRST or NULLS LAST modifier to the most recent ORDER BY clause
   * 
   * @param {boolean} nullsFirst - Whether NULL values should come first
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  nulls(nullsFirst = true) {
    if (this.orderByFields.length > 0) {
      const lastIndex = this.orderByFields.length - 1;
      this.orderByFields[lastIndex] += nullsFirst ? ' NULLS FIRST' : ' NULLS LAST';
    }
    return this;
  }

  /**
   * Add LIMIT clause to the query
   * 
   * @param {number} limit - Maximum number of rows to return
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  limit(limit) {
    if (typeof limit === 'number' && limit > 0) {
      this.limitValue = Math.floor(limit); // Ensure it's an integer
    }
    return this;
  }

  /**
   * Add OFFSET clause to the query
   * 
   * @param {number} offset - Number of rows to skip
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  offset(offset) {
    if (typeof offset === 'number' && offset >= 0) {
      this.offsetValue = Math.floor(offset); // Ensure it's an integer
    }
    return this;
  }
  
  /**
   * Set up pagination
   * 
   * @param {number} page - Page number (1-based)
   * @param {number} pageSize - Number of items per page
   * @returns {SpannerQueryBuilder} - Returns this instance for chaining
   */
  paginate(page, pageSize) {
    if (typeof page !== 'number' || typeof pageSize !== 'number' || page < 1 || pageSize < 1) {
      return this;
    }
    
    const offset = (page - 1) * pageSize;
    this.limit(pageSize);
    this.offset(offset);
    return this;
  }

  /**
   * Build and return the SQL query string
   * 
   * @returns {string} - The constructed SQL query
   */
  buildQuery() {
    let query = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;

    if (this.whereConditions.length > 0) {
      query += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    if (this.orderByFields.length > 0) {
      query += ` ORDER BY ${this.orderByFields.join(', ')}`;
    }

    if (this.limitValue !== null) {
      query += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== null) {
      query += ` OFFSET ${this.offsetValue}`;
    }

    return query;
  }

  /**
   * Get the query parameters object
   * 
   * @returns {Object} - The parameters object for binding
   */
  getParameters() {
    return this.parameters;
  }

  /**
   * Build and return the complete query with parameters
   * 
   * @returns {Object} - Object containing the SQL query and parameters
   */
  build() {
    return {
      sql: this.buildQuery(),
      params: this.parameters
    };
  }
}

/**
 * Helper function to create a query builder from a request object
 * 
 * @param {string} tableName - Table to query
 * @param {Object} requestObj - Object containing filter parameters
 * @returns {Object} - Object containing the SQL query and parameters
 * 
 * @example
 * // Request object format:
 * {
 *   // Fields to select (optional, defaults to *)
 *   fields: ['id', 'name', 'email'],
 *   
 *   // Filters (optional)
 *   filters: {
 *     // Simple equality
 *     status: 'active',
 *     
 *     // Complex conditions
 *     age: { gte: 21 },
 *     role: { in: ['admin', 'editor'] },
 *     name: { like: '%John%' },
 *     description: { search: 'keyword', exact: false }
 *   },
 *   
 *   // Search across multiple fields (optional)
 *   search: {
 *     fields: ['name', 'email', 'description'],
 *     term: 'searchterm'
 *   },
 *   
 *   // Sorting (optional) - Multiple formats supported
 *   sort: { 
 *     created_at: 'desc', 
 *     name: 'asc' 
 *   },
 *   // OR array format with nulls handling
 *   sort: [
 *     { field: 'created_at', direction: 'DESC', nullsFirst: false },
 *     { field: 'name', direction: 'ASC' }
 *   ],
 *   
 *   // Pagination (optional) - Multiple formats supported
 *   pagination: {
 *     // Page-based
 *     page: 2,
 *     pageSize: 10
 *     // OR offset-based
 *     // offset: 10,
 *     // limit: 10
 *   }
 *   // OR legacy format
 *   // page: 2,
 *   // pageSize: 10,
 *   // OR
 *   // limit: 10,
 *   // offset: 10
 * }
 */
function createDynamicQuery(tableName, requestObj) {
  const builder = new SpannerQueryBuilder(tableName);
  
  // Extract filters from request object
  if (requestObj) {
    // Process select fields
    if (requestObj.fields && Array.isArray(requestObj.fields) && requestObj.fields.length > 0) {
      builder.select(requestObj.fields);
    }
    
    // Process filters
    if (requestObj.filters) {
      Object.entries(requestObj.filters).forEach(([field, condition]) => {
        // Handle different condition types
        if (typeof condition === 'object') {
          // Complex condition
          if ('eq' in condition) {
            builder.where(field, '=', condition.eq);
          } else if ('ne' in condition) {
            builder.where(field, '!=', condition.ne);
          } else if ('gt' in condition) {
            builder.where(field, '>', condition.gt);
          } else if ('gte' in condition) {
            builder.where(field, '>=', condition.gte);
          } else if ('lt' in condition) {
            builder.where(field, '<', condition.lt);
          } else if ('lte' in condition) {
            builder.where(field, '<=', condition.lte);
          } else if ('in' in condition && Array.isArray(condition.in)) {
            builder.whereIn(field, condition.in);
          } else if ('between' in condition && Array.isArray(condition.between) && condition.between.length === 2) {
            builder.whereBetween(field, condition.between[0], condition.between[1]);
          } else if ('like' in condition) {
            builder.where(field, 'LIKE', condition.like);
          } else if ('search' in condition) {
            builder.fullTextSearch(field, condition.search, condition.exact === true);
          } else if (condition.isNull === true) {
            builder.whereNull(field);
          } else if (condition.isNull === false) {
            builder.whereNotNull(field);
          }
        } else {
          // Simple equality
          builder.where(field, '=', condition);
        }
      });
    }
    
    // Process multi-field search
    if (requestObj.search && typeof requestObj.search.term === 'string' && requestObj.search.term.trim() !== '') {
      if (Array.isArray(requestObj.search.fields) && requestObj.search.fields.length > 0) {
        builder.multiFieldSearch(requestObj.search.fields, requestObj.search.term);
      } else if (typeof requestObj.search.field === 'string') {
        builder.fullTextSearch(requestObj.search.field, requestObj.search.term, requestObj.search.exact === true);
      }
    }
    
    // Process sorting - enhanced to handle multiple sort fields and nulls position
    if (requestObj.sort) {
      if (Array.isArray(requestObj.sort)) {
        // Handle array format: [{ field: 'name', direction: 'asc', nullsFirst: true }]
        requestObj.sort.forEach(sortItem => {
          if (sortItem && sortItem.field) {
            builder.orderBy(sortItem.field, sortItem.direction || 'ASC');
            if (sortItem.hasOwnProperty('nullsFirst')) {
              builder.nulls(sortItem.nullsFirst);
            }
          }
        });
      } else if (typeof requestObj.sort === 'object') {
        // Handle object format: { name: 'asc', age: 'desc' }
        builder.orderByMultiple(requestObj.sort);
      }
    }
    
    // Process pagination - enhanced with page-based pagination
    if (requestObj.pagination) {
      if (requestObj.pagination.page && requestObj.pagination.pageSize) {
        // Page-based pagination
        builder.paginate(requestObj.pagination.page, requestObj.pagination.pageSize);
      } else {
        // Offset-based pagination
        if (requestObj.pagination.limit) {
          builder.limit(requestObj.pagination.limit);
        }
        if (requestObj.pagination.offset) {
          builder.offset(requestObj.pagination.offset);
        }
      }
    } else {
      // Legacy pagination support
      if (requestObj.limit && typeof requestObj.limit === 'number') {
        builder.limit(requestObj.limit);
      }
      if (requestObj.offset && typeof requestObj.offset === 'number') {
        builder.offset(requestObj.offset);
      }
      if (requestObj.page && requestObj.pageSize) {
        builder.paginate(requestObj.page, requestObj.pageSize);
      }
    }
  }
  
  return builder.build();
}

/**
 * Count the total number of matching records (without pagination)
 * Uses the same filters as the main query but returns only a count
 * 
 * @param {string} tableName - Table to query
 * @param {Object} requestObj - Object containing filter parameters
 * @param {Object} spannerDatabase - Spanner database instance
 * @returns {Promise<number>} - Promise resolving to the total count
 */
async function countMatchingRecords(tableName, requestObj, spannerDatabase) {
  // Create a copy of the request object without pagination
  const countRequest = {...requestObj};
  delete countRequest.pagination;
  delete countRequest.limit;
  delete countRequest.offset;
  delete countRequest.page;
  delete countRequest.pageSize;
  
  // Set fields to just count
  countRequest.fields = ['COUNT(1) as total_count'];
  
  // Generate the query
  const queryObj = createDynamicQuery(tableName, countRequest);
  
  // Execute the query
  const [rows] = await spannerDatabase.run({
    sql: queryObj.sql,
    params: queryObj.params
  });
  
  if (rows && rows.length > 0 && rows[0].total_count !== undefined) {
    return Number(rows[0].total_count);
  }
  
  return 0;
}

/**
 * Execute a query with pagination metadata
 * 
 * @param {string} tableName - Table to query
 * @param {Object} requestObj - Object containing filter parameters
 * @param {Object} spannerDatabase - Spanner database instance
 * @returns {Promise<Object>} - Promise resolving to results with pagination metadata
 */
async function executePagedQuery(tableName, requestObj, spannerDatabase) {
  // Get the total count
  const totalCount = await countMatchingRecords(tableName, requestObj, spannerDatabase);
  
  // Generate and execute the main query
  const queryObj = createDynamicQuery(tableName, requestObj);
  const [rows] = await spannerDatabase.run({
    sql: queryObj.sql,
    params: queryObj.params
  });
  
  // Calculate pagination metadata
  let pagination = {
    totalCount,
    hasMore: false
  };
  
  if (requestObj.pagination && requestObj.pagination.page && requestObj.pagination.pageSize) {
    const { page, pageSize } = requestObj.pagination;
    pagination = {
      ...pagination,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      hasMore: page * pageSize < totalCount
    };
  } else if (requestObj.limit) {
    const limit = requestObj.pagination?.limit || requestObj.limit;
    const offset = requestObj.pagination?.offset || requestObj.offset || 0;
    pagination = {
      ...pagination,
      limit,
      offset,
      hasMore: (offset + limit) < totalCount
    };
  }
  
  // Return the complete result
  return {
    data: rows,
    pagination,
    query: queryObj.sql // Include the query for debugging
  };
}

// Export the class and helper functions
module.exports = {
  SpannerQueryBuilder,
  createDynamicQuery,
  countMatchingRecords,
  executePagedQuery
};