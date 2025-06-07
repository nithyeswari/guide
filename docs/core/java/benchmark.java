// Custom Annotations
import java.lang.annotation.*;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface BenchmarkTest {
    String url();
    int requests() default 100;
    int concurrency() default 10;
    int timeout() default 30;
    boolean keepAlive() default true;
    String[] headers() default {};
    String postData() default "";
    String contentType() default "";
}

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface PerformanceThreshold {
    double maxResponseTime() default Double.MAX_VALUE;
    double minRequestsPerSecond() default 0.0;
    int maxFailedRequests() default 0;
    double maxPercentile95() default Double.MAX_VALUE;
}

// Benchmark Result Data Class
public class BenchmarkResult {
    private final double requestsPerSecond;
    private final double timePerRequest;
    private final double totalTime;
    private final int failedRequests;
    private final int completeRequests;
    private final double transferRate;
    private final double connectTimeMean;
    private final double processingTimeMean;
    private final double waitingTimeMean;
    private final Map<Integer, Double> percentiles;
    private final String rawOutput;

    public BenchmarkResult(double requestsPerSecond, double timePerRequest, 
                          double totalTime, int failedRequests, int completeRequests,
                          double transferRate, double connectTimeMean, 
                          double processingTimeMean, double waitingTimeMean,
                          Map<Integer, Double> percentiles, String rawOutput) {
        this.requestsPerSecond = requestsPerSecond;
        this.timePerRequest = timePerRequest;
        this.totalTime = totalTime;
        this.failedRequests = failedRequests;
        this.completeRequests = completeRequests;
        this.transferRate = transferRate;
        this.connectTimeMean = connectTimeMean;
        this.processingTimeMean = processingTimeMean;
        this.waitingTimeMean = waitingTimeMean;
        this.percentiles = percentiles;
        this.rawOutput = rawOutput;
    }

    // Getters
    public double getRequestsPerSecond() { return requestsPerSecond; }
    public double getTimePerRequest() { return timePerRequest; }
    public double getTotalTime() { return totalTime; }
    public int getFailedRequests() { return failedRequests; }
    public int getCompleteRequests() { return completeRequests; }
    public double getTransferRate() { return transferRate; }
    public double getConnectTimeMean() { return connectTimeMean; }
    public double getProcessingTimeMean() { return processingTimeMean; }
    public double getWaitingTimeMean() { return waitingTimeMean; }
    public Map<Integer, Double> getPercentiles() { return percentiles; }
    public String getRawOutput() { return rawOutput; }
}

// Apache Bench Runner
import java.io.*;
import java.util.*;
import java.util.regex.*;

public class ApacheBenchRunner {
    
