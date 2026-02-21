# Jetpack Compose: From Novice to Expert

A comprehensive guide to understanding Jetpack Compose best practices, principles, patterns, advantages, and disadvantages. This README is designed to help Android developers of all levels navigate the modern UI toolkit and establish industry-standard practices in their applications.

## Table of Contents

- [Introduction to Jetpack Compose](#introduction-to-jetpack-compose)
- [Core Principles](#core-principles)
- [Advantages of Jetpack Compose](#advantages-of-jetpack-compose)
- [Disadvantages and Challenges](#disadvantages-and-challenges)
- [Best Practices](#best-practices)
  - [Composable Functions](#composable-functions)
  - [State Management](#state-management)
  - [Performance Optimization](#performance-optimization)
  - [Architecture](#architecture)
  - [Navigation](#navigation)
  - [Accessibility](#accessibility)
  - [Testing](#testing)
- [Common Patterns](#common-patterns)
- [Migration Strategies](#migration-strategies)
- [Learning Resources](#learning-resources)
- [GitHub Projects and Examples](#github-projects-and-examples)
- [Community and Support](#community-and-support)

## Introduction to Jetpack Compose

Jetpack Compose is Android's modern toolkit for building native UI. It simplifies and accelerates UI development on Android with less code, powerful tools, and intuitive Kotlin APIs. Compose uses a declarative programming model where you describe your UI based on the current state, and the framework handles UI updates when the state changes.

## Core Principles

1. **Declarative UI Paradigm**: Define what your UI should look like for a given state, not how to update it.
2. **Composability**: Build complex UIs by combining smaller, reusable components.
3. **Unidirectional Data Flow**: Data flows down, events flow up.
4. **Single Source of Truth**: State should be stored in a single location and passed down to composables.
5. **State Hoisting**: Move state to the caller to make components more reusable.
6. **Immutability**: UI state should be immutable for predictable behavior.

## Advantages of Jetpack Compose

1. **Reduced Boilerplate**: Significantly less code compared to the traditional View system.
2. **Intuitive API**: The Kotlin DSL makes UI code more readable and intuitive.
3. **Real-time Preview**: See your changes in real-time with the @Preview annotation.
4. **Interoperability**: Works with existing Views and can be adopted incrementally.
5. **Animation & Theming**: Built-in support for animations and Material Design.
6. **Constraint Layout**: Native support for complex layouts.
7. **Better State Management**: Built for handling state changes efficiently.
8. **Improved Testing**: Components are more isolated and easier to test.
9. **Accessibility Support**: Built-in accessibility features like semantic properties.
10. **Cross-platform Potential**: Kotlin Multiplatform (KMP) compatibility for future-proofing.

## Disadvantages and Challenges

1. **Learning Curve**: New paradigm requires adjustment for traditional Android developers.
2. **Maturity**: Still evolving, with occasional API changes and limitations.
3. **Performance Considerations**: Poorly implemented composables can lead to recompositions and performance issues.
4. **Legacy Integration Complexity**: Some legacy features require extra work to integrate.
5. **Binary Size Increase**: Adds to app size (~1-2MB depending on usage).
6. **Documentation Gaps**: Some advanced topics have limited documentation.
7. **Third-party Component Availability**: Less third-party libraries compared to View system (though improving rapidly).
8. **Debugging Complexity**: Recomposition-related issues can be harder to debug.
9. **Memory Management**: May require more attention to prevent memory leaks.
10. **IDE Support**: Some IDE features still catching up.

## Best Practices

### Composable Functions

1. **Keep Composables Pure and Idempotent**: They should produce the same UI given the same inputs.

```kotlin
// Good
@Composable
fun UserGreeting(name: String) {
    Text("Hello, $name")
}

// Avoid
@Composable
fun UserGreeting() {
    var name by remember { mutableStateOf("") }
    // Unpredictable UI based on mutable state
    Text("Hello, $name")
}
```

2. **Use Preview for Development**:

```kotlin
@Preview(showBackground = true)
@Composable
fun UserGreetingPreview() {
    MyAppTheme {
        UserGreeting("Android")
    }
}
```

3. **Follow Naming Conventions**:
   - Composable functions should start with capital letters
   - Parameters should be descriptive and follow standard Kotlin naming

4. **Keep Composables Focused**: Each composable should do one thing well.

5. **Extract Complex Logic**: Keep business logic outside composables.

### State Management

1. **State Hoisting**: Lift state up to make components reusable.

```kotlin
// Child composable with hoisted state
@Composable
fun ExpandableCard(
    expanded: Boolean,
    onExpandClick: () -> Unit,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.clickable { onExpandClick() }
    ) {
        if (expanded) {
            content()
        }
    }
}

// Parent manages state
@Composable
fun ParentScreen() {
    var expanded by remember { mutableStateOf(false) }
    ExpandableCard(
        expanded = expanded,
        onExpandClick = { expanded = !expanded }
    ) {
        Text("Expanded content")
    }
}
```

2. **Use `remember` and `mutableStateOf` for Component-local State**:

```kotlin
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }
    Button(onClick = { count++ }) {
        Text("Count: $count")
    }
}
```

3. **Use `rememberSaveable` for State Persistence**:

```kotlin
@Composable
fun Counter() {
    var count by rememberSaveable { mutableStateOf(0) }
    Button(onClick = { count++ }) {
        Text("Count: $count")
    }
}
```

4. **Use `derivedStateOf` for Computed State**:

```kotlin
@Composable
fun FilteredList(items: List<Item>) {
    var searchQuery by remember { mutableStateOf("") }
    
    val filteredItems by remember(searchQuery, items) {
        derivedStateOf {
            items.filter { it.name.contains(searchQuery, ignoreCase = true) }
        }
    }
    
    // Use filteredItems
}
```

### Performance Optimization

1. **Minimize Recomposition Scope**:

```kotlin
// Bad - entire function recomposes when count changes
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }
    Text("Static text")  // Recomposes unnecessarily
    Text("Count: $count")
    Button(onClick = { count++ }) {
        Text("Increment")
    }
}

// Better - extract static content
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }
    StaticContent()
    CountDisplay(count)
    IncrementButton { count++ }
}

@Composable
fun StaticContent() {
    Text("Static text")  // Won't recompose
}

@Composable
fun CountDisplay(count: Int) {
    Text("Count: $count")
}

@Composable
fun IncrementButton(onIncrement: () -> Unit) {
    Button(onClick = onIncrement) {
        Text("Increment")
    }
}
```

2. **Use `key` for Stable Identity**:

```kotlin
@Composable
fun ItemList(items: List<Item>) {
    LazyColumn {
        items(
            items = items,
            key = { item -> item.id }  // Stable identity
        ) { item ->
            ItemRow(item)
        }
    }
}
```

3. **Avoid Allocations in Composables**:

```kotlin
// Bad - new lambda created on each recomposition
@Composable
fun BadExample() {
    Button(
        onClick = { doSomething() }
    ) {
        Text("Click me")
    }
}

// Better - hoist the lambda
@Composable
fun BetterExample() {
    val onClick = remember { { doSomething() } }
    Button(onClick = onClick) {
        Text("Click me")
    }
}
```

4. **Use `LaunchedEffect` for Side Effects**:

```kotlin
@Composable
fun NetworkImage(url: String) {
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }
    
    LaunchedEffect(url) {
        bitmap = loadNetworkImage(url)
    }
    
    bitmap?.let { Image(bitmap = it.asImageBitmap()) }
}
```

### Architecture

#### Basic Architecture Patterns

1. **MVVM Architecture with Compose**:
   - **ViewModel**: Manage UI state and business logic
   - **Model**: Data and business rules
   - **View/UI**: Composables that display data

2. **Use UI State Classes**:

```kotlin
data class ProfileUiState(
    val username: String = "",
    val bio: String = "",
    val isLoading: Boolean = false,
    val error: String? = null
)

class ProfileViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()
    
    fun loadProfile(userId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val profile = repository.getProfile(userId)
                _uiState.update { 
                    it.copy(
                        username = profile.name,
                        bio = profile.bio,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(error = e.message, isLoading = false)
                }
            }
        }
    }
}

@Composable
fun ProfileScreen(viewModel: ProfileViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    
    when {
        uiState.isLoading -> LoadingIndicator()
        uiState.error != null -> ErrorMessage(uiState.error!!)
        else -> ProfileContent(uiState.username, uiState.bio)
    }
}
```

3. **Separate Concerns**:
   - UI layer (composables)
   - UI logic layer (view models)
   - Domain layer (business logic)
   - Data layer (repositories, data sources)

#### Advanced Architecture Patterns

1. **MVI (Model-View-Intent) Architecture**:

MVI provides unidirectional and cyclical data flow, making state management predictable and testable.

```kotlin
// Intent (User Actions)
sealed class ProfileIntent {
    data class LoadProfile(val userId: String) : ProfileIntent()
    object RefreshProfile : ProfileIntent()
    data class UpdateBio(val newBio: String) : ProfileIntent()
}

// State
data class ProfileState(
    val userId: String = "",
    val username: String = "",
    val bio: String = "",
    val isLoading: Boolean = false,
    val error: String? = null
)

// ViewModel with MVI pattern
class ProfileViewModel(
    private val profileRepository: ProfileRepository
) : ViewModel() {
    private val _state = MutableStateFlow(ProfileState())
    val state: StateFlow<ProfileState> = _state.asStateFlow()
    
    fun processIntent(intent: ProfileIntent) {
        when (intent) {
            is ProfileIntent.LoadProfile -> loadProfile(intent.userId)
            is ProfileIntent.RefreshProfile -> refreshProfile()
            is ProfileIntent.UpdateBio -> updateBio(intent.newBio)
        }
    }
    
    private fun loadProfile(userId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, userId = userId) }
            try {
                val profile = profileRepository.getProfile(userId)
                _state.update { 
                    it.copy(
                        username = profile.name,
                        bio = profile.bio,
                        isLoading = false,
                        error = null
                    )
                }
            } catch (e: Exception) {
                _state.update { 
                    it.copy(
                        isLoading = false, 
                        error = e.message
                    )
                }
            }
        }
    }
    
    private fun refreshProfile() {
        val currentUserId = state.value.userId
        if (currentUserId.isNotEmpty()) {
            loadProfile(currentUserId)
        }
    }
    
    private fun updateBio(newBio: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                profileRepository.updateBio(state.value.userId, newBio)
                _state.update { 
                    it.copy(
                        bio = newBio,
                        isLoading = false,
                        error = null
                    )
                }
            } catch (e: Exception) {
                _state.update { 
                    it.copy(
                        isLoading = false, 
                        error = e.message
                    )
                }
            }
        }
    }
}

// Compose UI with MVI
@Composable
fun ProfileScreen(viewModel: ProfileViewModel) {
    val state by viewModel.state.collectAsState()
    
    LaunchedEffect(Unit) {
        viewModel.processIntent(ProfileIntent.LoadProfile("user123"))
    }
    
    Column {
        if (state.isLoading) {
            CircularProgressIndicator()
        }
        
        state.error?.let { error ->
            ErrorMessage(error) {
                viewModel.processIntent(ProfileIntent.RefreshProfile)
            }
        }
        
        ProfileHeader(state.username)
        
        BioSection(
            bio = state.bio,
            onBioUpdate = { newBio ->
                viewModel.processIntent(ProfileIntent.UpdateBio(newBio))
            }
        )
    }
}
```

2. **Orbit MVI Implementation**:

[Orbit MVI](https://github.com/orbit-mvi/orbit-mvi) is a popular MVI framework built specifically for Kotlin and works well with Compose.

```kotlin
// Add dependencies:
// implementation "org.orbit-mvi:orbit-core:6.0.0"
// implementation "org.orbit-mvi:orbit-viewmodel:6.0.0"
// implementation "org.orbit-mvi:orbit-compose:6.0.0"

// Define State and Intent
data class ProfileState(
    val profile: Profile? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

sealed class ProfileSideEffect {
    data class ShowToast(val message: String) : ProfileSideEffect()
    object NavigateBack : ProfileSideEffect()
}

// ViewModel with Orbit
class ProfileViewModel : ViewModel(), ContainerHost<ProfileState, ProfileSideEffect> {

    override val container = container<ProfileState, ProfileSideEffect>(ProfileState())
    
    fun loadProfile(userId: String) = intent {
        reduce { state.copy(isLoading = true, error = null) }
        
        profileRepository.getProfile(userId)
            .onSuccess { profile ->
                reduce { 
                    state.copy(
                        profile = profile,
                        isLoading = false
                    )
                }
            }
            .onFailure { error ->
                reduce { 
                    state.copy(
                        isLoading = false,
                        error = error.message
                    )
                }
                postSideEffect(ProfileSideEffect.ShowToast("Failed to load profile"))
            }
    }
    
    // More intent handlers...
}

// Compose UI with Orbit
@Composable
fun ProfileScreen(viewModel: ProfileViewModel) {
    val state = viewModel.container.stateFlow.collectAsState().value
    
    val context = LocalContext.current
    
    // Side effects handling
    LaunchedEffect(Unit) {
        viewModel.container.sideEffectFlow.collect { sideEffect ->
            when (sideEffect) {
                is ProfileSideEffect.ShowToast -> 
                    Toast.makeText(context, sideEffect.message, Toast.LENGTH_SHORT).show()
                ProfileSideEffect.NavigateBack -> 
                    // Handle navigation
            }
        }
    }
    
    // UI implementation
    ProfileContent(
        state = state,
        onRefresh = { viewModel.loadProfile(state.profile?.id ?: "") }
    )
}
```

3. **Decompose for Multi-Module Navigation and State Management**:

[Decompose](https://github.com/arkivanov/Decompose) provides component-based architecture with lifecycle-aware navigation and state preservation, essential for complex apps.

```kotlin
// Component interface
interface ProfileComponent {
    val models: Value<Model> // Decompose's Value is similar to StateFlow
    
    fun onBackClicked()
    fun onEditClicked()
    
    data class Model(
        val profile: Profile?,
        val isLoading: Boolean,
        val error: String?
    )
}

// Component implementation
class DefaultProfileComponent(
    private val componentContext: ComponentContext,
    private val profileId: String,
    private val onBack: () -> Unit,
    private val onEdit: (String) -> Unit,
    private val profileRepository: ProfileRepository
) : ProfileComponent, ComponentContext by componentContext {

    private val _models = MutableValue(ProfileComponent.Model(
        profile = null,
        isLoading = false,
        error = null
    ))
    
    override val models: Value<ProfileComponent.Model> = _models
    
    init {
        loadProfile()
    }
    
    private fun loadProfile() {
        mainScope.launch {
            _models.value = _models.value.copy(isLoading = true, error = null)
            try {
                val profile = profileRepository.getProfile(profileId)
                _models.value = _models.value.copy(
                    profile = profile,
                    isLoading = false
                )
            } catch (e: Exception) {
                _models.value = _models.value.copy(
                    isLoading = false,
                    error = e.message
                )
            }
        }
    }
    
    override fun onBackClicked() {
        onBack()
    }
    
    override fun onEditClicked() {
        models.value.profile?.let {
            onEdit(it.id)
        }
    }
}

// Compose UI
@Composable
fun ProfileContent(component: ProfileComponent) {
    val model by component.models.subscribeAsState()
    
    Column {
        TopAppBar(
            title = { Text("Profile") },
            navigationIcon = {
                IconButton(onClick = component::onBackClicked) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            },
            actions = {
                IconButton(onClick = component::onEditClicked) {
                    Icon(Icons.Default.Edit, contentDescription = "Edit")
                }
            }
        )
        
        when {
            model.isLoading -> CircularProgressIndicator()
            model.error != null -> Text("Error: ${model.error}")
            model.profile != null -> {
                val profile = model.profile!!
                Text("Name: ${profile.name}")
                Text("Bio: ${profile.bio}")
                // Other profile details...
            }
        }
    }
}
```

4. **Clean Architecture with Domain-Driven Design (DDD)**:

Implementing Clean Architecture with Compose for large enterprise applications:

```kotlin
// Domain Layer - Entities
data class User(val id: String, val name: String, val bio: String)

// Domain Layer - Use Cases
class GetUserProfileUseCase(private val userRepository: UserRepository) {
    suspend operator fun invoke(userId: String): Result<User> {
        return try {
            Result.success(userRepository.getUserById(userId))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

class UpdateUserProfileUseCase(private val userRepository: UserRepository) {
    suspend operator fun invoke(user: User): Result<Unit> {
        return try {
            Result.success(userRepository.updateUser(user))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// Presentation Layer - ViewModel
class ProfileViewModel(
    private val getUserProfileUseCase: GetUserProfileUseCase,
    private val updateUserProfileUseCase: UpdateUserProfileUseCase,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    private val userId: String = checkNotNull(savedStateHandle["userId"])
    
    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState = _uiState.asStateFlow()
    
    init {
        loadUserProfile()
    }
    
    private fun loadUserProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            getUserProfileUseCase(userId)
                .onSuccess { user ->
                    _uiState.update { 
                        it.copy(
                            user = user.toUiModel(),
                            isLoading = false,
                            error = null
                        ) 
                    }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(
                            isLoading = false,
                            error = error.toUiError()
                        ) 
                    }
                }
        }
    }
    
    fun updateUserBio(newBio: String) {
        val currentUser = uiState.value.user ?: return
        val updatedUser = currentUser.copy(bio = newBio)
        
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }
            
            updateUserProfileUseCase(updatedUser.toDomainModel())
                .onSuccess {
                    _uiState.update { 
                        it.copy(
                            user = updatedUser,
                            isSaving = false,
                            error = null
                        ) 
                    }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(
                            isSaving = false,
                            error = error.toUiError()
                        ) 
                    }
                }
        }
    }
    
    // UI Models and Mappers
    data class UserUiModel(val id: String, val name: String, val bio: String)
    data class UiError(val message: String, val code: Int = 0)
    
    private fun User.toUiModel() = UserUiModel(id, name, bio)
    private fun UserUiModel.toDomainModel() = User(id, name, bio)
    private fun Throwable.toUiError() = UiError(message ?: "Unknown error")
    
    data class ProfileUiState(
        val user: UserUiModel? = null,
        val isLoading: Boolean = false,
        val isSaving: Boolean = false,
        val error: UiError? = null
    )
}

// UI Layer - Compose
@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    ProfileScreenContent(
        uiState = uiState,
        onBioChanged = viewModel::updateUserBio
    )
}

@Composable
private fun ProfileScreenContent(
    uiState: ProfileUiState,
    onBioChanged: (String) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        when {
            uiState.isLoading -> LoadingIndicator()
            uiState.error != null -> ErrorMessage(uiState.error)
            uiState.user != null -> {
                val user = uiState.user!!
                ProfileHeader(name = user.name)
                Spacer(modifier = Modifier.height(16.dp))
                EditableBio(
                    bio = user.bio,
                    onBioChanged = onBioChanged,
                    isLoading = uiState.isSaving
                )
            }
        }
    }
}
```

5. **Modularized Architecture with Feature Modules**:

For large-scale applications, modularization with feature modules provides better separation and faster build times:

```
app/ (App module)
├── MainApplication.kt
├── MainActivity.kt
├── navigation/ (App-level navigation)
   
feature_profile/ (Feature module)
├── api/ (Public API for other modules)
│   ├── ProfileNavigator.kt (Navigation contract)
│   └── ProfileRepository.kt (Domain interface)
├── data/ (Feature-specific data implementation)
│   └── ProfileRepositoryImpl.kt
├── domain/ (Feature-specific business logic)
│   ├── model/
│   └── usecase/
├── ui/ (Compose UI)
│   ├── ProfileScreen.kt
│   └── components/

feature_settings/ (Another feature module)
└── ...

core_ui/ (Shared UI components)
└── ...

core_data/ (Shared data handling)
└── ...
```

Example of feature module encapsulation:

```kotlin
// In feature_profile/api/ProfileNavigator.kt
interface ProfileNavigator {
    fun navigateToProfile(userId: String)
    fun navigateToEditProfile(userId: String) 
}

// In app module
class AppNavigator(private val navController: NavHostController) : ProfileNavigator {
    override fun navigateToProfile(userId: String) {
        navController.navigate("profile/$userId")
    }
    
    override fun navigateToEditProfile(userId: String) {
        navController.navigate("profile/$userId/edit")
    }
}

// In app/navigation module
@Composable
fun AppNavHost(navController: NavHostController) {
    NavHost(navController, startDestination = "home") {
        composable("home") { HomeScreen() }
        
        // Profile feature navigation registration
        composable(
            "profile/{userId}",
            arguments = listOf(navArgument("userId") { type = NavType.StringType })
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: ""
            ProfileScreen(userId = userId)
        }
        
        composable(
            "profile/{userId}/edit",
            arguments = listOf(navArgument("userId") { type = NavType.StringType })
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: ""
            EditProfileScreen(userId = userId)
        }
    }
}
```

6. **Compose+Hilt DI Integration**:

Using Hilt with Compose for dependency injection:

```kotlin
// Application module
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindProfileRepository(
        impl: ProfileRepositoryImpl
    ): ProfileRepository
}

// ViewModel with Hilt
@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    private val userId: String = checkNotNull(savedStateHandle["userId"])
    // ... implementation
}

// Compose Screen with Hilt
@Composable
fun ProfileRoute(
    userId: String,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    // ... implementation
}
```

7. **Preview-First Development Pattern**:

A methodology focusing on rapid UI development using @Preview:

```kotlin
// Define component state models
data class ProfileCardState(
    val name: String,
    val bio: String,
    val imageUrl: String,
    val isVerified: Boolean
)

// Create composable with state parameter
@Composable
fun ProfileCard(
    state: ProfileCardState,
    onCardClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onCardClick),
        elevation = 4.dp
    ) {
        Row(modifier = Modifier.padding(16.dp)) {
            // Card implementation
        }
    }
}

// Create multiple previews for various states
@Preview(name = "Default Profile")
@Composable
private fun DefaultProfileCardPreview() {
    MyAppTheme {
        ProfileCard(
            state = ProfileCardState(
                name = "John Doe",
                bio = "Android Developer",
                imageUrl = "",
                isVerified = true
            ),
            onCardClick = {}
        )
    }
}

@Preview(name = "Long Content Profile")
@Composable
private fun LongContentProfileCardPreview() {
    MyAppTheme {
        ProfileCard(
            state = ProfileCardState(
                name = "Jane Smith with a very long name that might cause layout issues",
                bio = "This is a very long bio that spans multiple lines and tests how the layout handles text wrapping and overflow situations",
                imageUrl = "",
                isVerified = true
            ),
            onCardClick = {}
        )
    }
}

// Different themes/modes
@Preview(name = "Dark Mode Profile", uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun DarkModeProfileCardPreview() {
    MyAppTheme {
        ProfileCard(
            state = ProfileCardState(
                name = "Dark Mode User",
                bio = "This profile is viewed in dark mode",
                imageUrl = "",
                isVerified = true
            ),
            onCardClick = {}
        )
    }
}
```

8. **Unidirectional Data Flow with Redux**:

Using Redux pattern for state management:

```kotlin
// State
data class AppState(
    val profileState: ProfileState = ProfileState()
)

data class ProfileState(
    val userId: String = "",
    val username: String = "",
    val bio: String = "",
    val isLoading: Boolean = false,
    val error: String? = null
)

// Actions
sealed class ProfileAction {
    data class LoadProfile(val userId: String) : ProfileAction()
    data class ProfileLoaded(val username: String, val bio: String) : ProfileAction()
    data class ProfileError(val error: String) : ProfileAction()
    data class UpdateBio(val newBio: String) : ProfileAction()
    object LoadingStarted : ProfileAction()
}

// Reducer
fun profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
    return when (action) {
        is ProfileAction.LoadProfile -> state.copy(
            userId = action.userId,
            isLoading = true,
            error = null
        )
        is ProfileAction.LoadingStarted -> state.copy(
            isLoading = true,
            error = null
        )
        is ProfileAction.ProfileLoaded -> state.copy(
            username = action.username,
            bio = action.bio,
            isLoading = false,
            error = null
        )
        is ProfileAction.ProfileError -> state.copy(
            isLoading = false,
            error = action.error
        )
        is ProfileAction.UpdateBio -> state.copy(
            bio = action.newBio
        )
    }
}

// Store
class Store<S, A>(
    initialState: S,
    private val reducer: (S, A) -> S
) {
    private val _state = MutableStateFlow(initialState)
    val state: StateFlow<S> = _state.asStateFlow()
    
    fun dispatch(action: A) {
        _state.value = reducer(_state.value, action)
    }
}

// ViewModel with Redux
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository
) : ViewModel() {
    
    private val store = Store<ProfileState, ProfileAction>(
        initialState = ProfileState(),
        reducer = ::profileReducer
    )
    
    val state = store.state
    
    fun loadProfile(userId: String) {
        store.dispatch(ProfileAction.LoadProfile(userId))
        
        viewModelScope.launch {
            try {
                val profile = profileRepository.getProfile(userId)
                store.dispatch(
                    ProfileAction.ProfileLoaded(
                        username = profile.name,
                        bio = profile.bio
                    )
                )
            } catch (e: Exception) {
                store.dispatch(ProfileAction.ProfileError(e.message ?: "Unknown error"))
            }
        }
    }
    
    fun updateBio(newBio: String) {
        store.dispatch(ProfileAction.UpdateBio(newBio))
        store.dispatch(ProfileAction.LoadingStarted)
        
        viewModelScope.launch {
            try {
                profileRepository.updateBio(state.value.userId, newBio)
                // No need to dispatch ProfileLoaded as we already updated the state
                // with UpdateBio action
            } catch (e: Exception) {
                store.dispatch(ProfileAction.ProfileError(e.message ?: "Failed to update bio"))
            }
        }
    }
}


### Navigation

1. **Use the Navigation Compose Library**:

```kotlin
@Composable
fun AppNavHost(
    navController: NavHostController = rememberNavController(),
    startDestination: String = "home"
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable("home") { HomeScreen(navController) }
        composable(
            "profile/{userId}",
            arguments = listOf(navArgument("userId") { type = NavType.StringType })
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: ""
            ProfileScreen(userId, navController)
        }
    }
}
```

2. **Pass Only Simple Types as Navigation Arguments**:
   - Use String, Int, Boolean, etc.
   - For complex objects, pass IDs and retrieve the data in the destination

### Accessibility

1. **Provide Content Descriptions**:

```kotlin
Image(
    painter = painterResource(id = R.drawable.logo),
    contentDescription = "Company Logo"
)

// For decorative elements
Image(
    painter = painterResource(id = R.drawable.divider),
    contentDescription = null
)
```

2. **Use Semantic Properties**:

```kotlin
Text(
    text = "Important notice",
    style = MaterialTheme.typography.h1,
    modifier = Modifier.semantics { heading() }
)

Button(
    onClick = { /* action */ },
    modifier = Modifier.semantics { 
        contentDescription = "Submit form"
        role = Role.Button
    }
) {
    Text("Submit")
}
```

3. **Support Dynamic Text Sizing**:

```kotlin
Text(
    text = "Scalable text",
    style = MaterialTheme.typography.body1,
    fontSize = TextUnit.Sp(16)  // Will scale with user's settings
)
```

### Testing

1. **Create Testable Composables**:
   - Extract state management to parent composables
   - Pass callbacks instead of direct actions

2. **Write UI Tests**:

```kotlin
@Test
fun counterIncrementsOnButtonClick() {
    composeTestRule.setContent {
        Counter()
    }
    
    composeTestRule.onNodeWithText("Count: 0").assertExists()
    composeTestRule.onNodeWithText("Increment").performClick()
    composeTestRule.onNodeWithText("Count: 1").assertExists()
}
```

3. **Use Semantic Tags for Testing**:

```kotlin
@Composable
fun LoginButton(onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.testTag("login_button")
    ) {
        Text("Login")
    }
}

// In tests
composeTestRule.onNodeWithTag("login_button").performClick()
```

## Advanced Architecture Patterns (continued)

9. **Multiplatform Architecture with Kotlin Multiplatform (KMP)**:

Jetpack Compose is also available for desktop (Compose for Desktop) and the web (Compose for Web). KMP allows sharing code across platforms:

```kotlin
// In shared module (common code)
expect class PlatformSpecificProfileRepository() {
    suspend fun getProfile(userId: String): Profile
    suspend fun updateProfile(profile: Profile)
}

// In androidMain
actual class PlatformSpecificProfileRepository {
    private val apiService = retrofit.create(ProfileApiService::class.java)
    
    actual suspend fun getProfile(userId: String): Profile {
        return apiService.getProfile(userId).toDomain()
    }
    
    actual suspend fun updateProfile(profile: Profile) {
        apiService.updateProfile(profile.toDto())
    }
}

// Shared ViewModel that works across platforms
class SharedProfileViewModel(
    private val repository: PlatformSpecificProfileRepository
) {
    private val _state = MutableStateFlow(ProfileState())
    val state = _state.asStateFlow()
    
    // Common business logic for all platforms
}

// Platform-specific UI in androidMain
@Composable
fun ProfileScreen(viewModel: SharedProfileViewModel) {
    // Android-specific implementation using the shared ViewModel
}

// Platform-specific UI in desktopMain
@Composable
fun ProfileScreen(viewModel: SharedProfileViewModel) {
    // Desktop-specific implementation using the same shared ViewModel
}
```

10. **Composable Architecture Pattern** (Inspired by Swift's Point-Free approach):

A unified state management approach combining the best of MVI and Redux:

```kotlin
// The State-Action-Environment pattern
data class ProfileState(
    val profile: Profile? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

sealed class ProfileAction {
    data class LoadProfile(val id: String) : ProfileAction()
    data class ProfileLoaded(val profile: Profile) : ProfileAction()
    data class ProfileFailed(val error: String) : ProfileAction()
    data class UpdateBio(val newBio: String) : ProfileAction()
}

class ProfileEnvironment(
    val profileRepository: ProfileRepository,
    val mainDispatcher: CoroutineDispatcher,
    val ioDispatcher: CoroutineDispatcher
)

// The reducer defines how state changes for each action
typealias Reducer<State, Action, Environment> = (State, Action, Environment) -> Pair<State, Effect<Action>>

// Effect represents side effects that can produce new actions
sealed class Effect<out A> {
    object None : Effect<Nothing>()
    data class Action<A>(val action: A) : Effect<A>()
    data class Async<A>(val block: suspend () -> A) : Effect<A>()
}

val profileReducer: Reducer<ProfileState, ProfileAction, ProfileEnvironment> = { state, action, environment ->
    when (action) {
        is ProfileAction.LoadProfile -> {
            val newState = state.copy(isLoading = true, error = null)
            val effect = Effect.Async<ProfileAction> {
                try {
                    val profile = environment.profileRepository.getProfile(action.id)
                    ProfileAction.ProfileLoaded(profile)
                } catch (e: Exception) {
                    ProfileAction.ProfileFailed(e.message ?: "Unknown error")
                }
            }
            newState to effect
        }
        is ProfileAction.ProfileLoaded -> {
            val newState = state.copy(profile = action.profile, isLoading = false)
            newState to Effect.None
        }
        is ProfileAction.ProfileFailed -> {
            val newState = state.copy(error = action.error, isLoading = false)
            newState to Effect.None
        }
        is ProfileAction.UpdateBio -> {
            val currentProfile = state.profile ?: return state to Effect.None
            val updatedProfile = currentProfile.copy(bio = action.newBio)
            
            val newState = state.copy(profile = updatedProfile)
            val effect = Effect.Async<ProfileAction> {
                try {
                    environment.profileRepository.updateProfile(updatedProfile)
                    ProfileAction.ProfileLoaded(updatedProfile)
                } catch (e: Exception) {
                    ProfileAction.ProfileFailed(e.message ?: "Failed to update bio")
                }
            }
            newState to effect
        }
    }
}

// The Store handles state management and side effects
class Store<S, A, E>(
    initialState: S,
    private val reducer: Reducer<S, A, E>,
    private val environment: E,
    private val mainDispatcher: CoroutineDispatcher
) {
    private val _state = MutableStateFlow(initialState)
    val state: StateFlow<S> = _state.asStateFlow()
    
    fun send(action: A) {
        val (newState, effect) = reducer(_state

```kotlin
@Composable
fun StandardScreen(
    title: String,
    onBackPressed: () -> Unit,
    content: @Composable () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = {
                    IconButton(onClick = onBackPressed) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            content()
        }
    }
}
```

### 2. State Holder Pattern

```kotlin
// State holder class
class CounterState(initial: Int = 0) {
    var count by mutableStateOf(initial)
        private set
    
    fun increment() {
        count++
    }
    
    fun decrement() {
        if (count > 0) count--
    }
}

// In composable
@Composable
fun CounterScreen() {
    val counterState = remember { CounterState() }
    
    Column {
        Text("Count: ${counterState.count}")
        Row {
            Button(onClick = { counterState.decrement() }) {
                Text("-")
            }
            Button(onClick = { counterState.increment() }) {
                Text("+")
            }
        }
    }
}
```

### 3. Slot-based API Pattern

```kotlin
@Composable
fun Card(
    modifier: Modifier = Modifier,
    header: @Composable () -> Unit,
    content: @Composable () -> Unit,
    footer: @Composable () -> Unit = {}
) {
    Column(modifier = modifier.border(1.dp, Color.Gray, RoundedCornerShape(8.dp))) {
        Box(Modifier.padding(16.dp)) {
            header()
        }
        Divider()
        Box(Modifier.padding(16.dp)) {
            content()
        }
        if (footer != {}) {
            Divider()
            Box(Modifier.padding(16.dp)) {
                footer()
            }
        }
    }
}

// Usage
Card(
    header = { Text("Card Title", style = MaterialTheme.typography.h6) },
    content = { Text("This is the card content") },
    footer = { Text("Footer text", style = MaterialTheme.typography.caption) }
)
```

### 4. Side Effect Patterns

```kotlin
@Composable
fun NetworkImage(url: String) {
    var image by remember { mutableStateOf<ImageBitmap?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    
    // One-time side effect keyed on URL
    LaunchedEffect(url) {
        isLoading = true
        error = null
        try {
            val bitmap = withContext(Dispatchers.IO) {
                loadNetworkImage(url)
            }
            image = bitmap
            isLoading = false
        } catch (e: Exception) {
            error = e.message
            isLoading = false
        }
    }
    
    Box(Modifier.size(200.dp)) {
        when {
            isLoading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
            error != null -> Text("Error: $error")
            image != null -> Image(bitmap = image!!, contentDescription = "Network image")
        }
    }
}
```

## Migration Strategies

### 1. Incremental Adoption

1. **Start with New Screens**: Apply Compose to new features first
2. **ComposeView in XML**: Use `ComposeView` to embed Compose in existing XML layouts
3. **Hybrid Approach**: Gradually replace Views with Composables

```kotlin
// In an existing Activity or Fragment
val composeView = ComposeView(context).apply {
    setContent {
        MaterialTheme {
            MyComposeUI()
        }
    }
}
viewGroup.addView(composeView)
```

### 2. Interoperability

1. **AndroidView**: Embed existing Views in Compose

```kotlin
@Composable
fun MapView(modifier: Modifier = Modifier) {
    AndroidView(
        factory = { context ->
            MapView(context).apply {
                // Initialize the map
            }
        },
        update = { view ->
            // Update the view
        },
        modifier = modifier
    )
}
```

2. **ViewCompositionStrategy**: Control composable lifecycle

```kotlin
composeView.setViewCompositionStrategy(
    ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
)
```

## Learning Resources

### Official Documentation
- [Jetpack Compose Documentation](https://developer.android.com/jetpack/compose)
- [Compose Pathway](https://developer.android.com/courses/pathways/compose)
- [Compose Samples](https://github.com/android/compose-samples)
- [Compose UI Codelab](https://developer.android.com/codelabs/jetpack-compose-basics)

### Books
- "Jetpack Compose by Tutorials" by raywenderlich.com
- "Jetpack Compose Essentials" by Neil Smyth
- "Modern Android App Development with Jetpack Compose" by Alistair Symon

### Courses
- [Developing Android Apps with Compose](https://developer.android.com/courses/android-basics-compose/course)
- [Jetpack Compose for Android Developers](https://www.udacity.com/course/android-basics-compose--ud883)
- [Compose for Existing Android Developers](https://developer.android.com/courses/android-compose-codelabs/course)

### Blogs and Articles
- [Medium Jetpack Compose Tag](https://medium.com/tag/jetpack-compose)
- [Compose Academy](https://compose.academy/)
- [Joe Birch's Blog](https://joebirch.co/android/exploring-jetpack-compose/)
- [ProAndroidDev](https://proandroiddev.com/tagged/jetpack-compose)

### Videos
- [Compose Livestreams](https://www.youtube.com/playlist?list=PLWz5rJ2EKKc-L6UBGpOXT0XVqajPc4RVE)
- [Android Developers YouTube Channel](https://www.youtube.com/c/AndroidDevelopers/search?query=compose)
- [Philipp Lackner's Compose Playlist](https://www.youtube.com/playlist?list=PLQkwcJG4YTCT1qvisQUdWjUgDkAe6pk-X)

## GitHub Projects and Examples

### Official Examples
- [Compose Samples](https://github.com/android/compose-samples)
- [Now in Android App](https://github.com/android/nowinandroid)
- [Jetpack Compose Playground](https://github.com/Foso/Jetpack-Compose-Playground)

### Reference Projects
- [ComposeCookBook](https://github.com/Gurupreet/ComposeCookBook)
- [JetNews](https://github.com/android/compose-samples/tree/main/JetNews)
- [Tivi](https://github.com/chrisbanes/tivi)
- [Jetcaster](https://github.com/android/compose-samples/tree/main/Jetcaster)
- [Owl](https://github.com/android/compose-samples/tree/main/Owl)

### UI Component Libraries
- [Accompanist](https://github.com/google/accompanist)
- [Compose Material Components](https://github.com/krottv/compose-ui-kit)
- [Compose Calendar](https://github.com/kizitonwose/Calendar)
- [Landscapist](https://github.com/skydoves/landscapist)

### Architecture Examples
- [Architecture Samples](https://github.com/android/architecture-samples)
- [MVI Orbit](https://github.com/orbit-mvi/orbit-mvi)
- [Decompose](https://github.com/arkivanov/Decompose)

## Community and Support

### Communities
- [Kotlin Slack #compose Channel](https://kotlinlang.slack.com/archives/CJLTWPH7S)
- [Android Dev Subreddit](https://www.reddit.com/r/androiddev/)
- [Stack Overflow [android-jetpack-compose]](https://stackoverflow.com/questions/tagged/android-jetpack-compose)

### Regular Events
- Android Dev Summit
- Google I/O
- Droidcon
- KotlinConf

---

## Contribution Guidelines

If you'd like to contribute to this guide:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-addition`)
3. Commit your changes (`git commit -m 'Add some amazing content'`)
4. Push to the branch (`git push origin feature/amazing-addition`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Remember**: Jetpack Compose is evolving rapidly. Always check the official documentation for the most up-to-date information.