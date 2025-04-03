import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Papa from 'papaparse';

const SkillMappingTool = () => {
  // Main categories of skills
  const skillCategories = [
    {
      name: "React Native Fundamentals",
      skills: [
        { name: "Component Lifecycle", description: "Understanding component mounting, updating, and unmounting" },
        { name: "JSX", description: "Syntax extension for JavaScript that resembles HTML" },
        { name: "Props & State Management", description: "Passing data between components and maintaining component state" }
      ]
    },
    {
      name: "UI/UX & Styling",
      skills: [
        { name: "StyleSheet API", description: "Creating and applying styles to components" },
        { name: "Responsive Design", description: "Adapting UI to different screen sizes and orientations" },
        { name: "Animation", description: "Animated API, LayoutAnimation, react-native-reanimated" }
      ]
    },
    {
      name: "Web Development",
      skills: [
        { name: "HTML5 & CSS3", description: "Modern markup and styling techniques" },
        { name: "JavaScript ES6+", description: "Modern JavaScript features and syntax" },
        { name: "Responsive Web Design", description: "Media queries, Flexbox, Grid" }
      ]
    }
  ];

  // State for team members and their skills
  const [teamMembers, setTeamMembers] = useState([
    { 
      id: 1, 
      name: "Example Developer", 
      role: "Senior Developer",
      skills: {
        "React Native Fundamentals": {
          "Component Lifecycle": 4,
          "JSX": 5,
          "Props & State Management": 4
        },
        "UI/UX & Styling": {
          "StyleSheet API": 4,
          "Responsive Design": 3
        }
      }
    }
  ]);
  
  // State for new team member form
  const [newMember, setNewMember] = useState({
    name: "",
    role: ""
  });

  // State for CSV upload message
  const [csvMessage, setCsvMessage] = useState("");

  // State for selected team member to view/edit
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  // Load data from CSV
  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setCsvMessage("Reading CSV file...");
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target.result;
      
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setCsvMessage(`Error parsing CSV: ${results.errors[0].message}`);
            return;
          }
          
          // Process CSV data - expected format: Name, Role, Category - Skill, ...
          const membersMap = {};
          
          results.data.forEach(row => {
            const name = row.Name || row.name;
            const role = row.Role || row.role || "Developer";
            
            if (!name || name.trim() === '') return;
            
            if (!membersMap[name]) {
              membersMap[name] = {
                id: Date.now() + Math.random().toString(36).substring(2, 9),
                name: name,
                role: role,
                skills: {}
              };
            }
            
            // Process all other columns as skills
            Object.entries(row).forEach(([key, value]) => {
              if (key === 'Name' || key === 'name' || 
                  key === 'Role' || key === 'role' || 
                  !value) return;
              
              // Parse the skill from column header
              let category, skill;
              
              if (key.includes(' - ')) {
                const parts = key.split(' - ');
                category = parts[0].trim();
                skill = parts[1].trim();
              } else {
                // Default category if not specified
                skill = key.trim();
                category = "Other Skills";
              }
              
              // Convert rating to number (0-5)
              let rating = 0;
              if (!isNaN(parseInt(value))) {
                rating = Math.min(Math.max(parseInt(value), 0), 5);
              } else if (typeof value === 'string') {
                value = value.toLowerCase();
                if (value.includes('expert')) rating = 5;
                else if (value.includes('advanced')) rating = 4;
                else if (value.includes('intermediate')) rating = 3;
                else if (value.includes('basic')) rating = 2;
                else if (value.includes('beginner')) rating = 1;
              }
              
              // Add to skills
              if (rating > 0) {
                if (!membersMap[name].skills[category]) {
                  membersMap[name].skills[category] = {};
                }
                membersMap[name].skills[category][skill] = rating;
              }
            });
          });
          
          const newMembers = Object.values(membersMap);
          if (newMembers.length > 0) {
            setTeamMembers(newMembers);
            setCsvMessage(`Successfully imported ${newMembers.length} team members!`);
          } else {
            setCsvMessage("No valid data found in CSV.");
          }
        },
        error: (error) => {
          setCsvMessage(`Error parsing CSV: ${error.message}`);
        }
      });
    };
    
    reader.onerror = () => {
      setCsvMessage("Error reading file");
    };
    
    reader.readAsText(file);
  };

  // Try to read from existing file using window.fs
  const loadExistingData = async () => {
    try {
      const fileContent = await window.fs.readFile('skills_data.csv', { encoding: 'utf8' });
      
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Process the results similar to handleCSVUpload
          const membersMap = {};
          
          results.data.forEach(row => {
            const teamMember = row['Team Member'];
            const role = row['Role'] || 'Developer';
            const category = row['Category'];
            const skill = row['Skill'];
            const level = parseInt(row['Level']) || 0;
            
            if (!teamMember || !category || !skill) return;
            
            if (!membersMap[teamMember]) {
              membersMap[teamMember] = {
                id: Date.now() + Math.random().toString(36).substring(2, 9),
                name: teamMember,
                role: role,
                skills: {}
              };
            }
            
            if (!membersMap[teamMember].skills[category]) {
              membersMap[teamMember].skills[category] = {};
            }
            
            membersMap[teamMember].skills[category][skill] = level;
          });
          
          const loadedMembers = Object.values(membersMap);
          if (loadedMembers.length > 0) {
            setTeamMembers(loadedMembers);
            setCsvMessage(`Loaded ${loadedMembers.length} team members from existing data.`);
          }
        }
      });
    } catch (error) {
      console.log("No existing skills data found or error reading file.");
    }
  };

  // Load existing data on component mount
  useEffect(() => {
    loadExistingData();
  }, []);

  // Handle adding a new team member
  const handleAddMember = () => {
    if (newMember.name.trim() === "") return;
    
    setTeamMembers([
      ...teamMembers,
      {
        id: Date.now(),
        name: newMember.name,
        role: newMember.role,
        skills: {}
      }
    ]);
    
    setNewMember({ name: "", role: "" });
  };

  // Handle skill level change for a team member
  const handleSkillChange = (memberId, category, skillName, level) => {
    setTeamMembers(teamMembers.map(member => {
      if (member.id === memberId) {
        const updatedSkills = { ...member.skills };
        if (!updatedSkills[category]) {
          updatedSkills[category] = {};
        }
        updatedSkills[category][skillName] = level;
        return { ...member, skills: updatedSkills };
      }
      return member;
    }));
  };

  // Calculate overall skill level for a category
  const calculateCategoryLevel = (memberSkills, category) => {
    if (!memberSkills[category]) return 0;
    
    const skills = memberSkills[category];
    const skillValues = Object.values(skills);
    
    if (skillValues.length === 0) return 0;
    
    const sum = skillValues.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / skillValues.length) * 10) / 10;
  };

  // Get skill level color
  const getSkillLevelColor = (level) => {
    if (level === 0 || level === undefined) return "bg-gray-200";
    if (level < 2) return "bg-red-200";
    if (level < 3) return "bg-orange-200";
    if (level < 4) return "bg-yellow-200";
    return "bg-green-200";
  };

  // Get skill level label
  const getSkillLevelLabel = (level) => {
    if (level === 0 || level === undefined) return "Not rated";
    if (level === 1) return "Beginner";
    if (level === 2) return "Basic";
    if (level === 3) return "Intermediate";
    if (level === 4) return "Advanced";
    return "Expert";
  };

  // Download team skills as CSV
  const downloadCSV = () => {
    let csvContent = "Team Member,Role,Category,Skill,Level,Level Description\n";
    
    teamMembers.forEach(member => {
      skillCategories.forEach(category => {
        category.skills.forEach(skill => {
          const level = member.skills[category.name] && 
                        member.skills[category.name][skill.name] !== undefined ? 
                        member.skills[category.name][skill.name] : 0;
          
          csvContent += `"${member.name}","${member.role}","${category.name}","${skill.name}",${level},"${getSkillLevelLabel(level)}"\n`;
        });
      });
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'team_skills.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download a CSV template
  const downloadCSVTemplate = () => {
    let csvContent = "Name,Role";
    
    skillCategories.forEach(category => {
      category.skills.forEach(skill => {
        csvContent += `,${category.name} - ${skill.name}`;
      });
    });
    
    csvContent += "\n";
    csvContent += "John Doe,Senior Developer";
    
    skillCategories.forEach(() => {
      csvContent += ",0";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'skills_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Colors for pie chart segments
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">React Native & Web Development Skill Mapping Tool</h1>
      
      {/* CSV Import Section */}
      <div className="mb-8 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Import Skills Data</h2>
        
        <div className="flex flex-col space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Upload Team Skills CSV</label>
            <div className="flex flex-wrap gap-4 items-center">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleCSVUpload}
                className="border p-2 rounded"
              />
              <button 
                onClick={downloadCSVTemplate}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Download Template
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload a CSV file with team member skills. Format: Name, Role, and skill ratings.
            </p>
          </div>
          
          {csvMessage && (
            <div className={`p-2 rounded ${csvMessage.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {csvMessage}
            </div>
          )}
        </div>
      </div>
      
      {/* Add Team Member Form */}
      <div className="mb-8 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Add Team Member Manually</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Name</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded"
              value={newMember.name}
              onChange={(e) => setNewMember({...newMember, name: e.target.value})}
              placeholder="Enter name"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Role</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded"
              value={newMember.role}
              onChange={(e) => setNewMember({...newMember, role: e.target.value})}
              placeholder="Enter role"
            />
          </div>
          <div className="flex items-end">
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleAddMember}
            >
              Add Member
            </button>
          </div>
        </div>
      </div>
      
      {/* Team Overview */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Team Overview</h2>
          <button 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={downloadCSV}
          >
            Export to CSV
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map(member => {
            // Prepare data for pie chart
            const pieData = skillCategories.map(category => {
              const level = calculateCategoryLevel(member.skills, category.name);
              return {
                name: category.name,
                value: level > 0 ? level : 0.1 // Ensure empty skills still show up in chart
              };
            });
            
            return (
              <div 
                key={member.id} 
                className="p-4 border rounded cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedMemberId(member.id)}
              >
                <h3 className="font-semibold">{member.name}</h3>
                <p className="text-gray-600 text-sm mb-2">{member.role}</p>
                
                <div className="flex justify-center mt-2 mb-4">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}/5`, 'Skill Level']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4">
                  {skillCategories.map((category, index) => {
                    const level = calculateCategoryLevel(member.skills, category.name);
                    return (
                      <div key={category.name} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="text-xs">{category.name}</span>
                        </div>
                        <div className="w-24 h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full"
                            style={{ 
                              width: `${(level/5)*100}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          ></div>
                        </div>
                        <span className="text-xs w-6 text-right">{level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Team Skills Heatmap */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Team Skills Heatmap</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Category</th>
                <th className="border p-2">Skill</th>
                {teamMembers.map(member => (
                  <th key={member.id} className="border p-2 text-sm">{member.name}</th>
                ))}
                <th className="border p-2">Team Avg</th>
              </tr>
            </thead>
            <tbody>
              {skillCategories.map(category => (
                <React.Fragment key={category.name}>
                  {category.skills.map((skill, index) => {
                    // Calculate average for this skill across team
                    let total = 0;
                    let count = 0;
                    teamMembers.forEach(member => {
                      if (member.skills[category.name] && 
                          member.skills[category.name][skill.name] !== undefined) {
                        total += member.skills[category.name][skill.name];
                        count++;
                      }
                    });
                    const average = count > 0 ? Math.round((total/count) * 10) / 10 : 0;
                    
                    return (
                      <tr key={`${category.name}-${skill.name}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {index === 0 && (
                          <td rowSpan={category.skills.length} className="border p-2 font-medium">
                            {category.name}
                          </td>
                        )}
                        <td className="border p-2 text-sm">
                          <div>{skill.name}</div>
                          <div className="text-xs text-gray-500">{skill.description}</div>
                        </td>
                        {teamMembers.map(member => {
                          const level = member.skills[category.name] && 
                                       member.skills[category.name][skill.name] !== undefined ? 
                                       member.skills[category.name][skill.name] : 0;
                          return (
                            <td key={`${member.id}-${skill.name}`} className={`border p-2 text-center ${getSkillLevelColor(level)}`}>
                              {level ? level : "-"}
                            </td>
                          );
                        })}
                        <td className={`border p-2 text-center font-medium ${getSkillLevelColor(average)}`}>
                          {average ? average : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Skill Assessment Modal */}
      {selectedMemberId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto p-6">
            {teamMembers.map(member => {
              if (member.id !== selectedMemberId) return null;
              
              return (
                <div key={member.id}>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">
                      Skills Assessment: {member.name}
                    </h2>
                    <button 
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => setSelectedMemberId(null)}
                    >
                      Close
                    </button>
                  </div>
                  
                  {skillCategories.map(category => (
                    <div key={category.name} className="mb-8">
                      <h3 className="text-lg font-semibold mb-4">{category.name}</h3>
                      <div className="space-y-4">
                        {category.skills.map(skill => (
                          <div key={skill.name} className="p-3 border rounded bg-gray-50">
                            <div className="flex flex-wrap justify-between items-start gap-4">
                              <div className="flex-1">
                                <p className="font-medium">{skill.name}</p>
                                <p className="text-sm text-gray-600">{skill.description}</p>
                              </div>
                              <div className="w-64">
                                <label className="block text-sm font-medium mb-1">
                                  Proficiency Level: {getSkillLevelLabel(member.skills[category.name]?.[skill.name] || 0)}
                                </label>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="5" 
                                  step="1"
                                  className="w-full" 
                                  value={member.skills[category.name]?.[skill.name] || 0}
                                  onChange={(e) => handleSkillChange(
                                    member.id, 
                                    category.name, 
                                    skill.name, 
                                    parseInt(e.target.value)
                                  )}
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>None</span>
                                  <span>Beginner</span>
                                  <span>Basic</span>
                                  <span>Intermediate</span>
                                  <span>Advanced</span>
                                  <span>Expert</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-8 p-4 border rounded bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Skill Level Legend</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 mr-2"></div>
            <span className="text-sm">0: Not rated</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-200 mr-2"></div>
            <span className="text-sm">1: Beginner</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-orange-200 mr-2"></div>
            <span className="text-sm">2: Basic</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-200 mr-2"></div>
            <span className="text-sm">3: Intermediate</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-200 mr-2"></div>
            <span className="text-sm">4-5: Advanced/Expert</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillMappingTool;