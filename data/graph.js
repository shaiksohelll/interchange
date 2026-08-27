/** Seed graph: Hyderabad Metro + nearby companies + roles + skills. */

export const lines = [
  { name: "Red", color: "#C41E3A" },
  { name: "Blue", color: "#0078C8" },
  { name: "Green", color: "#1A7F4B" },
];

export const stations = [
  { name: "Miyapur", lines: ["Red"] },
  { name: "Kukatpally", lines: ["Red"] },
  { name: "Ameerpet", lines: ["Red", "Blue"] },
  { name: "Punjagutta", lines: ["Red"] },
  { name: "Assembly", lines: ["Red"] },
  { name: "MG Bus Station", lines: ["Red", "Green"] },
  { name: "Dilsukhnagar", lines: ["Red"] },
  { name: "LB Nagar", lines: ["Red"] },
  { name: "Nagole", lines: ["Blue"] },
  { name: "Habsiguda", lines: ["Blue"] },
  { name: "Parade Ground", lines: ["Blue", "Green"] },
  { name: "Paradise", lines: ["Blue"] },
  { name: "Begumpet", lines: ["Blue"] },
  { name: "Madhapur", lines: ["Blue"] },
  { name: "Hitec City", lines: ["Blue"] },
  { name: "Raidurg", lines: ["Blue"] },
  { name: "JBS", lines: ["Green"] },
  { name: "RTC Cross Roads", lines: ["Green"] },
];

/** Consecutive stations on a line. Minutes are one-way estimates. */
export const segments = [
  ["Red", ["Miyapur", "Kukatpally", 8], ["Kukatpally", "Ameerpet", 10], ["Ameerpet", "Punjagutta", 3], ["Punjagutta", "Assembly", 6], ["Assembly", "MG Bus Station", 5], ["MG Bus Station", "Dilsukhnagar", 8], ["Dilsukhnagar", "LB Nagar", 6]],
  ["Blue", ["Nagole", "Habsiguda", 7], ["Habsiguda", "Parade Ground", 9], ["Parade Ground", "Paradise", 4], ["Paradise", "Begumpet", 5], ["Begumpet", "Ameerpet", 4], ["Ameerpet", "Madhapur", 8], ["Madhapur", "Hitec City", 4], ["Hitec City", "Raidurg", 3]],
  ["Green", ["JBS", "Parade Ground", 3], ["Parade Ground", "RTC Cross Roads", 6], ["RTC Cross Roads", "MG Bus Station", 7]],
];

export const skills = [
  "React",
  "Node.js",
  "TypeScript",
  "Python",
  "SQL",
  "Testing",
  "Graphs",
  "Java",
];

export const companies = [
  {
    name: "Wexa AI",
    industry: "AI automation",
    station: "Hitec City",
    walkMin: 8,
    roles: [
      { title: "Software Engineer Intern", kind: "intern", stipend: 25000, skills: ["React", "Node.js", "Graphs"] },
      { title: "Full-Stack Engineer", kind: "fte", stipend: null, skills: ["TypeScript", "React", "Node.js"] },
    ],
  },
  {
    name: "Microsoft",
    industry: "Cloud",
    station: "Raidurg",
    walkMin: 6,
    roles: [{ title: "SWE Intern", kind: "intern", stipend: 50000, skills: ["Python", "SQL"] }],
  },
  {
    name: "Amazon",
    industry: "E-commerce",
    station: "Raidurg",
    walkMin: 10,
    roles: [{ title: "SDE Intern", kind: "intern", stipend: 45000, skills: ["Java", "SQL"] }],
  },
  {
    name: "Qualcomm",
    industry: "Semiconductors",
    station: "Raidurg",
    walkMin: 14,
    roles: [{ title: "Engineering Intern SW", kind: "intern", stipend: 40000, skills: ["Python", "Testing"] }],
  },
  {
    name: "Deloitte",
    industry: "Consulting",
    station: "Hitec City",
    walkMin: 12,
    roles: [{ title: "DEC Intern", kind: "intern", stipend: 25000, skills: ["Testing", "SQL"] }],
  },
  {
    name: "Cognizant",
    industry: "IT services",
    station: "Madhapur",
    walkMin: 9,
    roles: [{ title: "Programmer Analyst Trainee", kind: "fte", stipend: null, skills: ["Java", "SQL"] }],
  },
  {
    name: "ValueLabs",
    industry: "Product engineering",
    station: "Madhapur",
    walkMin: 11,
    roles: [{ title: "Full-Stack Intern", kind: "intern", stipend: 20000, skills: ["React", "Node.js"] }],
  },
  {
    name: "Cyient",
    industry: "Engineering",
    station: "Hitec City",
    walkMin: 7,
    roles: [{ title: "Graduate Engineer Trainee", kind: "fte", stipend: null, skills: ["Python", "Testing"] }],
  },
  {
    name: "Tech Mahindra",
    industry: "IT services",
    station: "Madhapur",
    walkMin: 15,
    roles: [{ title: "Associate Software Engineer", kind: "fte", stipend: null, skills: ["Java", "SQL"] }],
  },
  {
    name: "Swecha",
    industry: "FOSS / AI",
    station: "Hitec City",
    walkMin: 18,
    roles: [{ title: "AI Developer Intern", kind: "intern", stipend: 0, skills: ["Python", "Graphs"] }],
  },
  {
    name: "Student Tribe",
    industry: "Campus product",
    station: "Punjagutta",
    walkMin: 10,
    roles: [{ title: "Full Stack Intern", kind: "intern", stipend: 25000, skills: ["React", "TypeScript", "SQL"] }],
  },
  {
    name: "ServiceNow",
    industry: "Enterprise SaaS",
    station: "Raidurg",
    walkMin: 8,
    roles: [{ title: "Software Engineer Intern", kind: "intern", stipend: 35000, skills: ["Java", "Testing"] }],
  },
];
