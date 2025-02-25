package com.example.spanner.query;

import com.google.cloud.spanner.Statement;
import com.google.cloud.spanner.Statement.Builder;
import org.springframework.cloud.gcp.data.spanner.core.SpannerTemplate;
import org.springframework.cloud.gcp.data.spanner.core.mapping.SpannerMappingContext;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Dynamic query builder for Google Cloud Spanner with Spring Boot integration.
 *
 * @param <T> The entity type for the mapped results
 */
public class SpannerQueryBuilder<T> {

    private final String tableName;
    private final Class<T> entityClass;
    private final List<String> selectFields = new ArrayList<>();
    private final List<String> whereConditions = new ArrayList<>();
    private final List<String> orderByFields = new ArrayList<>();
    private Integer limitValue = null;
    private Integer offsetValue = null;
    private final Map<String, Object> parameters = new HashMap<>();
    private final AtomicInteger parameterCount = new AtomicInteger(0);

    /**
     * Creates a new SpannerQueryBuilder instance
     *
     * @param tableName   The name of the table to query
     * @param entityClass The entity class for mapping results
     */
    public SpannerQueryBuilder(String tableName, Class<T> entityClass) {
        this.tableName = tableName;
        this.entityClass = entityClass;
        this.selectFields.add("*");
    }

    /**
     * Set specific fields to select
     *
     * @param fields Array of field names to select
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> select(String... fields) {
        if (fields != null && fields.length > 0) {
            this.selectFields.clear();
            Collections.addAll(this.selectFields, fields);
        }
        return this;
    }

    /**
     * Add a where condition to the query
     *
     * @param field    Field name
     * @param operator Comparison operator (=, >, <, >=, <=, !=, LIKE, etc.)
     * @param value    Value to compare against
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> where(String field, String operator, Object value) {
        String paramName = "p" + parameterCount.getAndIncrement();
        this.whereConditions.add(field + " " + operator + " @" + paramName);
        this.parameters.put(paramName, value);
        return this;
    }

    /**
     * Add an equality condition to the query
     *
     * @param field Field name
     * @param value Value to compare against
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> whereEquals(String field, Object value) {
        return where(field, "=", value);
    }

    /**
     * Add an IN condition to the query
     *
     * @param field  Field name
     * @param values Array of values for the IN clause
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> whereIn(String field, List<?> values) {
        if (values != null && !values.isEmpty()) {
            String paramName = "p" + parameterCount.getAndIncrement();
            this.whereConditions.add(field + " IN UNNEST(@" + paramName + ")");
            this.parameters.put(paramName, values);
        }
        return this;
    }

    /**
     * Add a BETWEEN condition to the query
     *
     * @param field Field name
     * @param start Start value
     * @param end   End value
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> whereBetween(String field, Object start, Object end) {
        String startParamName = "p" + parameterCount.getAndIncrement();
        String endParamName = "p" + parameterCount.getAndIncrement();
        this.whereConditions.add(field + " BETWEEN @" + startParamName + " AND @" + endParamName);
        this.parameters.put(startParamName, start);
        this.parameters.put(endParamName, end);
        return this;
    }

    /**
     * Add an IS NULL condition to the query
     *
     * @param field Field name
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> whereNull(String field) {
        this.whereConditions.add(field + " IS NULL");
        return this;
    }

    /**
     * Add an IS NOT NULL condition to the query
     *
     * @param field Field name
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> whereNotNull(String field) {
        this.whereConditions.add(field + " IS NOT NULL");
        return this;
    }

    /**
     * Add a text search condition
     *
     * @param field      Field name
     * @param searchText Text to search for
     * @param exactMatch Whether to search for exact match or partial
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> textSearch(String field, String searchText, boolean exactMatch) {
        if (StringUtils.hasText(searchText)) {
            String paramName = "p" + parameterCount.getAndIncrement();

            if (exactMatch) {
                this.whereConditions.add(field + " = @" + paramName);
                this.parameters.put(paramName, searchText);
            } else {
                this.whereConditions.add(field + " LIKE @" + paramName);
                this.parameters.put(paramName, "%" + searchText + "%");
            }
        }
        return this;
    }

    /**
     * Add a search across multiple fields
     *
     * @param fields     Array of field names to search across
     * @param searchText Text to search for
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> multiFieldSearch(String[] fields, String searchText) {
        if (fields != null && fields.length > 0 && StringUtils.hasText(searchText)) {
            String paramName = "p" + parameterCount.getAndIncrement();
            String searchValue = "%" + searchText + "%";

            List<String> conditions = Arrays.stream(fields)
                    .map(field -> field + " LIKE @" + paramName)
                    .collect(Collectors.toList());

            String searchCondition = "(" + String.join(" OR ", conditions) + ")";
            this.whereConditions.add(searchCondition);
            this.parameters.put(paramName, searchValue);
        }
        return this;
    }

    /**
     * Add ORDER BY clause to the query
     *
     * @param field     Field name to order by
     * @param direction Direction ('ASC' or 'DESC'), defaults to 'ASC'
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> orderBy(String field, String direction) {
        String dir = "ASC";
        if (direction != null && direction.equalsIgnoreCase("DESC")) {
            dir = "DESC";
        }
        this.orderByFields.add(field + " " + dir);
        return this;
    }

    /**
     * Add ORDER BY ASC clause to the query
     *
     * @param field Field name to order by ascending
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> orderByAsc(String field) {
        return orderBy(field, "ASC");
    }

    /**
     * Add ORDER BY DESC clause to the query
     *
     * @param field Field name to order by descending
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> orderByDesc(String field) {
        return orderBy(field, "DESC");
    }

    /**
     * Add multiple ORDER BY clauses based on a map
     *
     * @param sortFields Map with field names as keys and directions as values
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> orderByMultiple(Map<String, String> sortFields) {
        if (sortFields != null && !sortFields.isEmpty()) {
            sortFields.forEach(this::orderBy);
        }
        return this;
    }

    /**
     * Add LIMIT clause to the query
     *
     * @param limit Maximum number of rows to return
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> limit(int limit) {
        if (limit > 0) {
            this.limitValue = limit;
        }
        return this;
    }

    /**
     * Add OFFSET clause to the query
     *
     * @param offset Number of rows to skip
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> offset(int offset) {
        if (offset >= 0) {
            this.offsetValue = offset;
        }
        return this;
    }

    /**
     * Set up pagination
     *
     * @param page     Page number (1-based)
     * @param pageSize Number of items per page
     * @return Returns this instance for chaining
     */
    public SpannerQueryBuilder<T> paginate(int page, int pageSize) {
        if (page > 0 && pageSize > 0) {
            int offset = (page - 1) * pageSize;
            return this.limit(pageSize).offset(offset);
        }
        return this;
    }

    /**
     * Build the SQL query string
     *
     * @return The SQL query string
     */
    public String buildSql() {
        StringBuilder sql = new StringBuilder("SELECT ");
        sql.append(String.join(", ", this.selectFields));
        sql.append(" FROM ").append(this.tableName);

        if (!this.whereConditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", this.whereConditions));
        }

        if (!this.orderByFields.isEmpty()) {
            sql.append(" ORDER BY ").append(String.join(", ", this.orderByFields));
        }

        if (this.limitValue != null) {
            sql.append(" LIMIT ").append(this.limitValue);
        }

        if (this.offsetValue != null) {
            sql.append(" OFFSET ").append(this.offsetValue);
        }

        return sql.toString();
    }

    /**
     * Build a Spanner Statement with named parameters
     *
     * @return Spanner Statement object
     */
    public Statement buildStatement() {
        String sql = buildSql();
        Builder statementBuilder = Statement.newBuilder(sql);

        this.parameters.forEach(statementBuilder::bind);

        return statementBuilder.build();
    }

    /**
     * Execute the query and return results as a list of entities
     *
     * @param spannerTemplate Spring Data Spanner template
     * @return List of entity objects
     */
    public List<T> executeQuery(SpannerTemplate spannerTemplate) {
        Statement statement = buildStatement();
        return spannerTemplate.query(this.entityClass, statement);
    }

