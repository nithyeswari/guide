@RestController
public class ApiController {

  @PostMapping("/sync-rest") 
  public ResponseEntity<String> syncRestHandler(...) {
    // sync REST handling
  }

  @PostMapping("/async-rest")
  public CompletableFuture<ResponseEntity<String>> asyncRestHandler(...) {  
    // async REST handling 
  }

  @GetMapping("/sync-grpc")
  @GrpcMapping(SyncGrpcService.class)
  public String syncGrpcHandler() {
    // sync gRPC handling
  }

  @GetMapping("/async-grpc")
  @GrpcMapping(AsyncGrpcService.class) 
  public Mono<String> asyncGrpcHandler() {
    // async gRPC handling
  }  

  @PostMapping("/graphql")
  public String graphqlHandler(...) {
    // GraphQL handling
  }

  @GetMapping("/ws")
  public ResponseEntity<Void> websocketHandler(...) {
    // WebSocket handling
  }

  @GetMapping("/sse")
  public SseEmitter sseHandler() {
    // SSE handling
  }

  @PostMapping(value="/xml", consumes="application/xml") 
  public String xmlHandler(...) {
    // XML handling
  }

  @PostMapping("/callback")
  public ResponseEntity<Void> callbackHandler(...) {
    // async callback handling 
  }

}

@GrpcService
class SyncGrpcService extends SomeGrpc.SyncGrpcServiceImplBase {
  // sync gRPC service
}

@GrpcService
class AsyncGrpcService extends SomeGrpc.AsyncGrpcServiceImplBase {
  // async gRPC service 
}
