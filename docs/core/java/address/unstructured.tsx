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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sample addresses for demonstration
  const sampleAddresses = [
    "123 Main St, Apt 4B\nNew York, NY 10001",
    "456 Park Avenue South, Suite 500, San Francisco, CA 94107",
    "789 Broadway\nApt 3C\nChicago, IL 60601\nUSA",
    "1600 Pennsylvania Avenue NW, Washington, DC 20500"
  ];

  const parseAddress = (addressText) => {
    setIsLoading(true);
    setErrorMessage('');

    // Initialize empty structured address
    const result = {
      street: '',
      unit: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    };

    try {
      // Simple validation
      if (!addressText || addressText.trim() === '') {
        setErrorMessage('Please enter an address to parse');
        setIsLoading(false);
        return;
      }

      // Normalize the address text
      const normalizedText = addressText
        .replace(/\r\n/g, '\n')                // Normalize newlines
        .replace(/\n+/g, '\n')                 // Remove multiple newlines
        .trim();

      // Split address into components - either by newlines or commas
      let addressParts = [];
      if (normalizedText.includes('\n')) {
        addressParts = normalizedText.split('\n').map(part => part.trim()).filter(Boolean);
      } else {
        addressParts = normalizedText.split(',').map(part => part.trim()).filter(Boolean);
      }

      if (addressParts.length < 1) {
        setErrorMessage('Could not identify address parts');
        setIsLoading(false);
        return;
      }

      // Extract ZIP code using regex
      const zipRegex = /\b(\d{5}(?:-\d{4})?)\b/;
      let zipCodeLine = -1;

      // Find which line contains the zip code
      for (let i = 0; i < addressParts.length; i++) {
        const zipMatch = addressParts[i].match(zipRegex);
        if (zipMatch) {
          result.zip = zipMatch[1];
          zipCodeLine = i;
          break;
        }
      }

      // Extract state code - usually in the same line as the ZIP code
      if (zipCodeLine !== -1) {
        const stateRegex = /\b([A-Z]{2})\b/;
        const stateMatch = addressParts[zipCodeLine].match(stateRegex);
        
        if (stateMatch) {
          result.state = stateMatch[1];
          
          // City is typically before the state in the same line
          const beforeState = addressParts[zipCodeLine].substring(0, addressParts[zipCodeLine].indexOf(result.state)).trim();
          
          // Remove ZIP code from the city part if it exists
          result.city = beforeState.replace(zipRegex, '').trim();
          
          // Remove trailing commas
          result.city = result.city.replace(/,+$/, '').trim();
        } else {
          // No state found, assume everything before ZIP is city
          const beforeZip = addressParts[zipCodeLine].substring(0, addressParts[zipCodeLine].indexOf(result.zip)).trim();
          result.city = beforeZip.replace(/,+$/, '').trim();
        }
      } else {
        // No ZIP code found, try to find state in the last line
        const stateRegex = /\b([A-Z]{2})\b/;
        const lastLine = addressParts[addressParts.length - 1];
        const stateMatch = lastLine.match(stateRegex);
        
        if (stateMatch) {
          result.state = stateMatch[1];
          
          // City is the rest of the last line
          const beforeState = lastLine.substring(0, lastLine.indexOf(result.state)).trim();
          result.city = beforeState.replace(/,+$/, '').trim();
        } else {
          // Last resort: assume last line is city
          result.city = lastLine;
        }
      }

      // Extract street address from first line (unless it contains state or ZIP)
      const streetLine = addressParts[0];
      
      // Check if the first line has the state or ZIP
      if ((result.state && streetLine.includes(result.state)) || 
          (result.zip && streetLine.includes(result.zip))) {
        // First line has city/state/zip info, find another line for street
        if (addressParts.length > 1) {
          // Use the second line as street address
          result.street = addressParts[1];
        }
      } else {
        // First line is the street address
        result.street = streetLine;
      }

      // Look for unit/apartment information
      const unitRegexPatterns = [
        /(?:apt|apartment|unit|suite|ste)[\.:\s]+([a-z0-9-]+)/i,  // Apt 123, Suite 456
        /(?:apt|apartment|unit|suite|ste)\.?\s*([a-z0-9-]+)/i,    // Apt123, Suite456
        /#\s*([a-z0-9-]+)/i,                                      // #123
        /(?:no\.|number)\s+([a-z0-9-]+)/i                         // No. 123
      ];

      // Check each line for unit information
      for (const line of addressParts) {
        for (const pattern of unitRegexPatterns) {
          const unitMatch = line.match(pattern);
          if (unitMatch) {
            result.unit = unitMatch[1];
            
            // If the unit is in the street line, remove it
            if (line === result.street) {
              result.street = result.street.replace(unitMatch[0], '').trim();
              // Clean up any remaining artifacts like commas
              result.street = result.street.replace(/,+$/, '').trim();
            }
            break;
          }
        }
        
        // If we found a unit, no need to check other lines
        if (result.unit) break;
      }

      // Detect country
      const countryPatterns = {
        'usa': 'USA',
        'united states': 'USA',
        'united states of america': 'USA',
        'us': 'USA',
        'canada': 'Canada',
        'uk': 'United Kingdom',
        'united kingdom': 'United Kingdom',
        'australia': 'Australia'
      };

      // Check each line for country information
      for (const line of addressParts) {
        const lowerLine = line.toLowerCase();
        
        for (const [pattern, fullName] of Object.entries(countryPatterns)) {
          if (lowerLine.includes(pattern)) {
            result.country = fullName;
            break;
          }
        }
        
        // If we found a country, no need to check other lines
        if (result.country) break;
      }

      // If we have a US state but no country, assume USA
      if (result.state && !result.country) {
        result.country = 'USA';
      }

      // Clean up the results - remove any trailing commas
      Object.keys(result).forEach(key => {
        if (typeof result[key] === 'string') {
          result[key] = result[key].replace(/,+$/, '').trim();
        }
      });

      // Debug
      console.log('Parsed address:', result);
      
      // Set the results
      setStructuredAddress(result);
    } catch (error) {
      console.error('Error parsing address:', error);
      setErrorMessage('Failed to parse address: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setUnstructuredAddress(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    parseAddress(unstructuredAddress);
  };

  const handleClear = () => {
    setUnstructuredAddress('');
    setStructuredAddress({
      street: '',
      unit: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    });
    setErrorMessage('');
  };

  const loadSampleAddress = (index) => {
    setUnstructuredAddress(sampleAddresses[index]);
    parseAddress(sampleAddresses[index]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Address Translator</h1>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label htmlFor="unstructuredAddress" className="block text-sm font-medium text-gray-700 mb-2">
            Paste Unstructured Address
          </label>
          <textarea
            id="unstructuredAddress"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows="5"
            value={unstructuredAddress}
            onChange={handleInputChange}
            placeholder="123 Main St, Apt 4B&#10;Anytown, CA 12345&#10;USA"
          />
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            type="submit"
            disabled={isLoading || !unstructuredAddress}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Parse Address'}
          </button>
          
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Clear
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Try a sample address:</p>
          <div className="flex flex-wrap gap-2">
            {sampleAddresses.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => loadSampleAddress(index)}
                className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
              >
                Sample {index + 1}
              </button>
            ))}
          </div>
        </div>
        
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {errorMessage}
          </div>
        )}
      </form>
      
      <div className="bg-gray-50 p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-3">Structured Address</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
            <div className="bg-white p-2 border border-gray-300 rounded-md min-h-8">
              {structuredAddress.street}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit/Apt/Suite</label>
            <div className="bg-white p-2 border border-gray-300 rounded-md min-h-8">
              {structuredAddress.unit}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <div className="bg-white p-2 border border-gray-300 rounded-md min-h-8">
              {structuredAddress.city}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
            <div className="bg-white p-2 border border-gray-300 rounded-md min-h-8">
              {structuredAddress.state}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP/Postal Code</label>
            <div className="bg-white p-2 border border-gray-300 rounded-md min-h-8">
              {structuredAddress.zip}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <div className="bg-white p-2 border border-gray-300 rounded-md min-h-8">
              {structuredAddress.country}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-medium mb-2">How to use:</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Paste an address in any format (with commas or line breaks)</li>
          <li>Click "Parse Address" to extract the components</li>
          <li>Try the sample addresses to see examples of different formats</li>
        </ol>
      </div>
    </div>
  );
};

export default AddressTranslator;