    public static BenchmarkResult runBenchmark(String url, BenchmarkTest config) 
            throws IOException, InterruptedException {
        
        List<String> command = buildCommand(url, config);
        
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        
        Process process = pb.start();
        StringBuilder output = new StringBuilder();
        
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }
        
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("Apache Bench failed with exit code: " + exitCode);
        }
        
        return parseResults(output.toString());
    }
    
    private static List<String> buildCommand(String url, BenchmarkTest config) {
        List<String> cmd = new ArrayList<>();
        cmd.add("ab");
        cmd.add("-n");
        cmd.add(String.valueOf(config.requests()));
        cmd.add("-c");
        cmd.add(String.valueOf(config.concurrency()));
        cmd.add("-s");
        cmd.add(String.valueOf(config.timeout()));
        cmd.add("-r"); // Don't exit on socket receive errors
        
        if (config.keepAlive()) {
            cmd.add("-k");
        }
        
        // Add headers
        for (String header : config.headers()) {
            cmd.add("-H");
            cmd.add(header);
        }
        
        // Add POST data if specified
        if (!config.postData().isEmpty()) {
            cmd.add("-p");
            cmd.add("-"); // Read from stdin
            if (!config.contentType().isEmpty()) {
                cmd.add("-T");
                cmd.add(config.contentType());
            }
        }
        
        cmd.add(url);
        return cmd;
    }
    
    private static BenchmarkResult parseResults(String output) {
        Map<String, String> metrics = new HashMap<>();
        Map<Integer, Double> percentiles = new HashMap<>();
        
        // Parse key metrics using regex
        parseMetric(output, "Requests per second:\\s+([\\d.]+)", "rps", metrics);
        parseMetric(output, "Time per request:\\s+([\\d.]+).*mean", "tpr", metrics);
        parseMetric(output, "Time taken for tests:\\s+([\\d.]+)", "total_time", metrics);
        parseMetric(output, "Failed requests:\\s+(\\d+)", "failed", metrics);
        parseMetric(output, "Complete requests:\\s+(\\d+)", "complete", metrics);
        parseMetric(output, "Transfer rate:\\s+([\\d.]+)", "transfer_rate", metrics);
        parseMetric(output, "Connect:\\s+\\d+\\s+([\\d.]+)", "connect_mean", metrics);
        parseMetric(output, "Processing:\\s+\\d+\\s+([\\d.]+)", "processing_mean", metrics);
        parseMetric(output, "Waiting:\\s+\\d+\\s+([\\d.]+)", "waiting_mean", metrics);
        
        // Parse percentiles
        parsePercentiles(output, percentiles);
        
        return new BenchmarkResult(
            Double.parseDouble(metrics.getOrDefault("rps", "0")),
            Double.parseDouble(metrics.getOrDefault("tpr", "0")),
            Double.parseDouble(metrics.getOrDefault("total_time", "0")),
            Integer.parseInt(metrics.getOrDefault("failed", "0")),
            Integer.parseInt(metrics.getOrDefault("complete", "0")),
            Double.parseDouble(metrics.getOrDefault("transfer_rate", "0")),
            Double.parseDouble(metrics.getOrDefault("connect_mean", "0")),
            Double.parseDouble(metrics.getOrDefault("processing_mean", "0")),
            Double.parseDouble(metrics.getOrDefault("waiting_mean", "0")),
            percentiles,
            output
        );
    }
    
    private static void parseMetric(String output, String regex, String key, Map<String, String> metrics) {
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(output);
        if (matcher.find()) {
            metrics.put(key, matcher.group(1));
        }
    }
    
    private static void parsePercentiles(String output, Map<Integer, Double> percentiles) {
        Pattern pattern = Pattern.compile("\\s+(\\d+)%\\s+([\\d.]+)");
        Matcher matcher = pattern.matcher(output);
        while (matcher.find()) {
            int percentile = Integer.parseInt(matcher.group(1));
            double value = Double.parseDouble(matcher.group(2));
            percentiles.put(percentile, value);
        }
    }
}

// JUnit 5 Extension for Apache Bench
import org.junit.jupiter.api.extension.*;
import org.junit.jupiter.api.Assertions;
import java.lang.reflect.Method;

public class ApacheBenchExtension implements BeforeEachCallback, AfterEachCallback {
    
    @Override
    public void beforeEach(ExtensionContext context) throws Exception {
        Method testMethod = context.getRequiredTestMethod();
        BenchmarkTest benchmarkTest = testMethod.getAnnotation(BenchmarkTest.class);
        
        if (benchmarkTest != null) {
            System.out.println("Starting Apache Bench test for: " + benchmarkTest.url());
            
            // Run the benchmark
            BenchmarkResult result = ApacheBenchRunner.runBenchmark(
                benchmarkTest.url(), benchmarkTest);
            
            // Store result in context for assertions
            context.getStore(ExtensionContext.Namespace.GLOBAL)
                   .put("benchmarkResult", result);
            
            // Check performance thresholds
            PerformanceThreshold threshold = testMethod.getAnnotation(PerformanceThreshold.class);
            if (threshold != null) {
                validateThresholds(result, threshold);
            }
            
            // Print results
            printResults(result);
        }
    }
    
