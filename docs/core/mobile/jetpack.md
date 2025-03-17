<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- Background -->
  <rect width="800" height="600" fill="#f5f5f5"/>
  
  <!-- Title -->
  <text x="400" y="40" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle">Jetpack Compose Architecture on Android</text>
  
  <!-- Layers -->
  <g>
    <!-- Application Layer -->
    <rect x="50" y="80" width="700" height="120" rx="10" fill="#3DDC84" opacity="0.7"/>
    <text x="400" y="105" font-family="Arial" font-size="18" font-weight="bold" text-anchor="middle">Application Layer (Kotlin)</text>
    
    <rect x="80" y="120" width="150" height="60" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="155" y="148" font-family="Arial" font-size="14" text-anchor="middle">@Composable</text>
    <text x="155" y="168" font-family="Arial" font-size="14" text-anchor="middle">Functions</text>
    
    <rect x="270" y="120" width="150" height="60" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="345" y="148" font-family="Arial" font-size="14" text-anchor="middle">State Management</text>
    <text x="345" y="168" font-family="Arial" font-size="12" text-anchor="middle">(MutableState, ViewModel)</text>
    
    <rect x="460" y="120" width="150" height="60" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="535" y="148" font-family="Arial" font-size="14" text-anchor="middle">Side Effects</text>
    <text x="535" y="168" font-family="Arial" font-size="12" text-anchor="middle">(LaunchedEffect, etc.)</text>
    
    <!-- Compiler Layer -->
    <rect x="50" y="220" width="700" height="100" rx="10" fill="#6200EE" opacity="0.7"/>
    <text x="400" y="245" font-family="Arial" font-size="18" font-weight="bold" text-anchor="middle" fill="white">Kotlin Compiler Plugin Layer</text>
    
    <rect x="80" y="260" width="200" height="40" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="180" y="285" font-family="Arial" font-size="14" text-anchor="middle">Composable Transformation</text>
    
    <rect x="320" y="260" width="200" height="40" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="420" y="285" font-family="Arial" font-size="14" text-anchor="middle">Stability Analysis</text>
    
    <rect x="560" y="260" width="140" height="40" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="630" y="285" font-family="Arial" font-size="14" text-anchor="middle">Code Generation</text>
    
    <!-- Runtime Layer -->
    <rect x="50" y="340" width="700" height="120" rx="10" fill="#03DAC6" opacity="0.7"/>
    <text x="400" y="365" font-family="Arial" font-size="18" font-weight="bold" text-anchor="middle">Compose Runtime Layer</text>
    
    <rect x="80" y="380" width="130" height="60" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="145" y="408" font-family="Arial" font-size="14" text-anchor="middle">Composition</text>
    <text x="145" y="428" font-family="Arial" font-size="12" text-anchor="middle">(Component Tree)</text>
    
    <rect x="235" y="380" width="130" height="60" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="300" y="408" font-family="Arial" font-size="14" text-anchor="middle">Layout System</text>
    <text x="300" y="428" font-family="Arial" font-size="12" text-anchor="middle">(Single-pass Layout)</text>
    
    <rect x="390" y="380" width="130" height="60" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="455" y="408" font-family="Arial" font-size="14" text-anchor="middle">Recomposition</text>
    <text x="455" y="428" font-family="Arial" font-size="12" text-anchor="middle">(Smart Updates)</text>
    
    <rect x="545" y="380" width="130" height="60" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="610" y="408" font-family="Arial" font-size="14" text-anchor="middle">State Tracking</text>
    <text x="610" y="428" font-family="Arial" font-size="12" text-anchor="middle">(Snapshots)</text>
    
    <!-- Android Layer -->
    <rect x="50" y="480" width="700" height="80" rx="10" fill="#9e9ac8" opacity="0.7"/>
    <text x="400" y="505" font-family="Arial" font-size="18" font-weight="bold" text-anchor="middle">Android Platform Layer</text>
    
    <rect x="100" y="520" width="150" height="30" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="175" y="540" font-family="Arial" font-size="14" text-anchor="middle">AndroidComposeView</text>
    
    <rect x="300" y="520" width="150" height="30" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="375" y="540" font-family="Arial" font-size="14" text-anchor="middle">Android UI Thread</text>
    
    <rect x="500" y="520" width="150" height="30" rx="5" fill="#ffffff" stroke="#000000"/>
    <text x="575" y="540" font-family="Arial" font-size="14" text-anchor="middle">Native Android APIs</text>
  </g>
  
  <!-- Arrows -->
  <g fill="none" stroke="#000000" stroke-width="2">
    <!-- App Layer to Compiler -->
    <path d="M 155 180 L 155 240" marker-end="url(#arrowhead)"/>
    <path d="M 345 180 L 345 240" marker-end="url(#arrowhead)"/>
    <path d="M 535 180 L 535 240" marker-end="url(#arrowhead)"/>
    
    <!-- Compiler to Runtime -->
    <path d="M 180 300 L 180 380" marker-end="url(#arrowhead)"/>
    <path d="M 420 300 L 420 380" marker-end="url(#arrowhead)"/>
    <path d="M 630 300 L 630 380" marker-end="url(#arrowhead)"/>
    
    <!-- Runtime to Android -->
    <path d="M 145 440 L 145 500 L 175 500 L 175 520" marker-end="url(#arrowhead)"/>
    <path d="M 300 440 L 300 500 L 375 500 L 375 520" marker-end="url(#arrowhead)"/>
    <path d="M 455 440 L 455 500 L 375 500" marker-end="url(#arrowhead)"/>
    <path d="M 610 440 L 610 500 L 575 500 L 575 520" marker-end="url(#arrowhead)"/>
    
    <!-- Horizontal connections in Runtime Layer -->
    <path d="M 210 410 L 235 410"/>
    <path d="M 365 410 L 390 410"/>
    <path d="M 520 410 L 545 410"/>
  </g>
  
  <!-- Arrowhead marker -->
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" />
    </marker>
  </defs>
  
  <!-- Annotations -->
  <g font-family="Arial" font-size="12" fill="#555555">
    <text x="100" y="210" text-anchor="middle">Define UI</text>
    <text x="390" y="210" text-anchor="middle">Manage State</text>
    <text x="580" y="210" text-anchor="middle">Handle Lifecycle</text>
    <text x="100" y="330" text-anchor="middle">Transform</text>
    <text x="420" y="330" text-anchor="middle">Optimize</text>
    <text x="680" y="330" text-anchor="middle">Generate</text>
    <text x="70" y="470" text-anchor="middle">Build</text>
    <text x="310" y="470" text-anchor="middle">Measure</text>
    <text x="460" y="470" text-anchor="middle">Update</text>
    <text x="640" y="470" text-anchor="middle">Track</text>
  </g>
</svg>