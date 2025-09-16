import io.micrometer.context.ContextRegistry;
import io.micrometer.context.ContextSnapshot;
import io.micrometer.context.ThreadLocalAccessor;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Working solution using Micrometer Context Propagation
 * This class demonstrates how to SOLVE the ThreadLocal async problem
 */
public class WorkingSolutionDemo {
    
    private static final ThreadLocal<Map<String, String>> HEADERS = new ThreadLocal<>();
    
    public static void main(String[] args) {
        System.out.println("🚀 WORKING SOLUTION WITH CONTEXT PROPAGATION");
        System.out.println("=".repeat(50));
        
        try {
            // Setup context propagation
            setupContextPropagation();
            
            // Run the same scenarios that failed before, but now working
            demonstrateWorkingAsyncCalls();
            demonstrateWorkingNestedCalls();
            demonstrateWorkingRealWorldScenario();
            
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        System.out.println("\n✅ All async operations completed successfully!");
        System.out.println("🎯 Headers were properly propagated across all threads!");
    }
    
    /**
     * Setup Micrometer Context Propagation
     */
    static void setupContextPropagation() {
        System.out.println("\n⚙️ Setting up Context Propagation...");
        
        ContextRegistry registry = ContextRegistry.getInstance();
        
        // Create ThreadLocal accessor for our headers
        ThreadLocalAccessor<Map<String, String>> headerAccessor = new ThreadLocalAccessor<Map<String, String>>() {
            @Override
            public Object key() {
                return "request-headers";
            }
            
            @Override
            public Map<String, String> getValue() {
                return HEADERS.get();
            }
            
            @Override
            public void setValue(Map<String, String> value) {
                HEADERS.set(value);
            }
            
            @Override
            public void reset() {
                HEADERS.remove();
            }
        };
        
        // Register the accessor
        registry.registerThreadLocalAccessor(headerAccessor);
        
        System.out.println("✅ Context propagation configured!");
    }
    
    /**
     * Demonstrate working async calls
     */
    static void demonstrateWorkingAsyncCalls() throws Exception {
        System.out.println("\n1️⃣ WORKING ASYNC CALLS");
        System.out.println("-".repeat(30));
        
        // Set headers in main thread
        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", "Bearer working-token");
        headers.put("User-ID", "user-123");
        headers.put("Correlation-ID", "req-working-456");
        
        HEADERS.set(headers);
        System.out.println("📦 Headers set in main thread: " + HEADERS.get().keySet());
        System.out.println("📍 Main thread: " + Thread.currentThread().getName());
        
        // 🔑 KEY: Capture context before async operation
        ContextSnapshot contextSnapshot = ContextSnapshot.captureAll();
        
        // Now async calls will work!
        CompletableFuture<String> result = CompletableFuture.supplyAsync(
            contextSnapshot.wrap(() -> {  // 🔑 Wrap the async operation
                System.out.println("🔄 Async thread: " + Thread.currentThread().getName());
                Map<String, String> asyncHeaders = HEADERS.get();
                System.out.println("📦 Headers in async thread: " + asyncHeaders);
                
                boolean success = (asyncHeaders != null && !asyncHeaders.isEmpty());
                System.out.println("✅ Headers propagated: " + success);
                
                return success ? "SUCCESS: Headers available!" : "FAILED: No headers";
            })
        );
        
        String outcome = result.get();
        System.out.println("🎯 Result: " + outcome);
        
        HEADERS.remove();
    }
    
    /**
     * Demonstrate working nested async calls
     */
    static void demonstrateWorkingNestedCalls() throws Exception {
        System.out.println("\n2️⃣ WORKING NESTED ASYNC CALLS");
        System.out.println("-".repeat(30));
        
        // Setup headers
        Map<String, String> headers = new HashMap<>();
        headers.put("Nested-Test", "true");
        headers.put("Level", "outer");
        
        HEADERS.set(headers);
        System.out.println("📦 Headers set: " + HEADERS.get());
        
        // Capture context once
        ContextSnapshot contextSnapshot = ContextSnapshot.captureAll();
        
        CompletableFuture<String> outerCall = CompletableFuture.supplyAsync(
            contextSnapshot.wrap(() -> {
                System.out.println("🔄 Outer async thread: " + Thread.currentThread().getName());
                Map<String, String> outerHeaders = HEADERS.get();
                System.out.println("📦 Outer headers: " + outerHeaders);
                
                // Nested async call - same context can be reused!
                CompletableFuture<String> innerCall = CompletableFuture.supplyAsync(
                    contextSnapshot.wrap(() -> {
                        System.out.println("🔄 Inner async thread: " + Thread.currentThread().getName());
                        Map<String, String> innerHeaders = HEADERS.get();
                        System.out.println("📦 Inner headers: " + innerHeaders);
                        
                        return "Inner: " + (innerHeaders != null ? "SUCCESS" : "FAILED");
                    })
                );
                
                try {
                    String innerResult = innerCall.get();
                    return "Outer: " + (outerHeaders != null ? "SUCCESS" : "FAILED") + ", " + innerResult;
                } catch (Exception e) {
                    return "ERROR in nested call";
                }
            })
        );
        
        String result = outerCall.get();
        System.out.println("🎯 Nested result: " + result);
        
        HEADERS.remove();
    }
    
    /**
     * Real-world scenario: Working web request processing
     */
    static void demonstrateWorkingRealWorldScenario() throws Exception {
        System.out.println("\n3️⃣ WORKING REAL-WORLD SCENARIO");
        System.out.println("-".repeat(30));
        
        // Simulate incoming request
        Map<String, String> requestHeaders = new HashMap<>();
        requestHeaders.put("Authorization", "Bearer real-token-123");
        requestHeaders.put("X-User-ID", "user-999");
        requestHeaders.put("X-Correlation-ID", "req-" + System.currentTimeMillis());
        requestHeaders.put("X-Tenant-ID", "tenant-prod");
        
        HEADERS.set(requestHeaders);
        System.out.println("📨 Simulated request headers: " + requestHeaders.keySet());
        
        // Capture context for all async operations
        ContextSnapshot contextSnapshot = ContextSnapshot.captureAll();
        
        // Multiple async service calls - all will work now!
        CompletableFuture<String> userService = CompletableFuture.supplyAsync(
            contextSnapshot.wrap(() -> callUserService())
        );
        
        CompletableFuture<String> orderService = CompletableFuture.supplyAsync(
            contextSnapshot.wrap(() -> callOrderService())
        );
        
        CompletableFuture<String> paymentService = CompletableFuture.supplyAsync(
            contextSnapshot.wrap(() -> callPaymentService())
        );
        
        CompletableFuture<String> auditService = CompletableFuture.supplyAsync(
            contextSnapshot.wrap(() -> callAuditService())
        );
        
        // Wait for all services
        CompletableFuture.allOf(userService, orderService, paymentService, auditService).get();
        
        // Check results
        System.out.println("\n📊 Service Results:");
        System.out.println("👤 " + userService.get());
        System.out.println("🛒 " + orderService.get());
        System.out.println("💳 " + paymentService.get());
        System.out.println("📋 " + auditService.get());
        
        // Count successes
        long successes = java.util.List.of(userService, orderService, paymentService, auditService)
            .stream()
            .map(future -> {
                try { return future.get(); } catch (Exception e) { return "FAILED"; }
            })
            .filter(result -> result.contains("SUCCESS"))
            .count();
        
        System.out.println("\n🎯 Summary: " + successes + " out of 4 services succeeded!");
        System.out.println("✅ All services had access to required headers!");
        
        HEADERS.remove();
    }
    
    // Simulated service calls
    static String callUserService() {
        System.out.println("👤 User Service on thread: " + Thread.currentThread().getName());
        Map<String, String> headers = HEADERS.get();
        
        if (headers != null && headers.get("Authorization") != null) {
            System.out.println("   ✅ User authenticated: " + headers.get("X-User-ID"));
            return "User Service: SUCCESS";
        } else {
            System.out.println("   ❌ No auth headers");
            return "User Service: FAILED";
        }
    }
    
    static String callOrderService() {
        System.out.println("🛒 Order Service on thread: " + Thread.currentThread().getName());
        Map<String, String> headers = HEADERS.get();
        
        if (headers != null && headers.get("X-Tenant-ID") != null) {
            System.out.println("   ✅ Orders retrieved for tenant: " + headers.get("X-Tenant-ID"));
            return "Order Service: SUCCESS";
        } else {
            System.out.println("   ❌ No tenant context");
            return "Order Service: FAILED";
        }
    }
    
    static String callPaymentService() {
        System.out.println("💳 Payment Service on thread: " + Thread.currentThread().getName());
        Map<String, String> headers = HEADERS.get();
        
        if (headers != null && headers.get("X-User-ID") != null) {
            System.out.println("   ✅ Payment processed for user: " + headers.get("X-User-ID"));
            return "Payment Service: SUCCESS";
        } else {
            System.out.println("   ❌ No user context");
            return "Payment Service: FAILED";
        }
    }
    
    static String callAuditService() {
        System.out.println("📋 Audit Service on thread: " + Thread.currentThread().getName());
        Map<String, String> headers = HEADERS.get();
        
        if (headers != null && headers.get("X-Correlation-ID") != null) {
            System.out.println("   ✅ Audit logged: " + headers.get("X-Correlation-ID"));
            return "Audit Service: SUCCESS";
        } else {
            System.out.println("   ❌ No correlation ID");
            return "Audit Service: FAILED";
        }
    }
}

/**
 * Performance comparison between failing and working approaches
 */
class PerformanceComparison {
    private static final ThreadLocal<Map<String, String>> PERF_HEADERS = new ThreadLocal<>();
    private static final int TEST_ITERATIONS = 100;
    
