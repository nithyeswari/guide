import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

/**
 * Simple standalone demonstration of ThreadLocal async failures
 * Run this class to see the problem in action
 */
public class ThreadLocalFailureDemo {
    
    // ThreadLocal to store headers
    private static final ThreadLocal<Map<String, String>> HEADERS = new ThreadLocal<>();
    
    public static void main(String[] args) {
        System.out.println("🧪 THREADLOCAL ASYNC FAILURE DEMONSTRATION");
        System.out.println("=" .repeat(50));
        
        try {
            // Run all demonstration scenarios
            demonstrateBasicFailure();
            demonstrateMultipleAsyncCalls();
            demonstrateNestedAsyncCalls();
            demonstrateParallelStreamFailure();
            
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        System.out.println("\n✅ Demonstration completed!");
        System.out.println("As you can see, ThreadLocal values are NULL in async threads.");
    }
    
    /**
     * Basic demonstration: ThreadLocal works in main thread but fails in async
     */
    static void demonstrateBasicFailure() throws ExecutionException, InterruptedException {
        System.out.println("\n1️⃣ BASIC THREADLOCAL FAILURE");
        System.out.println("-".repeat(30));
        
        // Set headers in main thread
        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", "Bearer abc123");
        headers.put("User-ID", "user456");
        headers.put("Correlation-ID", "req-789");
        
        HEADERS.set(headers);
        
        // Verify headers exist in main thread
        System.out.println("📍 Main Thread: " + Thread.currentThread().getName());
        System.out.println("📦 Headers in main thread: " + HEADERS.get());
        System.out.println("✅ Headers available: " + (HEADERS.get() != null));
        
        // Try to access headers in async thread
        CompletableFuture<Boolean> asyncResult = CompletableFuture.supplyAsync(() -> {
            System.out.println("🔄 Async Thread: " + Thread.currentThread().getName());
            Map<String, String> asyncHeaders = HEADERS.get();
            System.out.println("📦 Headers in async thread: " + asyncHeaders);
            boolean headersAvailable = (asyncHeaders != null && !asyncHeaders.isEmpty());
            System.out.println("❌ Headers available: " + headersAvailable);
            return headersAvailable;
        });
        
        Boolean result = asyncResult.get();
        System.out.println("🎯 Final result: Headers accessible in async = " + result);
        
        // Cleanup
        HEADERS.remove();
    }
    
    /**
     * Multiple async calls all failing to access headers
     */
    static void demonstrateMultipleAsyncCalls() throws ExecutionException, InterruptedException {
        System.out.println("\n2️⃣ MULTIPLE ASYNC CALLS FAILURE");
        System.out.println("-".repeat(30));
        
        // Setup headers
        Map<String, String> headers = new HashMap<>();
        headers.put("Service", "order-service");
        headers.put("Version", "v1.2.3");
        headers.put("Region", "us-east-1");
        
        HEADERS.set(headers);
        System.out.println("📦 Headers set in main thread: " + HEADERS.get().keySet());
        
        // Simulate multiple service calls
        CompletableFuture<String> userCall = CompletableFuture.supplyAsync(() -> {
            return simulateServiceCall("User Service", "user data");
        });
        
        CompletableFuture<String> orderCall = CompletableFuture.supplyAsync(() -> {
            return simulateServiceCall("Order Service", "order data");
        });
        
        CompletableFuture<String> paymentCall = CompletableFuture.supplyAsync(() -> {
            return simulateServiceCall("Payment Service", "payment data");
        });
        
        // Wait for all calls to complete
        CompletableFuture.allOf(userCall, orderCall, paymentCall).get();
        
        System.out.println("🎯 Results:");
        System.out.println("   " + userCall.get());
        System.out.println("   " + orderCall.get());
        System.out.println("   " + paymentCall.get());
        
        HEADERS.remove();
    }
    
    /**
     * Nested async calls showing cascading failures
     */
    static void demonstrateNestedAsyncCalls() throws ExecutionException, InterruptedException {
        System.out.println("\n3️⃣ NESTED ASYNC CALLS FAILURE");
        System.out.println("-".repeat(30));
        
        // Setup headers
        Map<String, String> headers = new HashMap<>();
        headers.put("Request-ID", "nested-test-123");
        headers.put("Client-ID", "mobile-app");
        
        HEADERS.set(headers);
        System.out.println("📦 Headers set: " + HEADERS.get());
        
        CompletableFuture<String> outerCall = CompletableFuture.supplyAsync(() -> {
            System.out.println("🔄 Outer async thread: " + Thread.currentThread().getName());
            Map<String, String> outerHeaders = HEADERS.get();
            System.out.println("📦 Outer headers: " + outerHeaders);
            
            // Nested async call
            CompletableFuture<String> innerCall = CompletableFuture.supplyAsync(() -> {
                System.out.println("🔄 Inner async thread: " + Thread.currentThread().getName());
                Map<String, String> innerHeaders = HEADERS.get();
                System.out.println("📦 Inner headers: " + innerHeaders);
                return "Inner: " + (innerHeaders != null ? "SUCCESS" : "FAILED");
            });
            
            try {
                String innerResult = innerCall.get();
                return "Outer: " + (outerHeaders != null ? "SUCCESS" : "FAILED") + ", " + innerResult;
            } catch (Exception e) {
                return "Outer: ERROR, Inner: ERROR";
            }
        });
        
        String result = outerCall.get();
        System.out.println("🎯 Nested call result: " + result);
        
        HEADERS.remove();
    }
    
    /**
     * Parallel stream processing failure
     */
    static void demonstrateParallelStreamFailure() {
        System.out.println("\n4️⃣ PARALLEL STREAM FAILURE");
        System.out.println("-".repeat(30));
        
        // Setup headers
        Map<String, String> headers = new HashMap<>();
        headers.put("Batch-ID", "batch-2024-001");
        headers.put("Processing-Mode", "parallel");
        
        HEADERS.set(headers);
        System.out.println("📦 Headers set: " + HEADERS.get());
        System.out.println("📍 Main thread: " + Thread.currentThread().getName());
        
        // Process items with parallel stream
        java.util.List<String> items = java.util.List.of(
            "order-1", "order-2", "order-3", "order-4", "order-5"
        );
        
        System.out.println("🔄 Processing items with parallel stream...");
        
        items.parallelStream().forEach(item -> {
            System.out.println("   Processing " + item + " on thread: " + Thread.currentThread().getName());
            Map<String, String> streamHeaders = HEADERS.get();
            boolean hasHeaders = (streamHeaders != null && !streamHeaders.isEmpty());
            System.out.println("   📦 Headers for " + item + ": " + (hasHeaders ? streamHeaders.keySet() : "NULL"));
            System.out.println("   " + (hasHeaders ? "✅ SUCCESS" : "❌ FAILED"));
        });
        
        HEADERS.remove();
    }
    
    /**
     * Utility method to simulate a service call that needs headers
     */
    static String simulateServiceCall(String serviceName, String expectedData) {
        System.out.println("🔄 " + serviceName + " on thread: " + Thread.currentThread().getName());
        
        Map<String, String> headers = HEADERS.get();
        boolean hasHeaders = (headers != null && !headers.isEmpty());
        
        System.out.println("   📦 Headers available: " + hasHeaders);
        
        if (hasHeaders) {
            System.out.println("   ✅ " + serviceName + " SUCCESS - got " + expectedData);
            return serviceName + ": SUCCESS";
        } else {
            System.out.println("   ❌ " + serviceName + " FAILED - no auth headers!");
            return serviceName + ": FAILED (no headers)";
        }
    }
    
    /**
     * Bonus: Show what happens with InheritableThreadLocal
     */
    static void demonstrateInheritableThreadLocal() throws Exception {
        System.out.println("\n5️⃣ INHERITABLETHREADLOCAL PARTIAL SOLUTION");
        System.out.println("-".repeat(30));
        
        InheritableThreadLocal<Map<String, String>> inheritableHeaders = new InheritableThreadLocal<>();
        
        Map<String, String> headers = new HashMap<>();
        headers.put("Inheritable", "true");
        headers.put("Test", "inheritance");
        
        inheritableHeaders.set(headers);
        System.out.println("📦 Headers set in InheritableThreadLocal: " + inheritableHeaders.get());
        
        // Test 1: Direct thread creation (works)
        System.out.println("\n🔄 Test 1: Direct Thread Creation");
        Thread directThread = new Thread(() -> {
            System.out.println("   Thread: " + Thread.currentThread().getName());
            Map<String, String> inherited = inheritableHeaders.get();
            System.out.println("   📦 Inherited: " + inherited);
            System.out.println("   " + (inherited != null ? "✅ SUCCESS" : "❌ FAILED"));
        });
        directThread.start();
        directThread.join();
        
        // Test 2: CompletableFuture (usually fails due to thread pools)
        System.out.println("\n🔄 Test 2: CompletableFuture");
        CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
            System.out.println("   Thread: " + Thread.currentThread().getName());
            Map<String, String> inherited = inheritableHeaders.get();
            System.out.println("   📦 Inherited: " + inherited);
            System.out.println("   " + (inherited != null ? "✅ SUCCESS" : "❌ FAILED (expected with thread pools)"));
        });
        future.get();
        