    /**
     * Execute a count query to get the total number of matching rows
     *
     * @param spannerTemplate Spring Data Spanner template
     * @return The total count
     */
    public long count(SpannerTemplate spannerTemplate) {
        // Save and restore pagination settings
        Integer savedLimit = this.limitValue;
        Integer savedOffset = this.offsetValue;
        List<String> savedSelectFields = new ArrayList<>(this.selectFields);

        // Clear pagination and set count
        this.limitValue = null;
        this.offsetValue = null;
        this.selectFields.clear();
        this.selectFields.add("COUNT(1) as count");

        // Execute count query
        Statement statement = buildStatement();
        Long result = spannerTemplate.query(Long.class, statement, row -> row.getLong("count")).stream()
                .findFirst().orElse(0L);

        // Restore original settings
        this.limitValue = savedLimit;
        this.offsetValue = savedOffset;
        this.selectFields.clear();
        this.selectFields.addAll(savedSelectFields);

        return result;
    }

    /**
     * Execute the query with pagination metadata
     *
     * @param spannerTemplate Spring Data Spanner template
     * @return PagedResult containing data and pagination information
     */
    public PagedResult<T> executePagedQuery(SpannerTemplate spannerTemplate) {
        long totalCount = count(spannerTemplate);
        List<T> data = executeQuery(spannerTemplate);

        PagedResult<T> result = new PagedResult<>();
        result.setData(data);
        result.setTotalCount(totalCount);

        if (this.limitValue != null) {
            result.setLimit(this.limitValue);
            if (this.offsetValue != null) {
                result.setOffset(this.offsetValue);
                
                // Calculate page information if appropriate
                int pageSize = this.limitValue;
                if (pageSize > 0) {
                    int currentPage = (this.offsetValue / pageSize) + 1;
                    int totalPages = (int) Math.ceil((double) totalCount / pageSize);
                    
                    result.setCurrentPage(currentPage);
                    result.setPageSize(pageSize);
                    result.setTotalPages(totalPages);
                }
            }

            result.setHasMore((this.offsetValue != null ? this.offsetValue : 0) + data.size() < totalCount);
        }

        return result;
    }
}

/**
 * Result object that includes pagination metadata
 *
 * @param <T> The entity type
 */
class PagedResult<T> {
    private List<T> data;
    private long totalCount;
    private Integer currentPage;
    private Integer pageSize;
    private Integer totalPages;
    private Integer limit;
    private Integer offset;
    private boolean hasMore;

    // Getters and setters
    public List<T> getData() {
        return data;
    }

    public void setData(List<T> data) {
        this.data = data;
    }

    public long getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(long totalCount) {
        this.totalCount = totalCount;
    }

    public Integer getCurrentPage() {
        return currentPage;
    }

    public void setCurrentPage(Integer currentPage) {
        this.currentPage = currentPage;
    }

    public Integer getPageSize() {
        return pageSize;
    }

    public void setPageSize(Integer pageSize) {
        this.pageSize = pageSize;
    }

    public Integer getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(Integer totalPages) {
        this.totalPages = totalPages;
    }

    public Integer getLimit() {
        return limit;
    }

    public void setLimit(Integer limit) {
        this.limit = limit;
    }

    public Integer getOffset() {
        return offset;
    }

    public void setOffset(Integer offset) {
        this.offset = offset;
    }

    public boolean isHasMore() {
        return hasMore;
    }

    public void setHasMore(boolean hasMore) {
        this.hasMore = hasMore;
    }
}

/**
 * Factory for creating query builders with standardized request parameters
 */
@Component
public class SpannerQueryService {

    private final SpannerTemplate spannerTemplate;
    private final SpannerMappingContext mappingContext;

    public SpannerQueryService(SpannerTemplate spannerTemplate, SpannerMappingContext mappingContext) {
        this.spannerTemplate = spannerTemplate;
        this.mappingContext = mappingContext;
    }

    /**
     * Create a query builder for an entity
     *
     * @param entityClass The entity class
     * @param <T>         The entity type
     * @return A query builder for the entity
     */
    public <T> SpannerQueryBuilder<T> createQueryBuilder(Class<T> entityClass) {
        String tableName = mappingContext.getPersistentEntity(entityClass).tableName();
        return new SpannerQueryBuilder<>(tableName, entityClass);
    }

    /**
     * Create a query builder from a QueryRequest object
     *
     * @param entityClass  The entity class
     * @param queryRequest The query request parameters
     * @param <T>          The entity type
     * @return A query builder configured according to the request
     */
    public <T> SpannerQueryBuilder<T> createFromRequest(Class<T> entityClass, QueryRequest queryRequest) {
        SpannerQueryBuilder<T> builder = createQueryBuilder(entityClass);

        if (queryRequest != null) {
            // Apply select fields
            if (queryRequest.getFields() != null && !queryRequest.getFields().isEmpty()) {
                builder.select(queryRequest.getFields().toArray(new String[0]));
            }

            // Apply filters
            if (queryRequest.getFilters() != null) {
                applyFilters(builder, queryRequest.getFilters());
            }

            // Apply search
            if (queryRequest.getSearch() != null && StringUtils.hasText(queryRequest.getSearch().getTerm())) {
                SearchCriteria search = queryRequest.getSearch();
                if (search.getFields() != null && !search.getFields().isEmpty()) {
                    builder.multiFieldSearch(search.getFields().toArray(new String[0]), search.getTerm());
                } else if (StringUtils.hasText(search.getField())) {
                    builder.textSearch(search.getField(), search.getTerm(), search.isExact());
                }
            }

            // Apply sorting
            if (queryRequest.getSort() != null) {
                applySort(builder, queryRequest.getSort());
            }

            // Apply pagination
            if (queryRequest.getPagination() != null) {
                PaginationCriteria pagination = queryRequest.getPagination();
                if (pagination.getPage() != null && pagination.getPageSize() != null) {
                    builder.paginate(pagination.getPage(), pagination.getPageSize());
                } else {
                    if (pagination.getLimit() != null) {
                        builder.limit(pagination.getLimit());
                    }
                    if (pagination.getOffset() != null) {
                        builder.offset(pagination.getOffset());
                    }
                }
            }
        }

        return builder;
    }

    /**
     * Execute a query based on request parameters
     *
     * @param entityClass  The entity class
     * @param queryRequest The query request parameters
     * @param <T>          The entity type
     * @return A paged result with the matching entities
     */
    public <T> PagedResult<T> executeQuery(Class<T> entityClass, QueryRequest queryRequest) {
        SpannerQueryBuilder<T> builder = createFromRequest(entityClass, queryRequest);
        return builder.executePagedQuery(spannerTemplate);
    }

    /**
     * Apply filters from a filter map to a query builder
     *
     * @param builder The query builder
     * @param filters The filter criteria map
     * @param <T>     The entity type
     */
    private <T> void applyFilters(SpannerQueryBuilder<T> builder, Map<String, Object> filters) {
        filters.forEach((field, condition) -> {
            if (condition instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> complexCondition = (Map<String, Object>) condition;
                applyComplexFilter(builder, field, complexCondition);
            } else {
                // Simple equality
                builder.whereEquals(field, condition);
            }
        });
    }

    /**
     * Apply a complex filter condition
     *
     * @param builder          The query builder
     * @param field            The field name
     * @param complexCondition The complex condition map
     * @param <T>              The entity type
     */
    private <T> void applyComplexFilter(SpannerQueryBuilder<T> builder, String field, Map<String, Object> complexCondition) {
        if (complexCondition.containsKey("eq")) {
            builder.where(field, "=", complexCondition.get("eq"));
        } else if (complexCondition.containsKey("ne")) {
            builder.where(field, "!=", complexCondition.get("ne"));
        } else if (complexCondition.containsKey("gt")) {
            builder.where(field, ">", complexCondition.get("gt"));
        } else if (complexCondition.containsKey("gte")) {
            builder.where(field, ">=", complexCondition.get("gte"));
        } else if (complexCondition.containsKey("lt")) {
            builder.where(field, "<", complexCondition.get("lt"));
        } else if (complexCondition.containsKey("lte")) {
            builder.where(field, "<=", complexCondition.get("lte"));
        } else if (complexCondition.containsKey("in")) {
            Object inValues = complexCondition.get("in");
            if (inValues instanceof List) {
                @SuppressWarnings("unchecked")
                List<Object> valuesList = (List<Object>) inValues;
                builder.whereIn(field, valuesList);
            }
        } else if (complexCondition.containsKey("between")) {
            Object betweenValues = complexCondition.get("between");
            if (betweenValues instanceof List && ((List<?>) betweenValues).size() == 2) {
                @SuppressWarnings("unchecked")
                List<Object> valuesList = (List<Object>) betweenValues;
                builder.whereBetween(field, valuesList.get(0), valuesList.get(1));
            }
        } else if (complexCondition.containsKey("like")) {
            String likeValue = complexCondition.get("like").toString();
            builder.where(field, "LIKE", likeValue);
        } else if (complexCondition.containsKey("search")) {
            String searchValue = complexCondition.get("search").toString();
            boolean exact = complexCondition.get("exact") != null && 
                            Boolean.TRUE.equals(complexCondition.get("exact"));
            builder.textSearch(field, searchValue, exact);
        } else if (complexCondition.containsKey("isNull")) {
            Boolean isNull = (Boolean) complexCondition.get("isNull");
            if (Boolean.TRUE.equals(isNull)) {
                builder.whereNull(field);
            } else {
                builder.whereNotNull(field);
            }
        }
    }

