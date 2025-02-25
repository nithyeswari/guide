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
        
        // Address 3
        LuceneAddressParser.StructuredAddress address3 = new LuceneAddressParser.StructuredAddress();
        address3.setStreetNumber("789");
        address3.setStreetName("Broadway");
        address3.setCity("New York");
        address3.setState("NY");
        address3.setZipCode("10001");
        addresses.add(address3);
        
        // Address 4
        LuceneAddressParser.StructuredAddress address4 = new LuceneAddressParser.StructuredAddress();
        address4.setStreetNumber("1600");
        address4.setStreetName("Pennsylvania Avenue NW");
        address4.setCity("Washington");
        address4.setState("DC");
        address4.setZipCode("20500");
        addresses.add(address4);
        
        // Address 5
        LuceneAddressParser.StructuredAddress address5 = new LuceneAddressParser.StructuredAddress();
        address5.setStreetNumber("350");
        address5.setStreetName("Fifth Avenue");
        address5.setCity("New York");
        address5.setState("NY");
        address5.setZipCode("10118");
        addresses.add(address5);
        
        return addresses;
    }
}