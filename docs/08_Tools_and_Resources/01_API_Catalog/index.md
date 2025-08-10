# API Catalog

This document describes an API catalog built with React.

## Overview

An API catalog is a tool for discovering and understanding the APIs available in an organization. This implementation provides a searchable and browsable catalog of APIs, with details about their endpoints, parameters, and responses.

## Components

### `ApiCatalog.tsx`

This is the main component for the API catalog. It displays a list of APIs and allows users to search and expand them to see more details.

```tsx
import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const ApiCatalog = () => {
  // ... (rest of the content from index.html)
};

export default ApiCatalog;
```

### `ApiCatalogUpload.tsx`

This component allows users to upload an Excel file to populate the API catalog.

```tsx
import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ExternalLink, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const ApiCatalogUpload = () => {
  // ... (rest of the content from upload.html)
};

export default ApiCatalogUpload;
```