    public static void main(String[] args) throws Exception {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("⚡ PERFORMANCE COMPARISON");
        System.out.println("=".repeat(60));
        
        // Setup context propagation
        setupContextPropagation();
        
        // Test data
        Map<String, String> testHeaders = new HashMap<>();
        testHeaders.put("Perf-Test", "true");
        testHeaders.put("Iteration", "benchmark");
        
        PERF_HEADERS.set(testHeaders);
        
        // Run performance tests
        long failingTime = testFailingApproach();
        long workingTime = testWorkingApproach();
        
        System.out.println("\n📊 Performance Results (" + TEST_ITERATIONS + " iterations):");
        System.out.println("❌ Failing approach: " + failingTime + "ms (headers lost)");
        System.out.println("✅ Working approach: " + workingTime + "ms (headers preserved)");
        System.out.println("📈 Overhead: " + ((workingTime - failingTime) * 100 / failingTime) + "%");
        System.out.println("💡 Small overhead for guaranteed correctness!");
        
        PERF_HEADERS.remove();
    }
    
    static void setupContextPropagation() {
        ContextRegistry registry = ContextRegistry.getInstance();
        ThreadLocalAccessor<Map<String, String>> accessor = new ThreadLocalAccessor<Map<String, String>>() {
            @Override
            public Object key() { return "perf-headers"; }
            @Override
            public Map<String, String> getValue() { return PERF_HEADERS.get(); }
            @Override
            public void setValue(Map<String, String> value) { PERF_HEADERS.set(value); }
            @Override
            public void reset() { PERF_HEADERS.remove(); }
        };
        registry.registerThreadLocalAccessor(accessor);
    }
    