    @Override
    public void afterEach(ExtensionContext context) throws Exception {
        // Cleanup if needed
    }
    
    private void validateThresholds(BenchmarkResult result, PerformanceThreshold threshold) {
        if (result.getTimePerRequest() > threshold.maxResponseTime()) {
            Assertions.fail(String.format(
                "Response time %.2f ms exceeds threshold %.2f ms",
                result.getTimePerRequest(), threshold.maxResponseTime()));
        }
        
        if (result.getRequestsPerSecond() < threshold.minRequestsPerSecond()) {
            Assertions.fail(String.format(
                "Requests per second %.2f below threshold %.2f",
                result.getRequestsPerSecond(), threshold.minRequestsPerSecond()));
        }
        
        if (result.getFailedRequests() > threshold.maxFailedRequests()) {
            Assertions.fail(String.format(
                "Failed requests %d exceeds threshold %d",
                result.getFailedRequests(), threshold.maxFailedRequests()));
        }
        
        Double p95 = result.getPercentiles().get(95);
        if (p95 != null && p95 > threshold.maxPercentile95()) {
            Assertions.fail(String.format(
                "95th percentile %.2f ms exceeds threshold %.2f ms",
                p95, threshold.maxPercentile95()));
        }
    }
    
    private void printResults(BenchmarkResult result) {
        System.out.println("\n=== Apache Bench Results ===");
        System.out.printf("Requests per second: %.2f\n", result.getRequestsPerSecond());
        System.out.printf("Time per request: %.2f ms\n", result.getTimePerRequest());
        System.out.printf("Total time: %.2f seconds\n", result.getTotalTime());
        System.out.printf("Failed requests: %d\n", result.getFailedRequests());
        System.out.printf("Complete requests: %d\n", result.getCompleteRequests());
        System.out.printf("Transfer rate: %.2f KB/sec\n", result.getTransferRate());
        
        System.out.println("\nPercentiles:");
        result.getPercentiles().entrySet().stream()
              .sorted(Map.Entry.comparingByKey())
              .forEach(entry -> System.out.printf("  %d%%: %.2f ms\n", 
                      entry.getKey(), entry.getValue()));
        System.out.println("============================\n");
    }
}

// Example Test Class
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(ApacheBenchExtension.class)
public class WebPerformanceTest {
    
    @Test
    @BenchmarkTest(
        url = "http://localhost:8080/api/health",
        requests = 1000,
        concurrency = 50,
        timeout = 30,
        keepAlive = true,
        headers = {"Accept: application/json", "User-Agent: PerformanceTest"}
    )
    @PerformanceThreshold(
        maxResponseTime = 100.0,
        minRequestsPerSecond = 500.0,
        maxFailedRequests = 0,
        maxPercentile95 = 150.0
    )
    public void testHealthEndpointPerformance() {
        // Test will automatically run Apache Bench via extension
        // Additional custom assertions can be added here if needed
        System.out.println("Health endpoint performance test completed");
    }
    
    @Test
    @BenchmarkTest(
        url = "http://localhost:8080/api/users",
        requests = 500,
        concurrency = 20,
        headers = {"Authorization: Bearer test-token"}
    )
    @PerformanceThreshold(
        maxResponseTime = 200.0,
        minRequestsPerSecond = 100.0
    )
    public void testUsersEndpointPerformance() {
        System.out.println("Users endpoint performance test completed");
    }
    
    @Test
    @BenchmarkTest(
        url = "http://localhost:8080/api/data",
        requests = 100,
        concurrency = 10,
        postData = "{\"test\": \"data\"}",
        contentType = "application/json",
        headers = {"Content-Type: application/json"}
    )
    public void testPostEndpointPerformance() {
        System.out.println("POST endpoint performance test completed");
    }
}

// Maven Dependencies (pom.xml)
/*
<dependencies>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.9.2</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter-engine</artifactId>
        <version>5.9.2</version>
        <scope>test</scope>
    </dependency>
</dependencies>
*/
