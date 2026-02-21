# User Action Recorder - Setup and Usage Guide

## Overview

The User Action Recorder is a browser-based tool that captures user interactions with a web page and automatically generates Gherkin-format feature files for Behavior-Driven Development (BDD). This helps bridge the gap between manual testing and automated test scenarios.

## Installation

### Option 1: Bookmarklet (Easiest)

1. Create a new bookmark in your browser
2. Name it "Feature Recorder"
3. Paste the following code as the URL:
   ```javascript
   javascript:(function(){const script=document.createElement('script');script.src='https://your-hosting-domain.com/action-recorder.js';document.body.appendChild(script);})();
   ```
   (You'll need to host the script file on a web server and update the URL)

### Option 2: Browser Extension

1. Package the provided JavaScript into a browser extension
2. Install the extension in your browser
3. Click the extension icon to activate the recorder on any page

### Option 3: Script Tag

Add the script directly to your testing environment:

```html
<script src="path/to/action-recorder.js"></script>
```

## Using the Recorder

1. **Setup Information**:
   - Enter a descriptive Feature Name
   - Add a Feature Description (optional, but recommended)
   - Enter a Scenario Name before recording

2. **Recording Actions**:
   - Click "Start Recording"
   - Perform the user actions you want to capture
   - Click "Stop Recording" when finished

3. **Review and Edit**:
   - Click "Show Recorded Actions" to review the captured steps
   - Each scenario automatically includes:
     - A "Given" step for the initial page state
     - "When" and "And" steps for your actions
     - A placeholder "Then" step (you'll need to edit this)

4. **Generate Feature File**:
   - Click "Generate Feature File" to create the Gherkin syntax
   - Review the output in the text area
   - Click "Copy to Clipboard" to use the feature file in your testing framework

5. **Record Additional Scenarios**:
   - Enter a new Scenario Name
   - Click "Start Recording" again
   - All scenarios will be included in the final feature file

## Example Workflow

1. Enter "User Authentication" as the Feature Name
2. Add a description:
   ```
   As a registered user
   I want to log in to my account
   So that I can access protected content
   ```
3. Enter "Successful Login" as the Scenario Name
4. Click "Start Recording"
5. Navigate to the login page
6. Enter valid credentials
7. Click the login button
8. Verify you reach the dashboard
9. Click "Stop Recording"
10. Click "Generate Feature File"

## Best Practices

- Record one complete user flow per scenario
- Keep scenarios focused on specific functionality
- Edit the final "Then" step to specify the expected outcome
- Review and edit generated steps for clarity and readability

## Limitations

- The recorder may not capture all dynamic interactions with complex UI frameworks
- Custom user actions may need manual editing in the generated feature file
- The "Then" assertion steps usually need manual adjustment to specify expected outcomes