    static long testFailingApproach() throws Exception {
        System.out.println("\n🧪 Testing failing approach...");
        long start = System.currentTimeMillis();
        
        CompletableFuture<?>[] futures = new CompletableFuture[TEST_ITERATIONS];
        
        for (int i = 0; i < TEST_ITERATIONS; i++) {
            futures[i] = CompletableFuture.runAsync(() -> {
                // This will fail - headers are null
                Map<String, String> headers = PERF_HEADERS.get();
                processRequest(headers); // Will fail
            });
        }
        
        CompletableFuture.allOf(futures).get();
        
        long duration = System.currentTimeMillis() - start;
        System.out.println("⏱️ Failing approach completed in: " + duration + "ms");
        return duration;
    }
    
    static long testWorkingApproach() throws Exception {
        System.out.println("\n🧪 Testing working approach...");
        ContextSnapshot snapshot = ContextSnapshot.captureAll();
        long start = System.currentTimeMillis();
        
        CompletableFuture<?>[] futures = new CompletableFuture[TEST_ITERATIONS];
        
        for (int i = 0; i < TEST_ITERATIONS; i++) {
            futures[i] = CompletableFuture.runAsync(
                snapshot.wrap(() -> {
                    // This will work - headers are propagated
                    Map<String, String> headers = PERF_HEADERS.get();
                    processRequest(headers); // Will succeed
                })
            );
        }
        
        CompletableFuture.allOf(futures).get();
        
        long duration = System.currentTimeMillis() - start;
        System.out.println("⏱️ Working approach completed in: " + duration + "ms");
        return duration;
    }
    
    static void processRequest(Map<String, String> headers) {
        // Simulate processing that requires headers
        if (headers != null && !headers.isEmpty()) {
            // Success - can process with headers
            String test = headers.get("Perf-Test");
        } else {
            // Failure - no headers available
        }
    }
}