    /**
     * Apply sorting criteria to a query builder
     *
     * @param builder The query builder
     * @param sort    The sort criteria
     * @param <T>     The entity type
     */
    private <T> void applySort(SpannerQueryBuilder<T> builder, Object sort) {
        if (sort instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, String> sortMap = (Map<String, String>) sort;
            builder.orderByMultiple(sortMap);
        } else if (sort instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> sortList = (List<Map<String, Object>>) sort;
            for (Map<String, Object> sortItem : sortList) {
                if (sortItem.containsKey("field")) {
                    String field = sortItem.get("field").toString();
                    String direction = sortItem.get("direction") != null ? 
                                      sortItem.get("direction").toString() : "ASC";
                    builder.orderBy(field, direction);
                }
            }
        }
    }
}

/**
 * Request object for dynamic queries
 */
class QueryRequest {
    private List<String> fields;
    private Map<String, Object> filters;
    private SearchCriteria search;
    private Object sort;
    private PaginationCriteria pagination;

    // Getters and setters
    public List<String> getFields() {
        return fields;
    }

    public void setFields(List<String> fields) {
        this.fields = fields;
    }

    public Map<String, Object> getFilters() {
        return filters;
    }

    public void setFilters(Map<String, Object> filters) {
        this.filters = filters;
    }

    public SearchCriteria getSearch() {
        return search;
    }

    public void setSearch(SearchCriteria search) {
        this.search = search;
    }

    public Object getSort() {
        return sort;
    }

    public void setSort(Object sort) {
        this.sort = sort;
    }

    public PaginationCriteria getPagination() {
        return pagination;
    }

    public void setPagination(PaginationCriteria pagination) {
        this.pagination = pagination;
    }
}

/**
 * Search criteria for text searches
 */
class SearchCriteria {
    private String field;
    private List<String> fields;
    private String term;
    private boolean exact;

    // Getters and setters
    public String getField() {
        return field;
    }

    public void setField(String field) {
        this.field = field;
    }

    public List<String> getFields() {
        return fields;
    }

    public void setFields(List<String> fields) {
        this.fields = fields;
    }

    public String getTerm() {
        return term;
    }

    public void setTerm(String term) {
        this.term = term;
    }

    public boolean isExact() {
        return exact;
    }

    public void setExact(boolean exact) {
        this.exact = exact;
    }
}

/**
 * Pagination criteria for limiting result sets
 */
class PaginationCriteria {
    private Integer page;
    private Integer pageSize;
    private Integer limit;
    private Integer offset;

    // Getters and setters
    public Integer getPage() {
        return page;
    }

    public void setPage(Integer page) {
        this.page = page;
    }

    public Integer getPageSize() {
        return pageSize;
    }

    public void setPageSize(Integer pageSize) {
        this.pageSize = pageSize;
    }

    public Integer getLimit() {
        return limit;
    }

    public void setLimit(Integer limit) {
        this.limit = limit;
    }

    public Integer getOffset() {
        return offset;
    }

    public void setOffset(Integer offset) {
        this.offset = offset;
    }
}