Here is an example of defining a common @ApiResponse in a shared library that can be reused by other microservices:

```java
// In shared-lib module
package com.example.common;

import io.swagger.annotations.ApiResponse;
import io.swagger.annotations.ApiResponses;

public class CommonApiResponses {

    @ApiResponses(value = {
        @ApiResponse(code = 400, message = "Invalid request parameters"),
        @ApiResponse(code = 404, message = "Resource not found"),
        @ApiResponse(code = 500, message = "Internal server error")
    })
    public static class CommonApiResponses {}

}
```

And in the microservices:

```java 
// In other microservices

import com.example.common.CommonApiResponses;

@GetMapping("/users")
@ApiResponses(value = CommonApiResponses.CommonApiResponses.class) 
public List<User> getUsers() {
  // ...
}
```

The `@ApiResponses` defined in the shared library are reused in the controller methods by referring to the `CommonApiResponses` class. This avoids duplicating the common responses in every microservice. The responses can also be extended and customized as needed on a per endpoint basis.

Let me know if you have any other questions!