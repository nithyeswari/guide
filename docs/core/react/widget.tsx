# Creating React Native Widgets for Android and iOS

## Overview
React Native doesn't provide direct widget support, so we'll need to create native implementations and bridge them with React Native. Here's a comprehensive guide for both platforms.

## iOS Widget Implementation

### 1. Create Widget Extension
1. Open Xcode and select your React Native project
2. File > New > Target
3. Choose "Widget Extension"
4. Configure your widget settings

### 2. Create Widget Structure
```swift
import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry] = []
        let currentDate = Date()
        
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate)
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
}

struct WidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        Text(entry.date, style: .time)
    }
}

@main
struct MyWidget: Widget {
    let kind: String = "MyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WidgetEntryView(entry: entry)
        }
        .configurationDisplayName("My Widget")
        .description("Widget Description")
        .supportedFamilies([.systemSmall])
    }
}
```

### 3. Share Data with Main App
Create an App Group:
1. Enable App Groups in your main app and widget extension capabilities
2. Create a shared UserDefaults container:

```swift
let sharedDefaults = UserDefaults(suiteName: "group.com.yourapp.widget")
```

## Android Widget Implementation

### 1. Create Widget Provider
Create a new Kotlin file for your widget provider:

```kotlin
class MyWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
```

### 2. Create Widget Layout
Create `res/layout/widget_layout.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="8dp">

    <TextView
        android:id="@+id/widget_text"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Widget Text" />

</LinearLayout>
```

### 3. Define Widget in Manifest
Add to `AndroidManifest.xml`:

```xml
<receiver android:name=".MyWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_info" />
</receiver>
```

### 4. Create Widget Info XML
Create `res/xml/widget_info.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="40dp"
    android:minHeight="40dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_layout"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>
```

## Bridge with React Native

### 1. Create Native Modules
For iOS (`WidgetModule.swift`):

```swift
@objc(WidgetModule)
class WidgetModule: NSObject {
    @objc
    func updateWidget(_ data: NSDictionary) {
        let sharedDefaults = UserDefaults(suiteName: "group.com.yourapp.widget")
        sharedDefaults?.set(data, forKey: "widgetData")
        WidgetCenter.shared.reloadAllTimelines()
    }
}
```

For Android (`WidgetModule.kt`):

```kotlin
class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "WidgetModule"

    @ReactMethod
    fun updateWidget(data: ReadableMap) {
        val context = reactApplicationContext
        val intent = Intent(context, MyWidgetProvider::class.java)
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        context.sendBroadcast(intent)
    }
}
```

### 2. Use in React Native
```javascript
import { NativeModules } from 'react-native';

const { WidgetModule } = NativeModules;

// Update widget data
const updateWidget = (data) => {
  WidgetModule.updateWidget(data);
};
```

## Best Practices

1. **Performance**
   - Keep widget updates minimal and efficient
   - Use appropriate update intervals
   - Handle background data fetching carefully

2. **Design**
   - Follow platform-specific widget design guidelines
   - Consider different widget sizes
   - Maintain consistency with your main app's design

3. **Data Management**
   - Use appropriate data sharing mechanisms
   - Handle offline scenarios
   - Implement proper error handling

4. **Testing**
   - Test on different device sizes
   - Verify background updates
   - Check memory usage

## Common Issues and Solutions

1. **Widget Not Updating**
   - Verify update intervals
   - Check background refresh settings
   - Validate data sharing implementation

2. **Memory Issues**
   - Optimize image loading
   - Minimize network calls
   - Clean up resources properly

3. **Layout Problems**
   - Test different widget sizes
   - Handle edge cases for text overflow
   - Consider device-specific layouts

## Debugging Tips

1. Use platform-specific debugging tools
2. Implement proper logging
3. Test on multiple devices
4. Monitor memory and battery usage
