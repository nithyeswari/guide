# Scala — Full Stack Engineer's Guide

> Blending functional and object-oriented programming for type-safe, concurrent, and data-intensive systems

## Table of Contents

- [Why Scala for Full Stack Engineers](#why-scala-for-full-stack-engineers)
- [Core Language](#core-language)
- [Best Practices & Standards](#best-practices--standards)
- [Frameworks & Libraries](#frameworks--libraries)
- [Data Engineering & Streaming](#data-engineering--streaming)
- [Testing](#testing)
- [Anti-Patterns](#anti-patterns)
- [Learning Resources](#learning-resources)
- [Podcasts & YouTube](#podcasts--youtube)
- [Conferences](#conferences)
- [Essential Links](#essential-links)

---

## Why Scala for Full Stack Engineers

Scala powers some of the world's most demanding systems:

- **Big data** — Apache Spark, Kafka Streams, Flink (Scala APIs)
- **Reactive systems** — Akka/Pekko for high-concurrency actor-based systems
- **Type-safe backends** — ZIO, Cats Effect, http4s for purely functional services
- **JVM interop** — Seamlessly use all Java libraries
- **Financial systems** — Widely used in banking, fintech, and trading platforms

## Core Language

### Fundamentals

- Case classes and pattern matching
- Traits and mixins (multiple inheritance done right)
- Higher-order functions and closures
- Immutable collections by default
- `Option`, `Either`, `Try` for safe error handling
- Implicit conversions and parameters (Scala 2) / `given`/`using` (Scala 3)
- For-comprehensions (monadic composition)
- Type inference

### Scala 3 (Dotty) Features

- **`enum`** — algebraic data types made simple
- **`given` / `using`** — replaces implicits
- **Extension methods** — cleaner syntax
- **Union types** (`A | B`) and intersection types (`A & B`)
- **Opaque type aliases** — zero-cost abstractions
- **Context functions** — propagate context implicitly
- **Metaprogramming** — inline, macros, match types
- **Fewer braces** — optional braces (significant indentation)
- **`export` clauses** — selective re-export

### Build Tools

| Tool | Notes |
|------|-------|
| **sbt** | Standard Scala build tool |
| **Mill** | Simpler, faster alternative to sbt |
| **Maven/Gradle** | For mixed Java/Scala projects |
| **Scala CLI** | Quick scripts and prototyping |
| **Bloop** | Fast compilation server |

## Best Practices & Standards

### Project Structure

```
project/
├── src/
│   ├── main/
│   │   └── scala/
│   │       └── com/example/
│   │           ├── domain/       # Domain models (case classes)
│   │           ├── service/      # Business logic
│   │           ├── repository/   # Data access
│   │           ├── http/         # HTTP routes
│   │           └── Main.scala    # Entry point
│   └── test/
│       └── scala/
├── build.sbt
└── project/
    └── plugins.sbt
```

### ✅ DO

- Prefer **immutability** — `val` over `var`, immutable collections
- Use **case classes** for data, **traits** for behavior
- Use **`Option`** instead of `null`
- Use **for-comprehensions** for monadic composition
- Use **`Either[Error, A]`** for typed error handling
- Use **Scala 3** for new projects
- Use **scalafmt** for formatting
- Use **Wartremover** or **Scalafix** for linting
- Prefer **sealed traits** for exhaustive pattern matching
- Keep **effects at the edges** (pure core, effectful boundary)

### ❌ DON'T

- Don't use `null` — use `Option`
- Don't use mutable state without clear justification
- Don't overuse implicits (Scala 2) — prefer `given`/`using` (Scala 3)
- Don't use `return` — last expression is the return value
- Don't use `Any` or `AnyRef` — keep types precise
- Don't throw exceptions in pure code — use `Either` or effect types
- Don't ignore compiler warnings — enable `-Werror`

### Functional Error Handling

```scala
// ✅ Using Either for typed errors
sealed trait AppError
case class NotFound(id: String) extends AppError
case class ValidationError(msg: String) extends AppError

def findUser(id: String): Either[AppError, User] =
  repository.find(id).toRight(NotFound(id))

// ✅ For-comprehension for composing
for
  user    <- findUser(userId)
  account <- findAccount(user.accountId)
  balance <- getBalance(account)
yield balance

// ✅ ZIO style
def findUser(id: String): ZIO[UserRepo, AppError, User] =
  ZIO.serviceWithZIO[UserRepo](_.find(id))
```

## Frameworks & Libraries

### Web & HTTP

| Framework | Style | Notes |
|-----------|-------|-------|
| **http4s** | Functional (Cats Effect / ZIO) | Typelevel stack, composable |
| **ZIO HTTP** | Functional (ZIO) | ZIO-native HTTP |
| **Play Framework** | MVC | Full-stack, Akka-based |
| **Tapir** | API-first | Generates OpenAPI + server + client |
| **Akka HTTP** | Stream-based | Powerful, complex |
| **Cask** | Simple | Minimal, Li Haoyi's framework |

### Effect Systems

| Library | Philosophy |
|---------|-----------|
| **ZIO** | Opinionated, all-in-one effect system |
| **Cats Effect** | Typelevel, composable, ecosystem |
| **Monix** | Reactive streams + tasks |

### Key Libraries

- **Circe** — JSON encoding/decoding (Cats-based)
- **ZIO JSON** — JSON for ZIO ecosystem
- **Doobie** — Functional JDBC (Cats Effect)
- **Quill** — Compile-time SQL generation
- **Skunk** — Non-blocking PostgreSQL (Cats Effect)
- **fs2** — Functional streaming
- **Chimney** — Boilerplate-free data transformations
- **Refined** — Refinement types for validation

## Data Engineering & Streaming

### Spark Ecosystem

```scala
// Apache Spark — the Scala killer app
val df = spark.read.parquet("s3://data/users/")
val result = df
  .filter($"age" > 18)
  .groupBy($"country")
  .agg(count("*").as("user_count"))
  .orderBy($"user_count".desc)
```

| Tool | Purpose |
|------|---------|
| **Apache Spark** | Distributed data processing |
| **Kafka Streams** | Stream processing on Kafka |
| **Apache Flink** | Stateful stream processing |
| **Alpakka / Pekko Connectors** | Reactive integration connectors |
| **Delta Lake** | ACID transactions on data lakes |
| **Apache Beam** | Unified batch + stream |

## Testing

### Testing Stack

```scala
// ScalaTest (most popular)
class UserServiceSpec extends AnyFlatSpec with Matchers:
  "UserService" should "find existing users" in {
    val service = UserService(mockRepo)
    service.find("123") shouldBe Right(User("123", "Alice"))
  }

// ZIO Test
object UserServiceSpec extends ZIOSpecDefault:
  def spec = suite("UserService")(
    test("find existing user") {
      for
        user <- UserService.find("123")
      yield assertTrue(user.name == "Alice")
    }
  )
```

### Tools

- **ScalaTest** — Feature-rich testing framework
- **MUnit** — Lightweight, Typelevel-native
- **ZIO Test** — ZIO-native testing
- **ScalaCheck** — Property-based testing
- **Testcontainers-scala** — Integration tests with real services
- **WeaverTest** — Parallel, resource-safe testing

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| **Implicit abuse** | Hard to trace, compile-time issues | Use `given`/`using` (Scala 3), minimize scope |
| **Java-in-Scala** | Writing Java with Scala syntax | Embrace FP: immutability, case classes, `Option` |
| **Type astronautics** | Overly complex type-level code | Keep types useful, not clever |
| **Mutable state** | Race conditions, hard to reason about | Refs, STM, or effect systems |
| **Stringly-typed** | Passing raw Strings everywhere | Use newtypes, opaque types, or refined types |
| **Blocking in async** | Thread starvation | Use `IO.blocking` or dedicated thread pool |
| **God object** | Massive classes | Decompose with traits and modules |

---

## Learning Resources

### Books

- **"Programming in Scala"** — Odersky, Spoon, Venners (the definitive guide)
- **"Functional Programming in Scala"** — Chiusano & Bjarnason (Red Book, 2nd edition)
- **"Scala with Cats"** — Noel Welsh & Dave Gurnell (free online)
- **"ZIO in Action"** — Riccardo Cardin (ZIO 2)
- **"Essential Effects"** — Adam Rosien (Cats Effect)
- **"Scala Cookbook"** — Alvin Alexander (practical recipes)

### Online Courses

- [Scala Center Courses (Coursera)](https://www.coursera.org/specializations/scala) — Martin Odersky's courses
- [Rock the JVM](https://rockthejvm.com/) — Comprehensive Scala & FP courses
- [Scala Exercises](https://www.scala-exercises.org/) — Interactive learning
- [ZIO Documentation](https://zio.dev/) — Official ZIO guide
- [Typelevel Documentation](https://typelevel.org/) — Cats, http4s, fs2

### Community

- [Scala Users Forum](https://users.scala-lang.org/)
- [Scala Discord](https://discord.com/invite/scala)
- [r/scala](https://www.reddit.com/r/scala/)
- [Scaladex](https://index.scala-lang.org/) — Scala library index

---

## Podcasts & YouTube

### Podcasts

| Podcast | Focus | Frequency |
|---------|-------|-----------|
| [Scala Love](https://scala.love/) | Scala ecosystem & community | Periodic |
| [Functional Geekery](https://www.functionalgeekery.com/) | FP languages including Scala | Monthly |
| [Scala for Fun and Profit](https://scalaforprofunanity.com/) | Practical Scala | Periodic |
| [Software Engineering Daily](https://softwareengineeringdaily.com/) | Regular Scala/FP episodes | Daily |
| [CoRecursive](https://corecursive.com/) | Software stories (FP episodes) | Biweekly |

### YouTube Channels

| Channel | Content |
|---------|---------|
| [Rock the JVM](https://www.youtube.com/@rockthejvm) | Scala tutorials, Cats, ZIO |
| [Scalar Conference](https://www.youtube.com/@ScalarConference) | Conference talks |
| [Scala Days](https://www.youtube.com/@ScalaDays) | Conference talks |
| [DevInsideYou](https://www.youtube.com/@DevInsideYou) | Scala projects and sbt |
| [Ziverge](https://www.youtube.com/@ziaborern) | ZIO ecosystem talks |
| [Typelevel](https://www.youtube.com/@typelevel) | Cats, http4s, Typelevel stack |

### Must-Watch Talks

- "Plain Functional Programming" — Martin Odersky
- "The Death of Final Tagless" — John De Goes
- "Why Functional Programming Matters" — John Hughes
- "ZIO: Next-Generation Effects in Scala" — John De Goes
- "A Tour of Scala 3" — Martin Odersky

---

## Conferences

| Conference | Location | Notes |
|-----------|----------|-------|
| **Scala Days** | USA / Europe | Flagship Scala conference |
| **Scalar** | Warsaw, Poland | Central European Scala conference |
| **Scala.io** | France | French Scala community |
| **LambdaConf** | USA | Functional programming (multi-language) |
| **Functional Scala** | London | ZIO and FP ecosystem |
| **Scala Love** | Online | Virtual Scala conference |
| **NEScala** | Northeastern USA | Northeast Scala Symposium |

---

## Essential Links

### Official

- [scala-lang.org](https://www.scala-lang.org/) — Official Scala website
- [Scala 3 Documentation](https://docs.scala-lang.org/scala3/)
- [Scala API Docs](https://www.scala-lang.org/api/)
- [Scastie](https://scastie.scala-lang.org/) — Online Scala playground
- [Scaladex](https://index.scala-lang.org/) — Library index

### Style & Standards

- [Scala Style Guide](https://docs.scala-lang.org/style/)
- [Databricks Scala Style Guide](https://github.com/databricks/scala-style-guide)
- [Scalafmt](https://scalameta.org/scalafmt/) — Code formatter
- [Scalafix](https://scalacenter.github.io/scalafix/) — Rewriting & linting
- [WartRemover](https://www.wartremover.org/) — Linting for common warts

### Curated Repositories

- [awesome-scala](https://github.com/lauris/awesome-scala) — Curated Scala library list
- [scala-best-practices](https://github.com/alexandru/scala-best-practices) — Community best practices
- [scala-pet-store](https://github.com/pauljamescleary/scala-pet-store) — http4s + doobie example
- [zio-quickstart](https://github.com/zio/zio-quickstart) — ZIO starter projects
- [typelevel/toolkit](https://github.com/typelevel/toolkit) — Typelevel starter kit

---

*Scala's philosophy: "A scalable language" — from scripts to distributed systems. Embrace functional programming, lean on the type system, and let the compiler be your ally.*
