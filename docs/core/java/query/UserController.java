package com.example.spanner.controller;

import com.example.spanner.query.PagedResult;
import com.example.spanner.query.QueryRequest;
import com.example.spanner.query.SpannerQueryService;
import com.example.spanner.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final SpannerQueryService queryService;

    @Autowired
    public UserController(SpannerQueryService queryService) {
        this.queryService = queryService;
    }

    /**
     * Get users with dynamic filtering, searching, sorting, and pagination
     */
    @PostMapping("/search")
    public ResponseEntity<PagedResult<User>> searchUsers(@RequestBody QueryRequest queryRequest) {
        PagedResult<User> result = queryService.executeQuery(User.class, queryRequest);
        return ResponseEntity.ok(result);
    }

    /**
     * Get users with GET parameters for simpler queries
     */
    @GetMapping
    public ResponseEntity<PagedResult<User>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String sortDirection,
            @RequestParam(required = false, defaultValue = "1") int page,
            @RequestParam(required = false, defaultValue = "10") int pageSize) {
        
        // Create a query request object from parameters
        QueryRequest queryRequest = new QueryRequest();
        
        // Apply filters
        if (status != null) {
            Map<String, Object> filters = new HashMap<>();
            filters.put("status", status);
            queryRequest.setFilters(filters);
        }
        
        // Apply search if provided
        if (search != null && !search.trim().isEmpty()) {
            SearchCriteria searchCriteria = new SearchCriteria();
            searchCriteria.setFields(List.of("name", "email", "description"));
            searchCriteria.setTerm(search);
            queryRequest.setSearch(searchCriteria);
        }
        
        // Apply sorting
        if (sortBy != null && !sortBy.trim().isEmpty()) {
            Map<String, String> sort = new HashMap<>();
            sort.put(sortBy, sortDirection);
            queryRequest.setSort(sort);
        }
        
        // Apply pagination
        PaginationCriteria pagination = new PaginationCriteria();
        pagination.setPage(page);
        pagination.setPageSize(pageSize);
        queryRequest.setPagination(pagination);
        
        // Execute the query
        PagedResult<User> result = queryService.executeQuery(User.class, queryRequest);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Example of using the builder API directly for more control
     */
    @GetMapping("/active")
    public ResponseEntity<List<User>> getActiveUsers() {
        List<User> activeUsers = queryService.createQueryBuilder(User.class)
                .whereEquals("status", "active")
                .orderByDesc("created_at")
                .limit(20)
                .executeQuery(queryService.getSpannerTemplate());
        
        return ResponseEntity.ok(activeUsers);
    }
    
    /**
     * Example of a complex query using the builder API
     */
    @GetMapping("/complex")
    public ResponseEntity<PagedResult<User>> getComplexQuery(
            @RequestParam(required = false, defaultValue = "1") int page,
            @RequestParam(required = false, defaultValue = "10") int pageSize) {
        
        PagedResult<User> result = queryService.createQueryBuilder(User.class)
                .select("id", "name", "email", "status", "created_at")
                .whereEquals("status", "active")
                .whereNotNull("email")
                .whereBetween("created_at", 
                        java.sql.Timestamp.valueOf("2023-01-01 00:00:00"),
                        java.sql.Timestamp.valueOf("2023-12-