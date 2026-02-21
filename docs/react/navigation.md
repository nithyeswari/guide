# Next Page Navigation Pattern

This repository demonstrates different patterns and implementations for determining the next page in API navigation flows. These patterns are particularly useful in scenarios like wizards, multi-step forms, and complex user journeys.

## Table of Contents
- [Overview](#overview)
- [Patterns](#patterns)
- [Implementation](#implementation)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Contributing](#contributing)

## Overview

The Next Page Navigation Pattern solves the common problem of determining where to direct users next in complex applications. It's particularly useful for:

- Multi-step wizards
- Form completion flows
- User onboarding journeys
- Dynamic workflow navigation
- Contextual user experiences

## Patterns

### 1. Rule-Based Navigation
Uses explicit rules to determine the next page based on current conditions.

```java
public class RuleBasedNavigation implements NavigationDecision {
    private List<NavigationRule> rules;

    public String determineNextPage(NavigationContext context) {
        for (NavigationRule rule : rules) {
            if (rule.matches(context)) {
                return rule.getNextPage();
            }
        }
        return null;
    }
}
```

**Use when:**
- Navigation logic is complex but well-defined
- Multiple conditions affect navigation
- Rules need frequent updates

### 2. State Machine Navigation
Treats pages as states and navigation as transitions between states.

```java
public class StateMachineNavigation implements NavigationDecision {
    private Map<String, Map<String, String>> stateTransitions;

    public String determineNextPage(NavigationContext context) {
        String currentState = context.getCurrentPage();
        String event = context.getData("event");
        return stateTransitions.get(currentState).get(event);
    }
}
```

**Use when:**
- Pages have clear, finite states
- Transitions are predictable
- Need to enforce valid navigation paths

### 3. Flow-Based Navigation
Defines predetermined sequences of pages.

```java
public class FlowBasedNavigation implements NavigationDecision {
    private Map<String, List<String>> flows;

    public String determineNextPage(NavigationContext context) {
        String flowId = context.getData("flowId");
        String currentPage = context.getCurrentPage();
        List<String> flow = flows.get(flowId);
        int currentIndex = flow.indexOf(currentPage);
        return flow.get(currentIndex + 1);
    }
}
```

**Use when:**
- Navigation follows a linear path
- Building wizards or step-by-step forms
- Need to track progress in a sequence

## Implementation

### Core Components

1. **NavigationContext**
```java
public class NavigationContext {
    private Map<String, Object> data;
    private String currentPage;
    private String userId;
    private NavigationHistory history;
}
```

2. **NavigationDecision Interface**
```java
public interface NavigationDecision {
    String determineNextPage(NavigationContext context);
}
```

3. **Navigation History**
```java
public class NavigationHistory {
    private List<String> pageHistory;
    
    public void addPage(String page) {
        pageHistory.add(page);
    }
}
```

## Usage Examples

### Rule-Based Navigation Example
```java
RuleBasedNavigation navigation = new RuleBasedNavigation();
navigation.addRule(new NavigationRule() {
    public boolean matches(NavigationContext context) {
        return context.getCurrentPage().equals("home") && 
               context.getData("userType").equals("new");
    }
    public String getNextPage() {
        return "onboarding";
    }
});

String nextPage = navigation.determineNextPage(context);
```

### State Machine Example
```java
StateMachineNavigation navigation = new StateMachineNavigation();
navigation.addTransition("home", "checkout", "cart");
navigation.addTransition("cart", "proceed", "payment");
navigation.addTransition("payment", "confirm", "confirmation");

String nextPage = navigation.determineNextPage(context);
```

### Flow-Based Example
```java
FlowBasedNavigation navigation = new FlowBasedNavigation();
navigation.defineFlow("checkout", Arrays.asList(
    "home", "cart", "payment", "confirmation"
));

String nextPage = navigation.determineNextPage(context);
```

## Best Practices

1. **Context Management**
   - Keep context immutable where possible
   - Include all necessary data for decision-making
   - Clear context between navigation sessions

2. **Error Handling**
   - Define default/fallback pages
   - Handle invalid transitions gracefully
   - Log navigation failures

3. **Performance**
   - Cache frequently used rules/paths
   - Optimize rule evaluation order
   - Minimize context size

4. **Maintenance**
   - Document navigation rules
   - Unit test navigation logic
   - Keep rule sets modular

## Common Use Cases

1. **E-commerce Checkout**
```java
navigation.defineFlow("checkout", Arrays.asList(
    "cart",
    "shipping",
    "payment",
    "review",
    "confirmation"
));
```

2. **User Onboarding**
```java
navigation.addRule(new NavigationRule() {
    public boolean matches(NavigationContext context) {
        return !context.getData("profileComplete");
    }
    public String getNextPage() {
        return "profile-setup";
    }
});
```

3. **Form Wizard**
```java
StateMachineNavigation wizard = new StateMachineNavigation();
wizard.addTransition("step1", "next", "step2");
wizard.addTransition("step2", "next", "step3");
wizard.addTransition("step2", "back", "step1");
```

## Setup

1. Add dependencies:
```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>navigation-pattern</artifactId>
    <version>1.0.0</version>
</dependency>
```

2. Initialize navigation:
```java
NavigationService service = new NavigationService(
    new RuleBasedNavigation()
);
```

3. Configure rules/flows:
```java
service.addRule(new YourNavigationRule());
```

## Testing

```java
@Test
public void testNavigation() {
    NavigationContext context = new NavigationContext("home", "user123");
    context.addData("userType", "new");
    
    String nextPage = navigation.determineNextPage(context);
    assertEquals("onboarding", nextPage);
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
