Here is how you can stop execution of all APIs in an interceptor and navigate to a screen in React Native:

1. Set up an interceptor that gets called before each API request. For example using axios:

```js
// api.js

import axios from 'axios';

axios.interceptors.request.use(
  request => {
    
    // Logic to check if we want to stop API execution 

    return request; 
  },
  error => {
    return Promise.reject(error);
  }
);
```

2. In the interceptor, check a state variable or some other indicator if you want to stop API execution. For example:

```js 
// Some global state
let stopApis = false;

axios.interceptors.request.use(
  request => {

    if (stopApis) {
      // Stop further execution
      return; 
    }

    return request;
  }
)
```

3. Instead of allowing the API to continue, navigate to your desired screen:

```js
import { Navigation } from 'react-native-navigation';

if (stopApis) {
  Navigation.push(this.props.componentId, {
    component: {
      name: 'DesiredScreen' 
    }
  });
  
  return;
} 
```

4. You can set the `stopApis` variable to `true` somewhere in your code when you want to stop APIs from executing.

This way, whenever `stopApis` is true, the interceptor will prevent API calls and instead navigate to your provided screen.

Let me know if you have any other questions!