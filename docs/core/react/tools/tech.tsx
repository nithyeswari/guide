import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const App = () => {
  // Framework data
  const frameworks = [
    { name: "React", category: "Web", marketShare: 42.8 },
    { name: "React Native", category: "Mobile", marketShare: 38.6 },
    { name: "Flutter", category: "Mobile & Web", marketShare: 30.2 },
    { name: "Kotlin/Android", category: "Mobile (Android)", marketShare: 29.3 },
    { name: "Swift/UIKit", category: "Mobile (iOS)", marketShare: 24.7 },
    { name: "Angular", category: "Web", marketShare: 18.5 },
    { name: "Vue.js", category: "Web", marketShare: 15.2 },
    { name: "PWA", category: "Web & Mobile", marketShare: 12.4 },
    { name: "Others", category: "Various", marketShare: 69.1 }
  ];

  // CSV data
  const fullData = [
    { name: "React", category: "Web", marketShare: 42.8 },
    { name: "Angular", category: "Web", marketShare: 18.5 },
    { name: "Vue.js", category: "Web", marketShare: 15.2 },
    { name: "Svelte", category: "Web", marketShare: 6.3 },
    { name: "React Native", category: "Mobile", marketShare: 38.6 },
    { name: "Flutter", category: "Mobile & Web", marketShare: 30.2 },
    { name: "Swift/UIKit", category: "Mobile (iOS)", marketShare: 24.7 },
    { name: "Kotlin/Android", category: "Mobile (Android)", marketShare: 29.3 },
    { name: "Xamarin", category: "Mobile", marketShare: 6.4 },
    { name: "Ionic", category: "Mobile & Web", marketShare: 8.5 },
    { name: "Electron", category: "Desktop", marketShare: 10.2 },
    { name: "WatchOS SDK", category: "Wearable", marketShare: 5.3 },
    { name: "Wear OS", category: "Wearable", marketShare: 3.1 },
    { name: "Tizen", category: "Wearable", marketShare: 1.7 },
    { name: "Next.js", category: "Web", marketShare: 9.6 },
    { name: "WebAssembly", category: "Web", marketShare: 7.8 },
    { name: "PWA", category: "Web & Mobile", marketShare: 12.4 },
    { name: "Gatsby", category: "Web", marketShare: 3.9 },
    { name: "Nuxt.js", category: "Web", marketShare: 4.2 },
    { name: "Capacitor", category: "Mobile", marketShare: 2.1 }
  ];

  // Colors for the pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c'];
  
  // Sort frameworks by market share for better visualization
  const sortedFrameworks = [...frameworks].sort((a, b) => b.marketShare - a.marketShare);

  // Generate CSV data
  const csvData = "Framework,Category,MarketShare\n" + 
    fullData.map(item => `${item.name},${item.category},${item.marketShare}`).join('\n');

  const [activeTab, setActiveTab] = useState('chart');

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-md rounded-md">
          <p className="font-bold">{payload[0].name}</p>
          <p className="text-gray-700">Category: {payload[0].payload.category}</p>
          <p className="text-gray-700">Market Share: {payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{padding: '1rem', maxWidth: '100%'}}>
      <h1 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>Development Frameworks Market Share</h1>
      <p style={{color: '#718096', marginBottom: '1rem'}}>Visualization of market share percentages across web, mobile, and wearable development frameworks.</p>
      
      <div style={{marginBottom: '1rem', display: 'flex'}}>
        <button 
          style={{
            padding: '0.5rem 1rem', 
            backgroundColor: activeTab === 'chart' ? '#3b82f6' : '#e5e7eb',
            color: activeTab === 'chart' ? 'white' : 'black',
            borderTopLeftRadius: '0.375rem',
            borderBottomLeftRadius: '0.375rem'
          }}
          onClick={() => setActiveTab('chart')}
        >
          Pie Chart
        </button>
        <button 
          style={{
            padding: '0.5rem 1rem', 
            backgroundColor: activeTab === 'table' ? '#3b82f6' : '#e5e7eb',
            color: activeTab === 'table' ? 'white' : 'black',
            borderTopRightRadius: '0.375rem',
            borderBottomRightRadius: '0.375rem'
          }}
          onClick={() => setActiveTab('table')}
        >
          Data Table
        </button>
      </div>
      
      {activeTab === 'chart' && (
        <div style={{border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '1rem', backgroundColor: 'white'}}>
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '0.5rem'}}>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center'}}>
              {sortedFrameworks.map((entry, index) => (
                <div key={index} style={{display: 'flex', alignItems: 'center'}}>
                  <div style={{ 
                    backgroundColor: COLORS[index % COLORS.length], 
                    width: '12px', 
                    height: '12px', 
                    marginRight: '5px', 
                    borderRadius: '0.125rem' 
                  }}></div>
                  <span style={{fontSize: '0.75rem'}}>{entry.name}: {entry.marketShare}%</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={sortedFrameworks}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={130}
                fill="#8884d8"
                dataKey="marketShare"
                label={({ name, percent, cx, cy, midAngle, innerRadius, outerRadius, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 30;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text 
                      x={x} 
                      y={y} 
                      fill={COLORS[index % COLORS.length]}
                      textAnchor={x > cx ? 'start' : 'end'} 
                      dominantBaseline="central"
                      fontWeight="bold"
                    >
                      {name} ({(percent * 100).toFixed(1)}%)
                    </text>
                  );
                }}
              >
                {frameworks.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <p style={{fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem', textAlign: 'center'}}>*Market share estimates for visualization purposes (2025)</p>
        </div>
      )}
      
      {activeTab === 'table' && (
        <div style={{border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '1rem', backgroundColor: 'white', overflowX: 'auto'}}>
          <table style={{minWidth: '100%', borderCollapse: 'collapse'}}>
            <thead style={{backgroundColor: '#f9fafb'}}>
              <tr>
                <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Framework</th>
                <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Category</th>
                <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Market Share (%)</th>
              </tr>
            </thead>
            <tbody style={{backgroundColor: 'white'}}>
              {fullData.map((item, index) => (
                <tr key={index} style={{backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb', borderTop: '1px solid #e2e8f0'}}>
                  <td style={{padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', fontWeight: '500', color: '#111827'}}>{item.name}</td>
                  <td style={{padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280'}}>{item.category}</td>
                  <td style={{padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280'}}>{item.marketShare}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{marginTop: '1rem'}}>
            <h3 style={{fontWeight: '500', marginBottom: '0.5rem'}}>CSV Data:</h3>
            <pre style={{backgroundColor: '#f3f4f6', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', overflow: 'auto', maxHeight: '10rem'}}>
              {csvData}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;