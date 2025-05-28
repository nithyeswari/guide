import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const MicroservicesViewer = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [filter, setFilter] = useState('');

  useEffect(() => {
    // Load either from an uploaded JSON file or use sample data
    const loadData = async () => {
      try {
        const files = await window.fs.readdir('.');
        const jsonFiles = files.filter(file => file.toLowerCase().endsWith('.json'));
        
        if (jsonFiles.length > 0) {
          const content = await window.fs.readFile(jsonFiles[0], { encoding: 'utf8' });
          const jsonData = JSON.parse(content);
          setData(jsonData);
        } else {
          // Use sample data if no JSON file is found
          setData(sampleData);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setData(sampleData);
        setError("Using sample data - no valid JSON file found");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Sample microservices architecture data
  const sampleData = {
    domains: [
      {
        name: "Finance",
        subdomains: [
          {
            name: "Accounting",
            microservices: [
              {
                name: "LedgerService",
                layers: ["UI", "API", "Service", "Data"]
              },
              {
                name: "PaymentService",
                layers: ["API", "Service", "Data"]
              }
            ]
          },
          {
            name: "Reporting",
            microservices: [
              {
                name: "AnalyticsService",
                layers: ["UI", "API", "Service", "Data"]
              }
            ]
          }
        ]
      },
      {
        name: "Customer",
        subdomains: [
          {
            name: "Profile",
            microservices: [
              {
                name: "ProfileManagement",
                layers: ["UI", "API", "Service", "Data"]
              }
            ]
          },
          {
            name: "Support",
            microservices: [
              {
                name: "TicketService",
                layers: ["UI", "API", "Service", "Data"]
              },
              {
                name: "NotificationService",
                layers: ["API", "Service"]
              }
            ]
          }
        ]
      }
    ]
  };

  // Toggle expansion state of an item
  const toggleExpand = (key) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Apply search filter
  const applyFilter = (text) => {
    setFilter(text.toLowerCase());
  };

  // Check if an item should be visible based on filter
  const isVisible = (domain, subdomain, microservice) => {
    if (!filter) return true;
    
    return domain.name.toLowerCase().includes(filter) ||
           subdomain.name.toLowerCase().includes(filter) ||
           microservice.name.toLowerCase().includes(filter) ||
           microservice.layers.some(layer => layer.toLowerCase().includes(filter));
  };

  if (loading) {
    return <div style={{ padding: "16px", textAlign: "center" }}>Loading architecture data...</div>;
  }

  // Use the data we have (either loaded or sample)
  const architectureData = data || sampleData;

  return (
    <div style={{ padding: "16px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Microservices Architecture Registry</h1>
      
      {error && (
        <div style={{ background: "#fffbeb", borderLeft: "4px solid #f59e0b", padding: "16px", marginBottom: "16px" }}>
          <p style={{ color: "#92400e" }}>{error}</p>
        </div>
      )}
      
      {/* Search filter */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search domains, services, layers..."
          style={{ width: "100%", padding: "8px", border: "1px solid #e5e7eb", borderRadius: "4px" }}
          onChange={(e) => applyFilter(e.target.value)}
        />
      </div>
      
      {/* Architecture tree */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {architectureData.domains.map(domain => {
          // Check if any subdomain or service in this domain matches the filter
          const domainVisible = domain.subdomains.some(subdomain => 
            subdomain.microservices.some(microservice => 
              isVisible(domain, subdomain, microservice)
            )
          );
          
          if (!domainVisible) return null;
          
          return (
            <div key={domain.name} style={{ border: "1px solid #e5e7eb", borderRadius: "4px", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
              {/* Domain header */}
              <div 
                style={{ 
                  background: "#eff6ff", 
                  padding: "12px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  cursor: "pointer" 
                }}
                onClick={() => toggleExpand(`domain-${domain.name}`)}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  {expandedItems[`domain-${domain.name}`] ? 
                    <ChevronDown size={20} style={{ color: "#3b82f6" }} /> : 
                    <ChevronRight size={20} style={{ color: "#3b82f6" }} />}
                  <span style={{ fontWeight: "600", marginLeft: "8px" }}>{domain.name} Domain</span>
                </div>
                <span style={{ 
                  fontSize: "14px", 
                  background: "#dbeafe", 
                  padding: "4px 8px", 
                  borderRadius: "4px" 
                }}>
                  {domain.subdomains.reduce((sum, sub) => sum + sub.microservices.length, 0)} services
                </span>
              </div>
              
              {/* Subdomains (if domain is expanded) */}
              {expandedItems[`domain-${domain.name}`] && (
                <div style={{ paddingLeft: "24px", paddingRight: "8px", paddingTop: "8px", paddingBottom: "8px" }}>
                  {domain.subdomains.map(subdomain => {
                    // Check if any service in this subdomain matches the filter
                    const subdomainVisible = subdomain.microservices.some(microservice => 
                      isVisible(domain, subdomain, microservice)
                    );
                    
                    if (!subdomainVisible) return null;
                    
                    return (
                      <div key={subdomain.name} style={{ 
                        marginBottom: "8px", 
                        borderLeft: "2px solid #bfdbfe", 
                        paddingLeft: "16px" 
                      }}>
                        {/* Subdomain header */}
                        <div 
                          style={{ 
                            background: "#ecfdf5", 
                            padding: "8px", 
                            borderRadius: "4px", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "space-between", 
                            cursor: "pointer" 
                          }}
                          onClick={() => toggleExpand(`subdomain-${domain.name}-${subdomain.name}`)}
                        >
                          <div style={{ display: "flex", alignItems: "center" }}>
                            {expandedItems[`subdomain-${domain.name}-${subdomain.name}`] ? 
                              <ChevronDown size={16} style={{ color: "#10b981" }} /> : 
                              <ChevronRight size={16} style={{ color: "#10b981" }} />}
                            <span style={{ fontWeight: "500", marginLeft: "8px" }}>{subdomain.name}</span>
                          </div>
                          <span style={{ 
                            fontSize: "12px", 
                            background: "#d1fae5", 
                            padding: "4px 8px", 
                            borderRadius: "4px" 
                          }}>
                            {subdomain.microservices.length} microservices
                          </span>
                        </div>
                        
                        {/* Microservices (if subdomain is expanded) */}
                        {expandedItems[`subdomain-${domain.name}-${subdomain.name}`] && (
                          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                            {subdomain.microservices.map(microservice => {
                              // Check if this microservice matches the filter
                              if (!isVisible(domain, subdomain, microservice)) return null;
                              
                              return (
                                <div key={microservice.name} style={{ 
                                  marginLeft: "16px", 
                                  borderLeft: "2px solid #a7f3d0", 
                                  paddingLeft: "16px" 
                                }}>
                                  {/* Microservice header */}
                                  <div 
                                    style={{ 
                                      background: "#ecfeff", 
                                      padding: "8px", 
                                      borderRadius: "4px", 
                                      display: "flex", 
                                      alignItems: "center", 
                                      justifyContent: "space-between", 
                                      cursor: "pointer" 
                                    }}
                                    onClick={() => toggleExpand(`microservice-${domain.name}-${subdomain.name}-${microservice.name}`)}
                                  >
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                      {expandedItems[`microservice-${domain.name}-${subdomain.name}-${microservice.name}`] ? 
                                        <ChevronDown size={14} style={{ color: "#06b6d4" }} /> : 
                                        <ChevronRight size={14} style={{ color: "#06b6d4" }} />}
                                      <span style={{ marginLeft: "8px" }}>{microservice.name}</span>
                                    </div>
                                    <span style={{ 
                                      fontSize: "12px", 
                                      background: "#cffafe", 
                                      padding: "4px 8px", 
                                      borderRadius: "4px" 
                                    }}>
                                      {microservice.layers.length} layers
                                    </span>
                                  </div>
                                  
                                  {/* Layers (if microservice is expanded) */}
                                  {expandedItems[`microservice-${domain.name}-${subdomain.name}-${microservice.name}`] && (
                                    <div style={{ padding: "8px", marginLeft: "24px" }}>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                        {microservice.layers.map(layer => {
                                          // Choose background color based on layer type
                                          let bgColor = "#f3f4f6"; // Default gray
                                          
                                          if (layer.toLowerCase().includes('ui')) {
                                            bgColor = "#e6f7ff"; // Light blue for UI
                                          } else if (layer.toLowerCase().includes('api')) {
                                            bgColor = "#e6fffb"; // Light cyan for API
                                          } else if (layer.toLowerCase().includes('service')) {
                                            bgColor = "#fff7e6"; // Light orange for Service
                                          } else if (layer.toLowerCase().includes('data')) {
                                            bgColor = "#fff1f0"; // Light red for Data
                                          }
                                          
                                          return (
                                            <span 
                                              key={layer} 
                                              style={{ 
                                                backgroundColor: bgColor,
                                                color: "#1f2937",
                                                padding: "4px 12px",
                                                borderRadius: "9999px",
                                                fontSize: "12px"
                                              }}
                                            >
                                              {layer}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Summary statistics */}
      <div style={{ 
        marginTop: "24px", 
        background: "#f9fafb", 
        padding: "16px", 
        borderRadius: "4px", 
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" 
      }}>
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Architecture Summary</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <p><span style={{ fontWeight: "500" }}>Domains:</span> {architectureData.domains.length}</p>
            <p><span style={{ fontWeight: "500" }}>Subdomains:</span> {architectureData.domains.reduce((sum, domain) => sum + domain.subdomains.length, 0)}</p>
          </div>
          <div>
            <p><span style={{ fontWeight: "500" }}>Microservices:</span> {architectureData.domains.reduce((sum, domain) => 
              sum + domain.subdomains.reduce((subSum, subdomain) => subSum + subdomain.microservices.length, 0), 0)}
            </p>
            <p><span style={{ fontWeight: "500" }}>Unique Layers:</span> {
              new Set(
                architectureData.domains.flatMap(domain => 
                  domain.subdomains.flatMap(subdomain => 
                    subdomain.microservices.flatMap(microservice => 
                      microservice.layers
                    )
                  )
                )
              ).size
            }</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MicroservicesViewer;
