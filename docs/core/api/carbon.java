// Carbon Monitoring Service
@Service
@Slf4j
public class CarbonMetricsService {
    
    private final MeterRegistry meterRegistry;
    private final Environment environment;

    public CarbonMetricsService(MeterRegistry meterRegistry, Environment environment) {
        this.meterRegistry = meterRegistry;
        this.environment = environment;
    }

    // 1. Request Carbon Footprint
    public void recordRequestFootprint(String endpoint, double carbonGrams) {
        Counter.builder("api.carbon.footprint")
            .tag("endpoint", endpoint)
            .tag("environment", environment.getActiveProfiles()[0])
            .description("Carbon footprint in grams CO2e")
            .baseUnit("grams")
            .register(meterRegistry)
            .increment(carbonGrams);
    }

    // 2. CPU Usage Monitoring
    public void recordCpuUsage(double usage) {
        Gauge.builder("api.cpu.usage", usage, Number::doubleValue)
            .tag("environment", environment.getActiveProfiles()[0])
            .description("CPU usage percentage")
            .register(meterRegistry);
    }

    // 3. Memory Usage
    public void recordMemoryUsage(double usedMemoryMB) {
        Gauge.builder("api.memory.usage", usedMemoryMB, Number::doubleValue)
            .tag("environment", environment.getActiveProfiles()[0])
            .description("Memory usage in MB")
            .baseUnit("megabytes")
            .register(meterRegistry);
    }

    // 4. Network Traffic
    public void recordNetworkTraffic(String direction, long bytes) {