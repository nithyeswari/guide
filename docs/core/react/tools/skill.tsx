import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const SkillMappingTool = () => {
  // Define skill categories
  const skillCategories = [
    {
      name: "React Native Fundamentals",
      skills: [
        { name: "Component Lifecycle" },
        { name: "JSX" },
        { name: "Props & State Management" }
      ]
    },
    {
      name: "UI/UX & Styling",
      skills: [
        { name: "StyleSheet API" },
        { name: "Responsive Design" },
        { name: "Animation" }
      ]
    },
    {
      name: "Web Development",
      skills: [
        { name: "HTML5 & CSS3" },
        { name: "JavaScript ES6+" },
        { name: "Responsive Web Design" }
      ]
    }
  ];

  // Sample team member data
  const [teamMembers] = useState([
    { 
      id: 1, 
      name: "John Doe", 
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
    },
    { 
      id: 2, 
      name: "Jane Smith", 
      role: "Junior Developer",
      skills: {
        "React Native Fundamentals": {
          "Component Lifecycle": 2,
          "JSX": 3,
          "Props & State Management": 2
        },
        "Web Development": {
          "HTML5 & CSS3": 4,
          "JavaScript ES6+": 3
        }
      }
    }
  ]);

  // Calculate skill level for a category
  const calculateCategoryLevel = (memberSkills, category) => {
    if (!memberSkills[category]) return 0;
    
    const skills = memberSkills[category];
    const skillValues = Object.values(skills);
    
    if (skillValues.length === 0) return 0;
    
    const sum = skillValues.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / skillValues.length) * 10) / 10;
  };

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        React Native & Web Developer Skills
      </h1>
      
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "15px" }}>
          Team Overview
        </h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {teamMembers.map(member => {
            // Prepare data for pie chart
            const pieData = skillCategories.map((category, index) => {
              const level = calculateCategoryLevel(member.skills, category.name);
              return {
                name: category.name,
                value: level > 0 ? level : 0.1 // Ensure empty skills still show up in chart
              };
            });
            
            return (
              <div 
                key={member.id} 
                style={{ 
                  padding: "15px", 
                  border: "1px solid #e5e7eb", 
                  borderRadius: "4px", 
                  backgroundColor: "white"
                }}
              >
                <h3 style={{ fontWeight: "600" }}>{member.name}</h3>
                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "10px" }}>{member.role}</p>
                
                <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
                  <div style={{ width: "160px", height: "160px" }}>
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
                
                <div style={{ marginTop: "15px" }}>
                  {skillCategories.map((category, index) => {
                    const level = calculateCategoryLevel(member.skills, category.name);
                    return (
                      <div key={category.name} style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        marginBottom: "10px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <div style={{ 
                            width: "12px", 
                            height: "12px", 
                            marginRight: "5px", 
                            borderRadius: "50%",
                            backgroundColor: COLORS[index % COLORS.length]
                          }}></div>
                          <span style={{ fontSize: "14px" }}>{category.name}</span>
                        </div>
                        <div style={{ 
                          width: "100px", 
                          height: "8px", 
                          backgroundColor: "#e5e7eb",
                          borderRadius: "4px",
                          overflow: "hidden",
                          margin: "0 10px"
                        }}>
                          <div style={{ 
                            height: "100%",
                            width: `${(level/5)*100}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}></div>
                        </div>
                        <span style={{ fontSize: "14px", minWidth: "20px", textAlign: "right" }}>{level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "15px" }}>
          Skills Heatmap
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e5e7eb" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6" }}>
                <th style={{ padding: "10px", textAlign: "left", border: "1px solid #e5e7eb" }}>Category</th>
                <th style={{ padding: "10px", textAlign: "left", border: "1px solid #e5e7eb" }}>Skill</th>
                {teamMembers.map(member => (
                  <th key={member.id} style={{ padding: "10px", textAlign: "center", border: "1px solid #e5e7eb" }}>
                    {member.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skillCategories.map(category => (
                <React.Fragment key={category.name}>
                  {category.skills.map((skill, index) => (
                    <tr key={skill.name} style={{ backgroundColor: index % 2 === 0 ? "white" : "#f9fafb" }}>
                      {index === 0 && (
                        <td rowSpan={category.skills.length} style={{ 
                          padding: "10px", 
                          border: "1px solid #e5e7eb",
                          fontWeight: "500"
                        }}>
                          {category.name}
                        </td>
                      )}
                      <td style={{ padding: "10px", border: "1px solid #e5e7eb" }}>
                        {skill.name}
                      </td>
                      {teamMembers.map(member => {
                        const level = member.skills[category.name] && 
                                    member.skills[category.name][skill.name] !== undefined ? 
                                    member.skills[category.name][skill.name] : 0;
                        
                        let bgColor;
                        if (level === 0) bgColor = "#f3f4f6";
                        else if (level < 2) bgColor = "#fee2e2";
                        else if (level < 3) bgColor = "#fed7aa";
                        else if (level < 4) bgColor = "#fef08a";
                        else bgColor = "#bbf7d0";
                        
                        return (
                          <td key={`${member.id}-${skill.name}`} style={{ 
                            padding: "10px", 
                            textAlign: "center", 
                            border: "1px solid #e5e7eb",
                            backgroundColor: bgColor
                          }}>
                            {level || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div style={{ marginTop: "30px", padding: "15px", border: "1px solid #e5e7eb", borderRadius: "4px", backgroundColor: "#f9fafb" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "10px" }}>Skill Level Legend</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: "15px", height: "15px", backgroundColor: "#f3f4f6", marginRight: "5px" }}></div>
            <span style={{ fontSize: "14px" }}>Not rated</span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: "15px", height: "15px", backgroundColor: "#fee2e2", marginRight: "5px" }}></div>
            <span style={{ fontSize: "14px" }}>Beginner (1)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: "15px", height: "15px", backgroundColor: "#fed7aa", marginRight: "5px" }}></div>
            <span style={{ fontSize: "14px" }}>Basic (2)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: "15px", height: "15px", backgroundColor: "#fef08a", marginRight: "5px" }}></div>
            <span style={{ fontSize: "14px" }}>Intermediate (3)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: "15px", height: "15px", backgroundColor: "#bbf7d0", marginRight: "5px" }}></div>
            <span style={{ fontSize: "14px" }}>Advanced/Expert (4-5)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillMappingTool;
