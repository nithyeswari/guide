# Address Parser

This document describes an address parser built with Apache Lucene.

## License

This address parser uses Apache Lucene, which is licensed under the Apache License 2.0. This is a permissive license that allows for free use, modification, and distribution.

## Java Address Parser

This is a Java-based address parser using Apache Lucene for fuzzy matching and parsing of unstructured addresses.

### `Parser.java`

```java
package com.example.address;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class AddressParserExample {

    public static void main(String[] args) {
        try {
            // 1. Initialize with a database of known addresses
            List<LuceneAddressParser.StructuredAddress> knownAddresses = createSampleAddressDatabase();
            LuceneAddressParser parser = new LuceneAddressParser(knownAddresses);
            
            // 2. Parse an unstructured address
            System.out.println("Example 1: Basic Parsing");
            String rawAddress1 = "123 Main St, Apt 4B, Springfield, IL 62701";
            LuceneAddressParser.StructuredAddress parsed1 = parser.parse(rawAddress1);
            System.out.println("Raw: " + rawAddress1);
            System.out.println("Parsed: " + parsed1);
            System.out.println("Formatted: \n" + parser.format(parsed1));
            System.out.println();
            
            // 3. Parse a messy address
            System.out.println("Example 2: Messy Address Parsing");
            String rawAddress2 = "456 Oak Avenue #201, San Francisco CA, 94107";
            LuceneAddressParser.StructuredAddress parsed2 = parser.parse(rawAddress2);
            System.out.println("Raw: " + rawAddress2);
            System.out.println("Parsed: " + parsed2);
            System.out.println("Formatted: \n" + parser.format(parsed2));
            System.out.println();
            
            // 4. Match against known addresses using fuzzy matching
            System.out.println("Example 3: Fuzzy Matching");
            String rawAddress3 = "123 Main Street, Springfield Illinois";
            System.out.println("Looking for match for: " + rawAddress3);
            LuceneAddressParser.StructuredAddress matched = parser.match(rawAddress3, 0.5f);
            if (matched != null) {
                System.out.println("Found match: " + matched);
                System.out.println("Formatted match: \n" + parser.format(matched));
            } else {
                System.out.println("No match found");
            }
            System.out.println();
            
            // 5. Handle typos with fuzzy matching
            System.out.println("Example 4: Handling Typos");
            String typoAddress = "123 Man St, Springfeld, IL";
            System.out.println("Address with typos: " + typoAddress);
            LuceneAddressParser.StructuredAddress typoMatched = parser.match(typoAddress, 0.7f);
            if (typoMatched != null) {
                System.out.println("Found match despite typos: " + typoMatched);
            } else {
                System.out.println("No match found");
            }
            
            // Clean up resources
            parser.close();
            
        } catch (IOException e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Create a sample database of known addresses
     */
    private static List<LuceneAddressParser.StructuredAddress> createSampleAddressDatabase() {
        List<LuceneAddressParser.StructuredAddress> addresses = new ArrayList<>();
        
        // Address 1
        LuceneAddressParser.StructuredAddress address1 = new LuceneAddressParser.StructuredAddress();
        address1.setStreetNumber("123");
        address1.setStreetName("Main Street");
        address1.setUnit("4B");
        address1.setCity("Springfield");
        address1.setState("IL");
        address1.setZipCode("62701");
        addresses.add(address1);
        
        // Address 2
        LuceneAddressParser.StructuredAddress address2 = new LuceneAddressParser.StructuredAddress();
        address2.setStreetNumber("456");
        address2.setStreetName("Oak Avenue");
        address2.setUnit("201");
        address2.setCity("San Francisco");
        address2.setState("CA");
        address2.setZipCode("94107");
        addresses.add(address2);
        
        return addresses;
    }
}
```

### `pom.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>address-parser</artifactId>
    <version>1.0-SNAPSHOT</version>

    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <lucene.version>8.11.2</lucene.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <!-- Apache Lucene Core -->
        <dependency>
            <groupId>org.apache.lucene</groupId>
            <artifactId>lucene-core</artifactId>
            <version>${lucene.version}</version>
        </dependency>
        
        <!-- Lucene Analyzers for text processing -->
        <dependency>
            <groupId>org.apache.lucene</groupId>
            <artifactId>lucene-analyzers-common</artifactId>
            <version>${lucene.version}</version>
        </dependency>
        
        <!-- Lucene Queries for more advanced query capabilities -->
        <dependency>
            <groupId>org.apache.lucene</groupId>
            <artifactId>lucene-queries</artifactId>
            <version>${lucene.version}</version>
        </dependency>
    </dependencies>
</project>
```

## React Address Translator

This is a React component that provides a UI for the address parser.

### `unstructured.tsx`

```tsx
import React, { useState } from 'react';

const AddressTranslator = () => {
  const [unstructuredAddress, setUnstructuredAddress] = useState('');
  const [structuredAddress, setStructuredAddress] = useState({
    street: '',
    unit: '',
    city: '',
    state: '',
    zip: '',
    country: ''
  });

  const parseAddress = (addressText) => {
    // Parsing logic here...
  };

  return (
    <div>
      <h1>Address Translator</h1>
      <textarea value={unstructuredAddress} onChange={(e) => setUnstructuredAddress(e.target.value)} />
      <button onClick={() => parseAddress(unstructuredAddress)}>Parse Address</button>
      <div>
        <h2>Structured Address</h2>
        <pre>{JSON.stringify(structuredAddress, null, 2)}</pre>
      </div>
    </div>
  );
};

export default AddressTranslator;
```