# Python — Full Stack Engineer's Guide

> The most versatile language in modern engineering — from AI/ML to web backends, data pipelines, and automation

## Table of Contents

- [Why Python for Full Stack Engineers](#why-python-for-full-stack-engineers)
- [Core Language](#core-language)
- [Best Practices & Standards](#best-practices--standards)
- [Web Frameworks](#web-frameworks)
- [Data & AI/ML](#data--aiml)
- [Testing](#testing)
- [Anti-Patterns](#anti-patterns)
- [Learning Resources](#learning-resources)
- [Podcasts & YouTube](#podcasts--youtube)
- [Conferences](#conferences)
- [Essential Links](#essential-links)

---

## Why Python for Full Stack Engineers

Python is indispensable in the modern engineering landscape:

- **AI/ML & GenAI** — PyTorch, TensorFlow, LangChain, Hugging Face
- **Data engineering** — Pandas, Spark, Airflow, dbt
- **Backend APIs** — FastAPI, Django, Flask
- **Automation & scripting** — Infrastructure, DevOps, testing
- **Rapid prototyping** — Fastest path from idea to working code

## Core Language

### Fundamentals

- Dynamic typing with type hints (PEP 484)
- List comprehensions and generator expressions
- Decorators and context managers
- `*args`, `**kwargs`, unpacking
- Iterators and generators (`yield`)
- Dataclasses and `NamedTuple`
- `asyncio` for async/await concurrency
- Magic methods (`__init__`, `__repr__`, `__eq__`, etc.)

### Modern Python (3.10+)

- **Structural pattern matching** (`match/case`) — 3.10
- **Exception groups** (`ExceptionGroup`) — 3.11
- **`tomllib`** — TOML parsing in stdlib — 3.11
- **Significant performance improvements** — 3.11 (25% faster), 3.12, 3.13
- **Type parameter syntax** (`type X = ...`) — 3.12
- **Free-threaded mode** (no-GIL experimental) — 3.13
- **`t-strings`** (template strings, PEP 750) — 3.14

### Package & Environment Management

| Tool | Purpose | Notes |
|------|---------|-------|
| **uv** | Package installer & resolver | Extremely fast, replaces pip + venv + pip-tools |
| **Poetry** | Dependency management + packaging | `pyproject.toml`-based |
| **pip** + **venv** | Standard tooling | Built-in, universally supported |
| **conda** | Data science environments | Manages non-Python deps (CUDA, etc.) |
| **pyenv** | Python version management | Multiple Python versions |
| **Rye** | Project management | From the creator of Flask, uses uv |
| **Hatch** | Modern build system | Official PyPA project |

## Best Practices & Standards

### Project Structure

```
project/
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── api/                # HTTP handlers / routes
│       ├── services/           # Business logic
│       ├── repositories/       # Data access
│       ├── models/             # Domain models / schemas
│       └── core/               # Config, dependencies
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── pyproject.toml              # Project metadata & deps
├── Dockerfile
└── README.md
```

### ✅ DO

- Use **type hints** everywhere — `def get_user(id: int) -> User | None:`
- Use **`pyproject.toml`** as the single config file
- Use **`ruff`** for linting and formatting (replaces black, isort, flake8)
- Use **`mypy`** or **`pyright`** for static type checking
- Use **Pydantic** for data validation and settings management
- Use **virtual environments** — never install globally
- Follow **PEP 8** (enforced by ruff)
- Use **`dataclasses`** or **Pydantic models** over plain dicts
- Use **`pathlib`** over `os.path`
- Use **f-strings** for string formatting

### ❌ DON'T

- Don't use mutable default arguments (`def f(items=[])`)
- Don't use `import *` — always explicit imports
- Don't catch bare `except:` — always specify exception type
- Don't use `type: ignore` without a specific error code
- Don't mix `async` and sync code carelessly
- Don't use `os.system()` — use `subprocess.run()`
- Don't store secrets in code — use environment variables

### Type Hints (Modern Style)

```python
# ✅ Modern Python 3.10+ style
def process_items(items: list[str], config: dict[str, Any] | None = None) -> bool:
    ...

# ✅ Pydantic models for API schemas
from pydantic import BaseModel, Field

class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    age: int = Field(..., ge=0, le=150)
```

## Web Frameworks

| Framework | Use Case | Performance | Notes |
|-----------|----------|-------------|-------|
| **FastAPI** | Modern APIs | High (async) | Type-safe, auto OpenAPI docs, best for new projects |
| **Django** | Full-stack web | Medium | Batteries included, ORM, admin, auth |
| **Flask** | Lightweight APIs | Medium | Minimal, flexible, large ecosystem |
| **Litestar** | High-performance APIs | High (async) | FastAPI alternative with more features |
| **Django Ninja** | Django + fast APIs | High | FastAPI-style on Django |

### FastAPI Example

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel

app = FastAPI(title="User Service")

class User(BaseModel):
    id: int
    name: str
    email: str

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

### Key Libraries

- **SQLAlchemy 2.0** — ORM and database toolkit (async support)
- **Alembic** — Database migrations
- **Celery** — Distributed task queue
- **Redis (redis-py)** — Caching and message broker
- **httpx** — Async HTTP client (replaces requests for async)
- **Pydantic** — Data validation (used by FastAPI)
- **Polars** — Fast DataFrame library (alternative to Pandas)

## Data & AI/ML

### AI/ML Stack

| Library | Purpose |
|---------|---------|
| **PyTorch** | Deep learning framework (industry standard) |
| **Hugging Face Transformers** | Pre-trained models, NLP, LLMs |
| **LangChain / LlamaIndex** | LLM application frameworks |
| **scikit-learn** | Classical ML algorithms |
| **pandas / polars** | Data manipulation |
| **NumPy** | Numerical computing |
| **Jupyter** | Interactive notebooks |
| **MLflow** | ML experiment tracking |
| **Ray** | Distributed computing for ML |

### Data Engineering

| Tool | Purpose |
|------|---------|
| **Apache Airflow** | Workflow orchestration |
| **dbt** | Data transformation |
| **Apache Spark (PySpark)** | Distributed data processing |
| **Great Expectations** | Data quality validation |
| **Dagster** | Modern data orchestration |
| **Prefect** | Workflow automation |

## Testing

### Testing Stack

```python
# pytest — the standard
def test_create_user():
    user = User(name="Alice", email="alice@example.com")
    assert user.name == "Alice"

# Parametrized tests
import pytest

@pytest.mark.parametrize("input,expected", [
    ("hello", 5),
    ("", 0),
    ("world", 5),
])
def test_string_length(input: str, expected: int):
    assert len(input) == expected

# Async testing
@pytest.mark.asyncio
async def test_async_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/users/1")
        assert response.status_code == 200
```

### Tools

- **pytest** — Test framework (de facto standard)
- **pytest-asyncio** — Async test support
- **pytest-cov** — Coverage reporting
- **httpx** — Async test client for FastAPI
- **factory_boy** — Test data factories
- **Faker** — Fake data generation
- **hypothesis** — Property-based testing
- **testcontainers-python** — Integration tests with real services
- **respx** — Mock httpx requests

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| **No type hints** | Runtime errors, poor IDE support | Add type hints, use mypy/pyright |
| **God module** | 2000+ line files | Split into focused modules |
| **Dict-driven design** | `data["user"]["name"]` everywhere | Use Pydantic models or dataclasses |
| **Sync in async** | Blocking the event loop | Use `asyncio.to_thread()` for I/O |
| **No virtual env** | Dependency conflicts | Always use venv/uv/poetry |
| **requirements.txt chaos** | Unpinned, conflicting deps | Use `pyproject.toml` + lockfile |
| **Bare except** | Swallowing all errors | Catch specific exceptions |
| **Global state** | Hard to test, race conditions | Dependency injection |

---

## Learning Resources

### Books

- **"Fluent Python"** — Luciano Ramalho (2nd edition, covers 3.10+)
- **"Python Distilled"** — David Beazley
- **"Robust Python"** — Patrick Viafore (type hints and protocols)
- **"Architecture Patterns with Python"** — Harry Percival & Bob Gregory (DDD)
- **"High Performance Python"** — Micha Gorelick & Ian Ozsvald
- **"Effective Python"** — Brett Slatkin (90 specific ways)

### Online Courses & Tutorials

- [Real Python](https://realpython.com/) — Tutorials, articles, courses
- [Python Official Tutorial](https://docs.python.org/3/tutorial/)
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [Full Stack Python](https://www.fullstackpython.com/)
- [Arjan Codes](https://www.youtube.com/@ArjanCodes) — Software design in Python
- [Talk Python Training](https://training.talkpython.fm/)

### Community

- [Python Discord](https://pythondiscord.com/) — 350,000+ members
- [r/Python](https://www.reddit.com/r/Python/)
- [r/learnpython](https://www.reddit.com/r/learnpython/)
- [Python Forum](https://discuss.python.org/)
- [PyPI](https://pypi.org/) — Package index

---

## Podcasts & YouTube

### Podcasts

| Podcast | Focus | Frequency |
|---------|-------|-----------|
| [Talk Python to Me](https://talkpython.fm/) | Python ecosystem deep dives | Weekly |
| [Python Bytes](https://pythonbytes.fm/) | Python news roundup | Weekly |
| [Real Python Podcast](https://realpython.com/podcasts/rpp/) | Tutorials and interviews | Weekly |
| [The Python Show](https://www.pythonshow.com/) | Python community stories | Biweekly |
| [Podcast.__init__](https://www.pythonpodcast.com/) | Python in production | Biweekly |
| [Django Chat](https://djangochat.com/) | Django framework | Biweekly |

### YouTube Channels

| Channel | Content |
|---------|---------|
| [ArjanCodes](https://www.youtube.com/@ArjanCodes) | Software design patterns in Python |
| [mCoding](https://www.youtube.com/@mCoding) | Advanced Python internals |
| [Fireship](https://www.youtube.com/@Fireship) | 100-second explainers (Python + more) |
| [Tech With Tim](https://www.youtube.com/@TechWithTim) | Python tutorials and projects |
| [Corey Schafer](https://www.youtube.com/@coreyms) | Python fundamentals and best practices |
| [James Murphy (mCoding)](https://www.youtube.com/@mCoding) | Deep Python internals |
| [Sebastián Ramírez](https://www.youtube.com/@tiaborern) | FastAPI creator's channel |
| [sentdex](https://www.youtube.com/@sentdex) | Python for ML and finance |

### Must-Watch Talks

- "Beyond PEP 8 — Best practices for beautiful, intelligible code" — Raymond Hettinger
- "Transforming Code into Beautiful, Idiomatic Python" — Raymond Hettinger
- "Facts and Myths about Python Names and Values" — Ned Batchelder
- "Modern Python Developers Toolkit" — Sebastian Witowski

---

## Conferences

| Conference | Location | Notes |
|-----------|----------|-------|
| **PyCon US** | Pittsburgh, USA | Largest Python conference, talks on YouTube |
| **PyCon EU (EuroPython)** | Europe (rotating) | European Python community |
| **PyCon UK** | Cardiff, UK | UK Python community |
| **DjangoCon US** | USA | Django-focused |
| **DjangoCon Europe** | Europe | Django community |
| **PyData** | Global (multiple cities) | Data science + Python |
| **SciPy** | Austin, TX | Scientific Python |
| **PyCon India** | India | Growing Python community |
| **FlaskCon** | Online | Flask framework |

---

## Essential Links

### Official

- [python.org](https://www.python.org/) — Official Python website
- [Python 3 Docs](https://docs.python.org/3/) — Standard library reference
- [PEP Index](https://peps.python.org/) — Python Enhancement Proposals
- [What's New in Python](https://docs.python.org/3/whatsnew/) — Release notes
- [PyPI](https://pypi.org/) — Package index

### Style & Standards

- [PEP 8 — Style Guide](https://peps.python.org/pep-0008/)
- [PEP 484 — Type Hints](https://peps.python.org/pep-0484/)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- [Ruff — Linter & Formatter](https://docs.astral.sh/ruff/)
- [mypy Documentation](https://mypy.readthedocs.io/)

### Curated Repositories

- [awesome-python](https://github.com/vinta/awesome-python) — Curated list of Python libraries
- [python-patterns](https://github.com/faif/python-patterns) — Design patterns in Python
- [full-stack-fastapi-template](https://github.com/fastapi/full-stack-fastapi-template) — FastAPI project template
- [architecture-patterns-with-python](https://github.com/cosmicpython/book) — DDD in Python
- [best-of-python](https://github.com/ml-tooling/best-of-python) — Ranked Python packages

---

*Python's philosophy: "There should be one — and preferably only one — obvious way to do it." Use type hints, embrace the ecosystem, and let tools like ruff keep your code clean.*
