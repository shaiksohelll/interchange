/** Phase I Hyderabad Metro + offices you can actually walk to from a station. */

export const lines = [
  { name: "Red", color: "#e31e24" },
  { name: "Blue", color: "#0078c8" },
  { name: "Green", color: "#00a651" },
];

export const redStops = [
  "Miyapur",
  "JNTU College",
  "KPHB Colony",
  "Kukatpally",
  "Balanagar",
  "Moosapet",
  "Bharat Nagar",
  "Erragadda",
  "ESI Hospital",
  "S.R. Nagar",
  "Ameerpet",
  "Punjagutta",
  "Irrum Manzil",
  "Khairatabad",
  "Lakdi-ka-pul",
  "Assembly",
  "Nampally",
  "Gandhi Bhavan",
  "Osmania Medical College",
  "MG Bus Station",
  "Malakpet",
  "New Market",
  "Musarambagh",
  "Dilsukhnagar",
  "Chaitanyapuri",
  "Victoria Memorial",
  "LB Nagar",
];

export const blueStops = [
  "Raidurg",
  "HITEC City",
  "Durgam Cheruvu",
  "Madhapur",
  "Peddamma Gudi",
  "Jubilee Hills Check Post",
  "Road No 5 Jubilee Hills",
  "Yusufguda",
  "Madhura Nagar",
  "Ameerpet",
  "Begumpet",
  "Prakash Nagar",
  "Rasoolpura",
  "Paradise",
  "Parade Ground",
  "Secunderabad East",
  "Mettuguda",
  "Tarnaka",
  "Habsiguda",
  "NGRI",
  "Stadium",
  "Uppal",
  "Nagole",
];

export const greenStops = [
  "JBS Parade Ground",
  "Parade Ground",
  "Secunderabad West",
  "Gandhi Hospital",
  "Musheerabad",
  "RTC X Roads",
  "Chikkadpally",
  "Narayanaguda",
  "Sultan Bazaar",
  "MG Bus Station",
];

function addStop(map, name, line) {
  if (!map.has(name)) map.set(name, { name, lines: [] });
  const row = map.get(name);
  if (!row.lines.includes(line)) row.lines.push(line);
}

export const stations = (() => {
  const map = new Map();
  for (const name of redStops) addStop(map, name, "Red");
  for (const name of blueStops) addStop(map, name, "Blue");
  for (const name of greenStops) addStop(map, name, "Green");
  return [...map.values()];
})();

function chain(line, stops, minutes = 2) {
  const edges = [];
  for (let i = 0; i < stops.length - 1; i++) {
    edges.push([stops[i], stops[i + 1], minutes]);
  }
  return [line, ...edges];
}

export const segments = [
  chain("Red", redStops),
  chain("Blue", blueStops),
  chain("Green", greenStops),
];

export const orders = {
  Red: redStops,
  Blue: blueStops,
  Green: greenStops,
};

/**
 * Offices pinned to the nearest Phase I station.
 * Walk minutes are rough, from public addresses (Mindspace, Jubilee Enclave, Inorbit Rd).
 */
export const companies = [
  {
    name: "Qualcomm",
    industry: "Semiconductors",
    station: "Raidurg",
    walkMin: 2,
    roles: [
      { title: "Engineering Intern SW",
        kind: "intern",
        stipend: 40000,
        skills: ["Python", "Testing"] },
    ],
  },
  {
    name: "Microsoft",
    industry: "Cloud / R&D",
    station: "Raidurg",
    walkMin: 8,
    roles: [
      { title: "SWE Intern",
        kind: "intern",
        stipend: 50000,
        skills: ["Python", "SQL"] },
    ],
  },
  {
    name: "Amazon",
    industry: "E-commerce",
    station: "Durgam Cheruvu",
    walkMin: 5,
    roles: [
      { title: "SDE Intern",
        kind: "intern",
        stipend: 45000,
        skills: ["Java", "SQL"] },
    ],
  },
  {
    name: "Google",
    industry: "Product",
    station: "HITEC City",
    walkMin: 6,
    roles: [
      { title: "SWE Intern",
        kind: "intern",
        stipend: 50000,
        skills: ["Python", "TypeScript"] },
    ],
  },
  {
    name: "Wexa AI",
    industry: "AI infrastructure",
    station: "HITEC City",
    walkMin: 8,
    roles: [
      { title: "Software Engineer Intern",
        kind: "intern",
        stipend: 25000,
        skills: ["Graphs", "TypeScript", "Node.js"] },
      { title: "Full-Stack Engineer",
        kind: "fte",
        stipend: null,
        skills: ["TypeScript", "React", "Node.js"] },
    ],
  },
  {
    name: "Salesforce",
    industry: "Enterprise SaaS",
    station: "HITEC City",
    walkMin: 7,
    roles: [
      { title: "Software Engineer Intern",
        kind: "intern",
        stipend: 35000,
        skills: ["Java", "SQL"] },
    ],
  },
  {
    name: "Cyient",
    industry: "Engineering",
    station: "HITEC City",
    walkMin: 7,
    roles: [
      { title: "Graduate Engineer Trainee",
        kind: "fte",
        stipend: null,
        skills: ["Python", "Testing"] },
    ],
  },
  {
    name: "IBM",
    industry: "IT services",
    station: "Durgam Cheruvu",
    walkMin: 10,
    roles: [
      { title: "Application Developer Intern",
        kind: "intern",
        stipend: 25000,
        skills: ["Java", "SQL"] },
    ],
  },
  {
    name: "Deloitte",
    industry: "Consulting",
    station: "Madhapur",
    walkMin: 8,
    roles: [
      { title: "DEC Intern",
        kind: "intern",
        stipend: 25000,
        skills: ["Testing", "SQL"] },
    ],
  },
  {
    name: "ValueLabs",
    industry: "Product engineering",
    station: "Madhapur",
    walkMin: 11,
    roles: [
      { title: "Full-Stack Intern",
        kind: "intern",
        stipend: 20000,
        skills: ["React", "Node.js"] },
    ],
  },
  {
    name: "Cognizant",
    industry: "IT services",
    station: "Madhapur",
    walkMin: 9,
    roles: [
      { title: "Programmer Analyst Trainee",
        kind: "fte",
        stipend: null,
        skills: ["Java", "SQL"] },
    ],
  },
  {
    name: "Oracle",
    industry: "Enterprise software",
    station: "Madhapur",
    walkMin: 12,
    roles: [
      { title: "Software Intern",
        kind: "intern",
        stipend: 30000,
        skills: ["SQL", "Java"] },
    ],
  },
  {
    name: "ServiceNow",
    industry: "Enterprise SaaS",
    station: "Raidurg",
    walkMin: 9,
    roles: [
      { title: "Software Engineer Intern",
        kind: "intern",
        stipend: 35000,
        skills: ["Java", "Testing"] },
    ],
  },
  {
    name: "Student Tribe",
    industry: "Campus product",
    station: "Punjagutta",
    walkMin: 10,
    roles: [
      { title: "Full Stack Intern",
        kind: "intern",
        stipend: 25000,
        skills: ["React", "TypeScript", "SQL"] },
    ],
  },
  {
    name: "Swecha",
    industry: "FOSS / AI",
    station: "HITEC City",
    walkMin: 18,
    roles: [
      { title: "AI Developer Intern",
        kind: "intern",
        stipend: 0,
        skills: ["Python", "Graphs"] },
    ],
  },
];
