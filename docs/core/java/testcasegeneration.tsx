import React, { useState, useEffect } from 'react';
import { Download, Play, Settings, Code, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const AITestCaseGenerator = () => {
  const [selectedVulnType, setSelectedVulnType] = useState('sqli');
  const [complexity, setComplexity] = useState('medium');
  const [language, setLanguage] = useState('java');
  const [framework, setFramework] = useState('servlet');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [testCaseMetadata, setTestCaseMetadata] = useState(null);
  const [generationCount, setGenerationCount] = useState(0);

  const vulnerabilityTypes = {
    sqli: { name: 'SQL Injection', cwe: 89, description: 'Database query manipulation' },
    xss: { name: 'Cross-Site Scripting', cwe: 79, description: 'Script injection in web pages' },
    cmdi: { name: 'Command Injection', cwe: 78, description: 'OS command execution' },
    pathtraversal: { name: 'Path Traversal', cwe: 22, description: 'Directory traversal attacks' },
    ldapi: { name: 'LDAP Injection', cwe: 90, description: 'LDAP query manipulation' },
    xpath: { name: 'XPath Injection', cwe: 643, description: 'XML path query manipulation' },
    crypto: { name: 'Weak Cryptography', cwe: 327, description: 'Insecure cryptographic algorithms' },
    hash: { name: 'Weak Hashing', cwe: 328, description: 'Insecure hash functions' },
    random: { name: 'Weak Randomness', cwe: 330, description: 'Predictable random values' },
    cookie: { name: 'Insecure Cookie', cwe: 614, description: 'Missing secure cookie flags' },
    trust: { name: 'Trust Boundary Violation', cwe: 501, description: 'Data crossing trust boundaries' }
  };

  const complexityLevels = {
    simple: 'Basic vulnerability with minimal obfuscation',
    medium: 'Moderate complexity with some defensive patterns',
    complex: 'Advanced scenarios with multiple layers and edge cases'
  };

  const languages = {
    java: 'Java (Servlet)',
    python: 'Python (Flask/Django)',
    csharp: 'C# (ASP.NET)',
    javascript: 'JavaScript (Node.js)',
    php: 'PHP',
    go: 'Go'
  };

  const frameworks = {
    servlet: 'Java Servlet',
    spring: 'Spring Boot',
    flask: 'Flask',
    django: 'Django',
    aspnet: 'ASP.NET Core',
    express: 'Express.js',
    laravel: 'Laravel',
    gin: 'Gin (Go)'
  };

  // AI-powered code generation templates
  const generateTestCase = async () => {
    setIsGenerating(true);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const vuln = vulnerabilityTypes[selectedVulnType];
    const templates = getTemplatesForVulnerability(selectedVulnType, complexity, language, framework);
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    const metadata = {
      testNumber: String(generationCount + 1).padStart(5, '0'),
      category: selectedVulnType,
      vulnerability: selectedTemplate.hasVuln,
      cwe: vuln.cwe,
      complexity: complexity,
      language: language,
      framework: framework,
      description: selectedTemplate.description,
      exploitable: selectedTemplate.hasVuln,
      timestamp: new Date().toISOString()
    };
    
    setGeneratedCode(selectedTemplate.code);
    setTestCaseMetadata(metadata);
    setGenerationCount(prev => prev + 1);
    setIsGenerating(false);
  };

  const getTemplatesForVulnerability = (vulnType, complexity, language, framework) => {
    const templates = {
      sqli: [
        {
          hasVuln: true,
          description: "SQL injection via user parameter in database query",
          code: generateSQLICode(true, complexity, language)
        },
        {
          hasVuln: false,
          description: "Parameterized query preventing SQL injection",
          code: generateSQLICode(false, complexity, language)
        }
      ],
      xss: [
        {
          hasVuln: true,
          description: "Reflected XSS through unescaped user input",
          code: generateXSSCode(true, complexity, language)
        },
        {
          hasVuln: false,
          description: "Properly escaped output preventing XSS",
          code: generateXSSCode(false, complexity, language)
        }
      ],
      cmdi: [
        {
          hasVuln: true,
          description: "Command injection via unsanitized user input",
          code: generateCMDICode(true, complexity, language)
        },
        {
          hasVuln: false,
          description: "Safe command execution with input validation",
          code: generateCMDICode(false, complexity, language)
        }
      ]
    };
    
    return templates[vulnType] || templates.sqli;
  };

  const generateSQLICode = (hasVuln, complexity, language) => {
    if (language === 'java') {
      if (hasVuln) {
        return complexity === 'simple' ? `package org.owasp.benchmark.testcode;

import java.io.IOException;
import java.sql.*;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/BenchmarkTest${String(generationCount + 1).padStart(5, '0')}")
public class BenchmarkTest${String(generationCount + 1).padStart(5, '0')} extends HttpServlet {
    
    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        String param = request.getParameter("username");
        if (param == null) param = "";
        
        try {
            Connection conn = DriverManager.getConnection(
                "jdbc:hsqldb:mem:benchmark", "sa", "");
            
            // VULNERABLE: Direct string concatenation
            String sql = "SELECT * FROM users WHERE username = '" + param + "'";
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(sql);
            
            response.getWriter().println("Query executed: " + sql);
            
        } catch (SQLException e) {
            throw new ServletException(e);
        }
    }
}` : `package org.owasp.benchmark.testcode;

import java.io.IOException;
import java.sql.*;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/BenchmarkTest${String(generationCount + 1).padStart(5, '0')}")
public class BenchmarkTest${String(generationCount + 1).padStart(5, '0')} extends HttpServlet {
    
    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        String param = request.getParameter("username");
        
        // Complex obfuscation attempt
        StringBuilder query = new StringBuilder();
        String[] parts = {"SELECT * FROM users WHERE username = '", param, "'"};
        
        for (int i = 0; i < parts.length; i++) {
            query.append(parts[i]);
        }
        
        try {
            Connection conn = getDBConnection();
            Statement stmt = conn.createStatement();
            
            // Still vulnerable despite obfuscation
            ResultSet rs = stmt.executeQuery(query.toString());
            processResults(rs, response);
            
        } catch (SQLException e) {
            handleError(e, response);
        }
    }
    
    private Connection getDBConnection() throws SQLException {
        return DriverManager.getConnection("jdbc:hsqldb:mem:benchmark", "sa", "");
    }
    
    private void processResults(ResultSet rs, HttpServletResponse response) throws IOException {
        response.getWriter().println("Query processed successfully");
    }
    
    private void handleError(SQLException e, HttpServletResponse response) throws IOException {
        response.getWriter().println("Database error occurred");
    }
}`;
      } else {
        return `package org.owasp.benchmark.testcode;

import java.io.IOException;
import java.sql.*;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/BenchmarkTest${String(generationCount + 1).padStart(5, '0')}")
public class BenchmarkTest${String(generationCount + 1).padStart(5, '0')} extends HttpServlet {
    
    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        String param = request.getParameter("username");
        if (param == null) param = "";
        
        try {
            Connection conn = DriverManager.getConnection(
                "jdbc:hsqldb:mem:benchmark", "sa", "");
            
            // SAFE: Parameterized query
            String sql = "SELECT * FROM users WHERE username = ?";
            PreparedStatement pstmt = conn.prepareStatement(sql);
            pstmt.setString(1, param);
            ResultSet rs = pstmt.executeQuery();
            
            response.getWriter().println("Safe query executed");
            
        } catch (SQLException e) {
            throw new ServletException(e);
        }
    }
}`;
      }
    }
    
    // Add other language implementations here
    return "// Template for " + language + " not implemented yet";
  };

  const generateXSSCode = (hasVuln, complexity, language) => {
    if (language === 'java' && hasVuln) {
      return `package org.owasp.benchmark.testcode;

import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/BenchmarkTest${String(generationCount + 1).padStart(5, '0')}")
public class BenchmarkTest${String(generationCount + 1).padStart(5, '0')} extends HttpServlet {
    
    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        String param = request.getParameter("input");
        if (param == null) param = "";
        
        response.setContentType("text/html");
        
        // VULNERABLE: Direct output without encoding
        response.getWriter().println("<html><body>");
        response.getWriter().println("<h1>Hello " + param + "</h1>");
        response.getWriter().println("</body></html>");
    }
}`;
    } else if (language === 'java' && !hasVuln) {
      return `package org.owasp.benchmark.testcode;

import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.text.StringEscapeUtils;

@WebServlet("/BenchmarkTest${String(generationCount + 1).padStart(5, '0')}")
public class BenchmarkTest${String(generationCount + 1).padStart(5, '0')} extends HttpServlet {
    
    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        String param = request.getParameter("input");
        if (param == null) param = "";
        
        response.setContentType("text/html");
        
        // SAFE: HTML encoding prevents XSS
        String safeParam = StringEscapeUtils.escapeHtml4(param);
        response.getWriter().println("<html><body>");
        response.getWriter().println("<h1>Hello " + safeParam + "</h1>");
        response.getWriter().println("</body></html>");
    }
}`;
    }
    
    return "// XSS template for " + language + " not implemented yet";
  };

  const generateCMDICode = (hasVuln, complexity, language) => {
    if (language === 'java' && hasVuln) {
      return `package org.owasp.benchmark.testcode;

import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/BenchmarkTest${String(generationCount + 1).padStart(5, '0')}")
public class BenchmarkTest${String(generationCount + 1).padStart(5, '0')} extends HttpServlet {
    
    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        String param = request.getParameter("filename");
        if (param == null) param = "test.txt";
        
        try {
            // VULNERABLE: Direct command execution
            String command = "cat " + param;
            Process proc = Runtime.getRuntime().exec(command);
            
            response.getWriter().println("Command executed: " + command);
            
        } catch (Exception e) {
            throw new ServletException(e);
        }
    }
}`;
    } else if (language === 'java' && !hasVuln) {
      return `package org.owasp.benchmark.testcode;

import java.io.IOException;
import java.util.Arrays;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/BenchmarkTest${String(generationCount + 1).padStart(5, '0')}")
public class BenchmarkTest${String(generationCount + 1).padStart(5, '0')} extends HttpServlet {
    
    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        String param = request.getParameter("filename");
        if (param == null) param = "test.txt";
        
        // Input validation
        if (!isValidFilename(param)) {
            response.getWriter().println("Invalid filename");
            return;
        }
        
        try {
            // SAFE: Using ProcessBuilder with separate arguments
            ProcessBuilder pb = new ProcessBuilder(Arrays.asList("cat", param));
            Process proc = pb.start();
            
            response.getWriter().println("Safe command executed");
            
        } catch (Exception e) {
            throw new ServletException(e);
        }
    }
    
    private boolean isValidFilename(String filename) {
        return filename.matches("^[a-zA-Z0-9._-]+$");
    }
}`;
    }
    
    return "// Command injection template for " + language + " not implemented yet";
  };

  const downloadTestCase = () => {
    if (!generatedCode || !testCaseMetadata) return;
    
    const content = `${generatedCode}

/*
Test Case Metadata:
- Test Number: ${testCaseMetadata.testNumber}
- Category: ${testCaseMetadata.category}
- CWE: ${testCaseMetadata.cwe}
- Vulnerability: ${testCaseMetadata.vulnerability}
- Complexity: ${testCaseMetadata.complexity}
- Language: ${testCaseMetadata.language}
- Framework: ${testCaseMetadata.framework}
- Description: ${testCaseMetadata.description}
- Generated: ${testCaseMetadata.timestamp}
*/`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BenchmarkTest${testCaseMetadata.testNumber}.java`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">AI-Powered Test Case Generator</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Vulnerability Type</label>
                  <select 
                    value={selectedVulnType} 
                    onChange={(e) => setSelectedVulnType(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {Object.entries(vulnerabilityTypes).map(([key, vuln]) => (
                      <option key={key} value={key}>
                        {vuln.name} (CWE-{vuln.cwe})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    {vulnerabilityTypes[selectedVulnType].description}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Complexity Level</label>
                  <select 
                    value={complexity} 
                    onChange={(e) => setComplexity(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {Object.entries(complexityLevels).map(([key, desc]) => (
                      <option key={key} value={key}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    {complexityLevels[complexity]}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Programming Language</label>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {Object.entries(languages).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Framework</label>
                  <select 
                    value={framework} 
                    onChange={(e) => setFramework(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {Object.entries(frameworks).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={generateTestCase}
                disabled={isGenerating}
                className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Generate Test Case
                  </>
                )}
              </button>
            </div>
            
            {/* Statistics */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Generation Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Generated:</span>
                  <span className="font-bold">{generationCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Vulnerability:</span>
                  <span className="font-bold">{vulnerabilityTypes[selectedVulnType].name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target CWE:</span>
                  <span className="font-bold">CWE-{vulnerabilityTypes[selectedVulnType].cwe}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Generated Code Panel */}
          <div className="lg:col-span-2 space-y-6">
            {testCaseMetadata && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">Test Case Generated</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Test ID:</strong> BenchmarkTest{testCaseMetadata.testNumber}</div>
                  <div><strong>CWE:</strong> {testCaseMetadata.cwe}</div>
                  <div className="flex items-center gap-1">
                    <strong>Vulnerable:</strong> 
                    {testCaseMetadata.vulnerability ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {testCaseMetadata.vulnerability ? 'Yes' : 'No'}
                  </div>
                  <div><strong>Complexity:</strong> {testCaseMetadata.complexity}</div>
                </div>
                <p className="text-sm text-gray-700 mt-2">
                  <strong>Description:</strong> {testCaseMetadata.description}
                </p>
              </div>
            )}
            
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-gray-400" />
                  <h3 className="text-white font-semibold">Generated Code</h3>
                </div>
                {generatedCode && (
                  <button
                    onClick={downloadTestCase}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                )}
              </div>
              
              <div className="bg-gray-800 rounded p-4 overflow-auto max-h-96">
                <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                  {generatedCode || '// Click "Generate Test Case" to see AI-generated code here...'}
                </pre>
              </div>
            </div>
            
            {/* AI Features Info */}
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">AI Enhancement Features</h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Automatic variation generation for each vulnerability type</li>
                <li>• Context-aware code patterns based on complexity level</li>
                <li>• Multi-language support with framework-specific implementations</li>
                <li>• Balanced generation of vulnerable and safe test cases</li>
                <li>• Metadata generation for automated scoring systems</li>
                <li>• Realistic obfuscation patterns that tools should detect</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITestCaseGenerator;