        inheritableHeaders.remove();
    }
}

/**
 * Real-world scenario: HTTP request processing
 */
class RealWorldScenario {
    private static final ThreadLocal<Map<String, String>> REQUEST_HEADERS = new ThreadLocal<>();
    
    public static void main(String[] args) {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("🌐 REAL-WORLD SCENARIO: HTTP REQUEST PROCESSING");
        System.out.println("=".repeat(60));
        
        try {
            simulateWebRequest();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    static void simulateWebRequest() throws Exception {
        // 1. Simulate HTTP request coming in (like from a servlet filter)
        System.out.println("\n📨 HTTP Request Received");
        System.out.println("POST /api/orders HTTP/1.1");
        System.out.println("Authorization: Bearer eyJhbGciOiJIUzI1NiIs...");
        System.out.println("X-User-ID: user-12345");
        System.out.println("X-Correlation-ID: req-" + System.currentTimeMillis());
        System.out.println("X-Tenant-ID: tenant-abc");
        
        // Extract headers (normally done by filter/interceptor)
        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", "Bearer eyJhbGciOiJIUzI1NiIs...");
        headers.put("X-User-ID", "user-12345");
        headers.put("X-Correlation-ID", "req-" + System.currentTimeMillis());
        headers.put("X-Tenant-ID", "tenant-abc");
        
        REQUEST_HEADERS.set(headers);
        System.out.println("✅ Headers stored in ThreadLocal");
        
        // 2. Simulate controller processing
        System.out.println("\n🎮 Controller Processing");
        processOrderRequest();
        
        // 3. Cleanup (normally done by filter)
        REQUEST_HEADERS.remove();
        System.out.println("\n🧹 ThreadLocal cleaned up");
    }
    
    static void processOrderRequest() throws Exception {
        System.out.println("📍 Controller thread: " + Thread.currentThread().getName());
        
        // Verify we have headers in controller
        Map<String, String> controllerHeaders = REQUEST_HEADERS.get();
        System.out.println("📦 Headers in controller: " + (controllerHeaders != null ? "✅ Available" : "❌ Missing"));
        
        // Now make async calls to different services
        System.out.println("\n🔄 Making async service calls...");
        
        CompletableFuture<String> userValidation = validateUser();
        CompletableFuture<String> inventoryCheck = checkInventory();
        CompletableFuture<String> paymentProcessing = processPayment();
        CompletableFuture<String> auditLogging = logAuditEvent();
        
        // Wait for all async operations
        CompletableFuture.allOf(userValidation, inventoryCheck, paymentProcessing, auditLogging).get();
        
        // Check results
        System.out.println("\n📊 Service Call Results:");
        System.out.println("👤 User Validation: " + userValidation.get());
        System.out.println("📦 Inventory Check: " + inventoryCheck.get());
        System.out.println("💳 Payment Processing: " + paymentProcessing.get());
        System.out.println("📋 Audit Logging: " + auditLogging.get());
        
        // Count failures
        long failures = java.util.List.of(userValidation, inventoryCheck, paymentProcessing, auditLogging)
            .stream()
            .map(future -> {
                try { return future.get(); } catch (Exception e) { return "FAILED"; }
            })
            .filter(result -> result.contains("FAILED"))
            .count();
        
        System.out.println("\n🎯 Summary: " + failures + " out of 4 services failed due to missing headers");
        
        if (failures > 0) {
            System.out.println("💥 Order processing would fail in production!");
            System.out.println("🔧 Solution: Use Micrometer Context Propagation");
        }
    }
    
    static CompletableFuture<String> validateUser() {
        return CompletableFuture.supplyAsync(() -> {
            System.out.println("👤 User validation on thread: " + Thread.currentThread().getName());
            
            Map<String, String> headers = REQUEST_HEADERS.get();
            if (headers == null) {
                System.out.println("   ❌ No headers - cannot validate user!");
                return "FAILED: No authorization header";
            }
            
            String authHeader = headers.get("Authorization");
            String userId = headers.get("X-User-ID");
            
            if (authHeader != null && userId != null) {
                System.out.println("   ✅ User " + userId + " validated successfully");
                return "SUCCESS: User validated";
            } else {
                System.out.println("   ❌ Missing auth data");
                return "FAILED: Missing auth data";
            }
        });
    }
    
    static CompletableFuture<String> checkInventory() {
        return CompletableFuture.supplyAsync(() -> {
            System.out.println("📦 Inventory check on thread: " + Thread.currentThread().getName());
            
            Map<String, String> headers = REQUEST_HEADERS.get();
            if (headers == null) {
                System.out.println("   ❌ No headers - cannot determine tenant!");
                return "FAILED: No tenant context";
            }
            
            String tenantId = headers.get("X-Tenant-ID");
            if (tenantId != null) {
                System.out.println("   ✅ Inventory checked for tenant: " + tenantId);
                return "SUCCESS: Inventory available";
            } else {
                System.out.println("   ❌ No tenant ID");
                return "FAILED: No tenant ID";
            }
        });
    }
    
    static CompletableFuture<String> processPayment() {
        return CompletableFuture.supplyAsync(() -> {
            System.out.println("💳 Payment processing on thread: " + Thread.currentThread().getName());
            
            Map<String, String> headers = REQUEST_HEADERS.get();
            if (headers == null) {
                System.out.println("   ❌ No headers - cannot process payment!");
                return "FAILED: No user context";
            }
            
            String userId = headers.get("X-User-ID");
            String authHeader = headers.get("Authorization");
            
            if (userId != null && authHeader != null) {
                System.out.println("   ✅ Payment processed for user: " + userId);
                return "SUCCESS: Payment processed";
            } else {
                System.out.println("   ❌ Missing payment context");
                return "FAILED: Missing payment context";
            }
        });
    }
    
    static CompletableFuture<String> logAuditEvent() {
        return CompletableFuture.supplyAsync(() -> {
            System.out.println("📋 Audit logging on thread: " + Thread.currentThread().getName());
            
            Map<String, String> headers = REQUEST_HEADERS.get();
            if (headers == null) {
                System.out.println("   ❌ No headers - cannot create audit trail!");
                return "FAILED: No correlation ID";
            }
            
            String correlationId = headers.get("X-Correlation-ID");
            String userId = headers.get("X-User-ID");
            
            if (correlationId != null) {
                System.out.println("   ✅ Audit logged with correlation: " + correlationId);
                return "SUCCESS: Audit logged";
            } else {
                System.out.println("   ❌ No correlation ID");
                return "FAILED: No correlation ID";
            }
        });
    }
}