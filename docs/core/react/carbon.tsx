import React, { useState } from 'react';

const GreenSoftwareMaturityMatrix = () => {
  // Define maturity categories
  const categories = [
    {
      name: "Energy Efficiency",
      description: "How efficiently the application uses energy resources",
      levels: [
        { level: 1, description: "No energy efficiency considerations in development" },
        { level: 2, description: "Basic energy profiling performed occasionally" },
        { level: 3, description: "Regular energy profiling and some optimization" },
        { level: 4, description: "Comprehensive energy optimization and monitoring" },
        { level: 5, description: "Advanced energy efficiency is a core design principle" }
      ]
    },
    {
      name: "Hardware Efficiency",
      description: "How efficiently the application uses hardware resources",
      levels: [
        { level: 1, description: "Excessive hardware resources required" },
        { level: 2, description: "Basic consideration of hardware requirements" },
        { level: 3, description: "Regular hardware utilization monitoring" },
        { level: 4, description: "Optimized for minimal hardware footprint" },
        { level: 5, description: "Dynamically adjusts resource usage based on need" }
      ]
    },
    {
      name: "Carbon Awareness",
      description: "Consideration of carbon intensity in application operations",
      levels: [
        { level: 1, description: "No carbon awareness" },
        { level: 2, description: "Basic understanding of carbon impact" },
        { level: 3, description: "Some decisions consider carbon intensity" },
        { level: 4, description: "Most operations consider carbon intensity" },
        { level: 5, description: "Fully carbon-aware with dynamic adjustments" }
      ]
    },
    {
      name: "Measurement & Monitoring",
      description: "Tools and processes to measure environmental impact",
      levels: [
        { level: 1, description: "No environmental metrics tracked" },
        { level: 2, description: "Basic environmental metrics tracked manually" },
        { level: 3, description: "Regular monitoring of key environmental metrics" },
        { level: 4, description: "Comprehensive dashboards and alerts" },
        { level: 5, description: "Advanced impact modeling and predictive analytics" }
      ]
    },
    {
      name: "CI/CD Integration",
      description: "Integration of green practices in development pipeline",
      levels: [
        { level: 1, description: "No green considerations in CI/CD" },
        { level: 2, description: "Basic green checks performed manually" },
        { level: 3, description: "Some automated green checks in pipeline" },
        { level: 4, description: "Comprehensive green gates in CI/CD" },
        { level: 5, description: "Advanced green optimization in automation" }
      ]
    },
    {
      name: "Architecture & Design",
      description: "Sustainability considerations in software architecture",
      levels: [
        { level: 1, description: "No sustainability in architecture decisions" },
        { level: 2, description: "Basic awareness of sustainable patterns" },
        { level: 3, description: "Some sustainable patterns implemented" },
        { level: 4, description: "Architecture optimized for sustainability" },
        { level: 5, description: "Leading-edge sustainable architecture approach" }
      ]
    },
    {
      name: "Data Efficiency",
      description: "How efficiently data is processed, stored and transferred",
      levels: [
        { level: 1, description: "No data efficiency considerations" },
        { level: 2, description: "Basic data retention policies" },
        { level: 3, description: "Regular data optimization practices" },
        { level: 4, description: "Comprehensive data minimization strategy" },
        { level: 5, description: "Advanced data lifecycle optimization" }
      ]
    },
    {
      name: "Organizational Commitment",
      description: "Organization's commitment to green software practices",
      levels: [
        { level: 1, description: "No organizational awareness" },
        { level: 2, description: "Basic awareness but limited support" },
        { level: 3, description: "Defined green software policies" },
        { level: 4, description: "Organization-wide commitment and training" },
        { level: 5, description: "Strategic priority with executive sponsorship" }
      ]
    }
  ];

  // State to track selected maturity level for each category
  const [ratings, setRatings] = useState({});
  const [applicationName, setApplicationName] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [notes, setNotes] = useState({});

  const handleRatingChange = (category, level) => {
    setRatings(prev => ({
      ...prev,
      [category]: level
    }));
  };

  const handleNoteChange = (category, note) => {
    setNotes(prev => ({
      ...prev,
      [category]: note
    }));
  };

  const calculateOverallMaturity = () => {
    if (Object.keys(ratings).length === 0) return 0;
    
    const sum = Object.values(ratings).reduce((acc, val) => acc + val, 0);
    return (sum / categories.length).toFixed(1);
  };

  const getMaturityLevel = (score) => {
    if (score < 1.5) return "Initial";
    if (score < 2.5) return "Developing";
    if (score < 3.5) return "Defined";
    if (score < 4.5) return "Managed";
    return "Optimizing";
  };

  const getRecommendations = () => {
    const recommendations = [];
    
    categories.forEach(category => {
      const currentLevel = ratings[category.name] || 0;
      if (currentLevel < 5) {
        const nextLevel = category.levels.find(l => l.level === currentLevel + 1);
        if (nextLevel) {
          recommendations.push({
            category: category.name,
            current: currentLevel,
            recommendation: `Move from level ${currentLevel} to ${currentLevel + 1}: ${nextLevel.description}`
          });
        }
      }
    });
    
    return recommendations.sort((a, b) => a.current - b.current);
  };

  const resetForm = () => {
    setRatings({});
    setApplicationName('');
    setShowResults(false);
    setNotes({});
  };

  const printResults = () => {
    window.print();
  };

  return (
    <div className="mx-auto p-4 max-w-4xl bg-white rounded-lg">
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-green-800 mb-2">Green Software Maturity Matrix</h1>
        <p className="text-gray-600">Assess the environmental sustainability maturity of your application.</p>
      </div>
      
      {!showResults ? (
        <>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="application-name">
              Application Name
            </label>
            <input
              id="application-name"
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={applicationName}
              onChange={(e) => setApplicationName(e.target.value)}
              placeholder="Enter application name"
            />
          </div>
          
          {categories.map((category) => (
            <div key={category.name} className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold text-green-700 mb-1">{category.name}</h2>
              <p className="text-gray-600 mb-4 text-sm">{category.description}</p>
              
              <div className="grid grid-cols-5 gap-2 mb-4">
                {category.levels.map((level) => (
                  <div 
                    key={level.level} 
                    className={`border p-3 rounded-lg cursor-pointer hover:bg-green-50 transition ${ratings[category.name] === level.level ? 'bg-green-100 border-green-500' : 'bg-white'}`}
                    onClick={() => handleRatingChange(category.name, level.level)}
                  >
                    <div className="font-bold text-center mb-1">Level {level.level}</div>
                    <p className="text-xs text-gray-700">{level.description}</p>
                  </div>
                ))}
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Notes
                </label>
                <textarea
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="2"
                  value={notes[category.name] || ''}
                  onChange={(e) => handleNoteChange(category.name, e.target.value)}
                  placeholder="Add notes about current status and improvement ideas..."
                ></textarea>
              </div>
            </div>
          ))}
          
          <div className="mt-6 flex justify-between">
            <button
              onClick={resetForm}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Reset
            </button>
            <button
              onClick={() => setShowResults(true)}
              disabled={Object.keys(ratings).length < categories.length || !applicationName}
              className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ${
                Object.keys(ratings).length < categories.length || !applicationName ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Generate Results
            </button>
          </div>
        </>
      ) : (
        <div className="results-page">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800">Maturity Assessment Results</h2>
            <p className="text-gray-600">Application: {applicationName}</p>
            <p className="text-gray-600">Date: {new Date().toLocaleDateString()}</p>
          </div>
          
          <div className="mb-8 p-6 bg-green-50 rounded-lg text-center">
            <div className="text-4xl font-bold text-green-700 mb-2">{calculateOverallMaturity()}/5.0</div>
            <div className="text-xl text-gray-700">Overall Maturity: {getMaturityLevel(calculateOverallMaturity())}</div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Category Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <div key={category.name} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-700">{category.name}</h4>
                    <span className="font-bold text-green-700">Level {ratings[category.name] || 'N/A'}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {category.levels.find(l => l.level === ratings[category.name])?.description || 'Not rated'}
                  </p>
                  {notes[category.name] && (
                    <div className="mt-2 text-sm">
                      <span className="font-semibold">Notes:</span> {notes[category.name]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Top Improvement Recommendations</h3>
            <div className="bg-white border rounded-lg">
              {getRecommendations().slice(0, 3).map((rec, index) => (
                <div key={index} className="p-4 border-b last:border-b-0">
                  <div className="font-semibold text-gray-800">{rec.category}</div>
                  <p className="text-gray-600 text-sm">{rec.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setShowResults(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Back to Assessment
            </button>
            <button
              onClick={printResults}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Print Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GreenSoftwareMaturityMatrix;
