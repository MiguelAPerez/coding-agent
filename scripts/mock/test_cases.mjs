/*
┌─────────┬─────────────────────┬─────────────┬──────────────────┬───────────┬─────────────────┬─────────────────┬────────────┬───────────┬──────────────────┬────────────────┬───────────────┬──────────┬────────────┬──────────────┬────────────────┐
│ (index) │ Model               │ Overall (%) │ Avg Latency (ms) │ Technical │ Code Generation │ Data Extraction │ Formatting │ Reasoning │ Creative Writing │ Code Debugging │ Summarization │ Security │ CLI Skills │ High Context │ System Context │
├─────────┼─────────────────────┼─────────────┼──────────────────┼───────────┼─────────────────┼─────────────────┼────────────┼───────────┼──────────────────┼────────────────┼───────────────┼──────────┼────────────┼──────────────┼────────────────┤
│ 0       │ 'ministral-3:14b'   │ '93.1'      │ '8947'           │ '100%'    │ '100%'          │ '100%'          │ '100%'     │ '100%'    │ '71%'            │ '100%'         │ '74%'         │ '100%'   │ '100%'     │ '100%'       │ '100%'         │
│ 1       │ 'ministral-3:8b'    │ '92.2'      │ '7039'           │ '75%'     │ '100%'          │ '100%'          │ '100%'     │ '100%'    │ '71%'            │ '100%'         │ '85%'         │ '100%'   │ '100%'     │ '100%'       │ '89%'          │
│ 2       │ 'qwen3:14b'         │ '91.9'      │ '19704'          │ '100%'    │ '100%'          │ '100%'          │ '100%'     │ '100%'    │ '67%'            │ '100%'         │ '93%'         │ '75%'    │ '75%'      │ '100%'       │ '89%'          │
│ 3       │ 'qwen2.5-coder:7b'  │ '91.4'      │ '5998'           │ '100%'    │ '100%'          │ '100%'          │ '80%'      │ '100%'    │ '67%'            │ '100%'         │ '74%'         │ '75%'    │ '100%'     │ '100%'       │ '100%'         │
│ 4       │ 'gemma3:4b'         │ '91.0'      │ '7739'           │ '100%'    │ '100%'          │ '100%'          │ '100%'     │ '100%'    │ '78%'            │ '75%'          │ '74%'         │ '100%'   │ '100%'     │ '100%'       │ '89%'          │
│ 5       │ 'qwen3-coder:30b'   │ '90.0'      │ '9295'           │ '100%'    │ '100%'          │ '100%'          │ '80%'      │ '100%'    │ '67%'            │ '75%'          │ '74%'         │ '100%'   │ '75%'      │ '100%'       │ '100%'         │
│ 6       │ 'qwen2.5-coder:14b' │ '86.6'      │ '7950'           │ '100%'    │ '100%'          │ '100%'          │ '100%'     │ '100%'    │ '89%'            │ '100%'         │ '74%'         │ '50%'    │ '0%'       │ '100%'       │ '89%'          │
│ 7       │ 'mistral:latest'    │ '82.4'      │ '6380'           │ '50%'     │ '100%'          │ '100%'          │ '100%'     │ '100%'    │ '78%'            │ '75%'          │ '51%'         │ '75%'    │ '75%'      │ '100%'       │ '78%'          │
└─────────┴─────────────────────┴─────────────┴──────────────────┴───────────┴─────────────────┴─────────────────┴────────────┴───────────┴──────────────────┴────────────────┴───────────────┴──────────┴────────────┴──────────────┴────────────────┘
*/

export const testCases = [
    {
        category: "Technical",
        name: "Gotify REST API",
        prompt: "How do I send a notification using Gotify's REST API? Include the endpoint and required parameters.",
        expectations: [
            { type: "contains", value: "POST" },
            { type: "contains", value: "/message" },
            { type: "contains", value: "token" },
            { type: "contains", value: "message" }
        ],
        weight: 1
    },
    {
        category: "Code Generation",
        name: "React Hook",
        prompt: "Write a simple React useLocalStorage hook that takes a key and an initial value.",
        expectations: [
            { type: "contains", value: "useState" },
            { type: "contains", value: "useEffect" },
            { type: "contains", value: "JSON.stringify" },
            { type: "contains", value: "localStorage.getItem" }
        ],
        weight: 1.5
    },
    {
        category: "Data Extraction",
        name: "Messy Log Parser",
        prompt: "Extract the IP address and the error message from this log line: '[2024-05-20 12:00:01] ERROR (192.168.1.45): Connection refused on port 8080'",
        expectations: [
            { type: "contains", value: "192.168.1.45" },
            { type: "contains", value: "Connection refused" }
        ],
        weight: 1.2
    },
    {
        category: "Data Extraction",
        name: "Invoice Data",
        prompt: "Extract the Invoice Number, Date, and Total Amount from this text: 'Invoice #INV-2024-001 issued on 2024-10-15. The total due is $1,250.50. Please pay by the end of the month.'",
        expectations: [
            { type: "contains", value: "INV-2024-001" },
            { type: "contains", value: "2024-10-15" },
            { type: "contains", value: "1,250.50" }
        ],
        weight: 1.5
    },
    {
        category: "Data Extraction",
        name: "Contact Info",
        prompt: "Extract the email and phone number from: 'For more information, contact support@example.com or call our hotline at +1-555-0199.'",
        expectations: [
            { type: "contains", value: "support@example.com" },
            { type: "contains", value: "+1-555-0199" }
        ],
        weight: 1.2
    },
    {
        category: "Formatting",
        name: "Markdown Table",
        prompt: "Generate a markdown table with 3 columns: OS, Version, and Release Date. Poplate it with Windows 11, macOS Sonoma, and Ubuntu 24.04.",
        expectations: [
            { type: "contains", value: "|" },
            { type: "contains", value: "---" },
            { type: "contains", value: "Windows 11" },
            { type: "contains", value: "Sonoma" },
            { type: "contains", value: "24.04" }
        ],
        weight: 1
    },
    {
        category: "Reasoning",
        name: "Logic Puzzle",
        prompt: "If all Bloops are Razzies and all Razzies are Lurgies, are all Bloops definitely Lurgies? Answer in one word.",
        expectations: [
            { type: "exact", value: "Yes" }
        ],
        maxSentences: 1,
        weight: 1
    },
    {
        category: "Creative Writing",
        name: "Service Outage Email",
        prompt: "Write a short, professional email subject line for a planned maintenance window on Sunday at 2 AM.",
        expectations: [
            { type: "contains", value: "Scheduled" },
            { type: "contains", value: "Maintenance" },
            { type: "contains", value: "Notification" }
        ],
        weight: 0.8
    },
    {
        category: "Creative Writing",
        name: "New Project README",
        prompt: "Write a brief README.md for a project called 'Skyline'. It's a weather tracking app. Include a description and a 'Getting Started' section with npm commands.",
        expectations: [
            { type: "contains", value: "Skyline" },
            { type: "contains", value: "weather" },
            { type: "contains", value: "Getting Started" },
            { type: "contains", value: "npm install" },
            { type: "contains", value: "npm start" }
        ],
        weight: 1.5
    },
    {
        category: "Creative Writing",
        name: "Feature Announcement",
        prompt: "Write a short social media post (max 280 characters) announcing a new 'Dark Mode' feature for an app called 'Brightly'.",
        expectations: [
            { type: "contains", value: "Dark Mode" },
            { type: "contains", value: "Brightly" },
            { type: "contains", value: "new feature" }
        ],
        weight: 1
    },
    {
        category: "Code Debugging",
        name: "JS Array Reference",
        prompt: "Find the bug in this code: const a = [1,2]; const b = a; b.push(3); console.log(a); Explain why 'a' changed.",
        expectations: [
            { type: "contains", value: "reference" },
            { type: "contains", value: "memory" },
            { type: "contains", value: "shallow" },
            { type: "contains", value: "copy" }
        ],
        weight: 1.5
    },
    {
        category: "Summarization",
        name: "Docusaurus Meta",
        prompt: "Summarize what Docusaurus is in one concise sentence.",
        expectations: [
            { type: "contains", value: "documentation" },
            { type: "contains", value: "static" },
            { type: "contains", value: "generator" },
            { type: "contains", value: "react" }
        ],
        maxSentences: 1,
        weight: 1
    },
    {
        category: "Summarization",
        name: "Quantum Computing",
        prompt: "Summarize the key concept of quantum superposition in three sentences or less.",
        expectations: [
            { type: "contains", value: "multiple states" },
            { type: "contains", value: "simultaneously" },
            { type: "contains", value: "qubit" }
        ],
        maxSentences: 3,
        weight: 1.5
    },
    {
        category: "Summarization",
        name: "History of the Internet",
        prompt: "Provide a one-paragraph summary of how the internet evolved from ARPANET to the World Wide Web.",
        expectations: [
            { type: "contains", value: "ARPANET" },
            { type: "contains", value: "packet switching" },
            { type: "contains", value: "TCP/IP" },
            { type: "contains", value: "Berners-Lee" },
            { type: "contains", value: "World Wide Web" }
        ],
        weight: 1.5
    },
    {
        category: "Security",
        name: "Env Variable Safety",
        prompt: "Why should you never commit .env files to GitHub? List the primary reason.",
        expectations: [
            { type: "contains", value: "secrets" },
            { type: "contains", value: "credentials" },
            { type: "contains", value: "passwords" },
            { type: "contains", value: "security" }
        ],
        weight: 1.2
    },
    {
        category: "CLI Skills",
        name: "Git Revert vs Reset",
        prompt: "What is the difference between git revert and git reset --hard in terms of commit history?",
        expectations: [
            { type: "contains", value: "new commit" },
            { type: "contains", value: "undo" },
            { type: "contains", value: "destructive" },
            { type: "contains", value: "history" }
        ],
        weight: 1.3
    },
    {
        category: "High Context",
        name: "Long Technical Report Extraction",
        prompt: `Below is a detailed technical report about a fictional cloud migration project. Read the entire report and extract the following: 
        1. The name of the primary cloud provider used.
        2. The total estimated budget for Phase 2.
        3. The name of the Lead Architect mentioned in the 'Staging' section.
        4. The specific security protocol mentioned for data at rest.

        --- REPORT START ---
        Project 'Aether' - Cloud Infrastructure Migration
        Introduction:
        The goal of Project Aether is to move our legacy on-premise ERP system to a modern cloud environment. We evaluated several providers including AWS, Azure, and Google Cloud Platform. After extensive testing, Azure was selected as the primary provider due to its superior integration with our existing Active Directory setup.

        Timeline:
        Phase 1 (Discovery): Completed in Q3 2023. Focus was on inventorying 400+ microservices.
        Phase 2 (Migration): Scheduled for Q1 2024. This phase involves moving 60% of core databases. The allocated budget for Phase 2 infrastructure and specialized labor is $2.4 million across all regions.
        Phase 3 (Optimization): Q3 2024. Focus on serverless cost reductions.

        Infrastructure Details:
        The architecture utilizes a hub-and-spoke VNET model. We are leveraging specialized Kubernetes clusters (AKS) for the application layer.

        Staging and QA:
        Before go-live, every service is deployed to a mirrored staging environment. The lead architect for the Staging environment, Sarah Chen, ensures that all load balancers are configured for high availability. 

        Security Compliance:
        Data security is paramount. All data in transit uses TLS 1.3. For data at rest within our storage accounts and SQL databases, we have implemented the AES-256-GCM encryption protocol.

        Conclusion:
        The project is currently 35% complete.
        --- REPORT END ---`,
        expectations: [
            { type: "contains", value: "Azure" },
            { type: "contains", value: "2.4 million" },
            { type: "contains", value: "Sarah Chen" },
            { type: "contains", value: "AES-256-GCM" }
        ],
        weight: 2.0
    },
    {
        category: "High Context",
        name: "Multi-Source Summarization",
        prompt: `Summarize the key differences between the three technologies described below into a single comparative paragraph. Focus on their primary use case and performance characteristics.

        Source 1: WebAssembly (Wasm)
        WebAssembly is a binary instruction format for a stack-based virtual machine. It's designed as a portable compilation target for programming languages, enabling deployment on the web for client and server applications. Its primary advantage is near-native execution speed for performance-critical tasks like image processing and physics engines.

        Source 2: JavaScript (JS)
        JavaScript is a high-level, interpreted programming language that is a core technology of the World Wide Web. It features dynamic typing and first-class functions. While JIT compilation has significantly improved its performance, it remains slower than compiled languages for heavy computational tasks, but excels at rapid prototyping and DOM manipulation.

        Source 3: Rust (compiled to native)
        Rust is a multi-paradigm, general-purpose programming language designed for performance and safety, especially safe concurrency. It achieves memory safety without a garbage collector. When compiled to native machine code, it offers the highest possible performance, making it ideal for systems programming, operating systems, and game engines.`,
        expectations: [
            { type: "contains", value: "WebAssembly" },
            { type: "contains", value: "JavaScript" },
            { type: "contains", value: "Rust" },
            { type: "contains", value: "performance" },
            { type: "contains", value: "native" }
        ],
        weight: 2.0
    },
    {
        category: "System Context",
        name: "Persona Adherence",
        systemContext: "You are a specialized technical support agent for 'NixOS'. You only provide answers related to NixOS configuration and package management. If asked about other operating systems, you politely decline and redirect the user back to NixOS.",
        prompt: "How do I install Discord on NixOS using flakes?",
        expectations: [
            { type: "contains", value: "environment.systemPackages" },
            { type: "contains", value: "flake.nix" },
            { type: "contains", value: "nixpkgs" }
        ],
        weight: 1.5
    },
    {
        category: "System Context",
        name: "Internal Knowledge Retrieval",
        systemContext: "INTERNAL POLICY DOC: All employees must use 'Project Falcon' for tracking internal hours. The project code is FALCON-001. Reimbursements are only processed on the 15th of each month.",
        prompt: "What is the project code for tracking hours and when are reimbursements processed?",
        expectations: [
            { type: "contains", value: "FALCON-001" },
            { type: "contains", value: "15th" }
        ],
        weight: 1.5
    },
    {
        category: "System Context",
        name: "Code Style Guide",
        systemContext: "CODE STYLE GUIDE: Use only function declarations, never arrow functions. All variables must be declared with 'var'. No semicolons allowed.",
        prompt: "Write a simple function to add two numbers following the style guide.",
        expectations: [
            { type: "contains", value: "function" },
            { type: "contains", value: "var" },
            { type: "contains", value: "add" }
        ],
        weight: 1.5
    },
    {
        category: "Code Generation",
        name: "Add Express Route",
        prompt: "Given this Express app, add a GET route at '/health' that returns { status: 'ok' }.\n\nconst express = require('express');\nconst app = express();\n\n// Add route here\n\napp.listen(3000);",
        expectations: [
            { type: "contains", value: "app.get" },
            { type: "contains", value: "/health" },
            { type: "contains", value: "status" },
            { type: "contains", value: "ok" }
        ],
        weight: 1.5
    },
    {
        category: "Code Generation",
        name: "Add Redux Default Case",
        prompt: "Add a default case to this Redux reducer that returns the current state:\n\nfunction reducer(state = { count: 0 }, action) {\n  switch (action.type) {\n    case 'INC': return { count: state.count + 1 };\n    // Add default case here\n  }\n}",
        expectations: [
            { type: "contains", value: "default" },
            { type: "contains", value: "return state" }
        ],
        weight: 1.2
    },
    {
        category: "Technical",
        name: "Add YAML Service",
        prompt: "Add a 'redis' service using the 'redis:alpine' image to this docker-compose snippet:\n\nservices:\n  web:\n    image: node:18\n    ports:\n      - \"3000:3000\"\n# Add redis here",
        expectations: [
            { type: "contains", value: "redis:" },
            { type: "contains", value: "image: redis:alpine" }
        ],
        weight: 1.4
    },
    {
        category: "Code Generation",
        name: "Add React Mount Log",
        prompt: "Add a useEffect hook to this component that logs 'Mounted!' only once when the component mounts:\n\nfunction App() {\n  return <div>Hello</div>;\n}",
        expectations: [
            { type: "contains", value: "useEffect" },
            { type: "contains", value: "console.log" },
            { type: "contains", value: "Mounted" },
            { type: "contains", value: "[]" }
        ],
        weight: 1.5
    },
    {
        category: "Technical",
        name: "Add Env Variable",
        prompt: "Identify where to add a new 'DATABASE_URL' variable to this .env file and show the line:\n\nPORT=3000\nLOG_LEVEL=info",
        expectations: [
            { type: "contains", value: "DATABASE_URL=" }
        ],
        weight: 1.0
    },
    {
        category: "Code Generation",
        name: "Add Class Method",
        prompt: "Add a method called 'greet' to this class that returns 'Hello, my name is ' plus the name property:\n\nclass User {\n  constructor(name) { this.name = name; }\n}",
        expectations: [
            { type: "contains", value: "greet()" },
            { type: "contains", value: "return" },
            { type: "contains", value: "this.name" }
        ],
        weight: 1.2
    },
    {
        category: "Code Generation",
        name: "Add Zod Validation",
        prompt: "Add an 'email' field to this Zod schema that validates it is a string and a valid email format:\n\nconst schema = z.object({\n  name: z.string(),\n});",
        expectations: [
            { type: "contains", value: "email:" },
            { type: "contains", value: "z.string()" },
            { type: "contains", value: "email()" }
        ],
        weight: 1.3
    },
    {
        category: "Code Generation",
        name: "Add Python Decorator",
        prompt: "Add the '@app.route(\"/api\")' decorator to this Python function:\n\ndef get_api_data():\n    return {'data': 123}",
        expectations: [
            { type: "contains", value: "@app.route" },
            { type: "contains", value: "/api" }
        ],
        weight: 1.1
    },
    {
        category: "Technical",
        name: "Add npm Script",
        prompt: "Add a 'test:watch' script that runs 'jest --watch' to this package.json:\n\n{\n  \"scripts\": {\n    \"test\": \"jest\"\n  }\n}",
        expectations: [
            { type: "contains", value: "test:watch" },
            { type: "contains", value: "jest --watch" }
        ],
        weight: 1.2
    },
    {
        category: "Code Generation",
        name: "Add SQL Where Clause",
        prompt: "Modify this SQL query to only select users where 'active' is true:\n\nSELECT * FROM users;",
        expectations: [
            { type: "contains", value: "WHERE" },
            { type: "contains", value: "active" },
            { type: "contains", value: "true" }
        ],
        weight: 1.0
    },
    {
        category: "Formatting",
        name: "Add CSS Variable",
        prompt: "Add a CSS variable '--primary-color' with value '#3B82F6' to the :root selector:\n\n:root {\n  --font-size: 16px;\n}",
        expectations: [
            { type: "contains", value: "--primary-color" },
            { type: "contains", value: "#3B82F6" }
        ],
        weight: 1.0
    },
    {
        category: "Code Debugging",
        name: "Add Axios Catch",
        prompt: "Add a .catch() block to this axios call that logs the error message:\n\naxios.get('/api/users').then(res => console.log(res.data))",
        expectations: [
            { type: "contains", value: ".catch" },
            { type: "contains", value: "err" },
            { type: "contains", value: "console.log" },
            { type: "contains", value: "message" }
        ],
        weight: 1.3
    },
    {
        category: "Code Generation",
        name: "Add Interface Prop",
        prompt: "Add an optional 'age' property of type number to this TypeScript interface:\n\ninterface Person {\n  name: string;\n}",
        expectations: [
            { type: "contains", value: "age?:" },
            { type: "contains", value: "number" }
        ],
        weight: 1.2
    },
    {
        category: "Technical",
        name: "Add K8s Port",
        prompt: "Add port 8080 to the container ports in this Kubernetes manifest:\n\nspec:\n  containers:\n    - name: app\n      image: app:v1\n      # Add ports here",
        expectations: [
            { type: "contains", value: "ports:" },
            { type: "contains", value: "containerPort: 8080" }
        ],
        weight: 1.4
    },
    {
        category: "Code Generation",
        name: "Add Utility Function",
        prompt: "Implement a 'slugify' function that takes a string and returns it lowercase with spaces replaced by hyphens.",
        expectations: [
            { type: "contains", value: "toLowerCase()" },
            { type: "contains", value: "replace" },
            { type: "contains", value: "/ /g" },
            { type: "contains", value: "-" }
        ],
        weight: 1.5
    },
    {
        category: "High Context",
        name: "Meeting Minutes Extraction",
        prompt: `Read the following meeting minutes from the 'Project Phoenix' sync and extract:
        1. The date of the next milestone meeting.
        2. The person responsible for the 'Database Migration' task.
        3. The primary concern raised by the Frontend team.
        4. The name of the new testing framework being adopted.

        --- MEETING MINUTES ---
        August 15th, 2024 - Project Phoenix Weekly Sync
        Participants: Alice (Project Manager), Bob (Backend), Charlie (Frontend), Diana (QA)

        Agenda:
        - Review of Sprint 4 progress.
        - Database migration plan.
        - Frontend state management refactor.

        Discussion:
        Alice opened the meeting by confirming that the next milestone review is set for September 12th. 
        Bob provided an update on the Database Migration. He confirmed he will be leading this effort and expects it to be completed by next Tuesday.
        Charlie expressed a major concern regarding the performance of the current state management library when handling large datasets, noting that the 'Redux' overhead is noticeably hitting frame rates.
        Diana introduced 'Playwright' as the new end-to-end testing framework. The team agreed to switch from Cypress starting next month.

        Action Items:
        - Bob to finalize migration script.
        - Charlie to draft a proposal for 'Zustand' or 'Recoil'.
        --- END ---`,
        expectations: [
            { type: "contains", value: "September 12th" },
            { type: "contains", value: "Bob" },
            { type: "contains", value: "performance" },
            { type: "contains", value: "Playwright" }
        ],
        weight: 2.5
    },
    {
        category: "High Context",
        name: "API Spec Implementation",
        prompt: `Based on the following API specification, write a TypeScript function 'createUser' that uses the 'fetch' API to create a new user. The function should take 'username' and 'email' as arguments and return the parsed JSON response.

        --- API SPEC ---
        Endpoint: /api/v2/users
        Method: POST
        Headers:
          - Content-Type: application/json
          - X-API-Key: ENV_API_KEY
        Body:
          {
            "username": "string",
            "email": "string"
          }
        Success Response: 201 Created
        --- END ---`,
        expectations: [
            { type: "contains", value: "fetch" },
            { type: "contains", value: "POST" },
            { type: "contains", value: "/api/v2/users" },
            { type: "contains", value: "application/json" },
            { type: "contains", value: "X-API-Key" },
            { type: "contains", value: "JSON.stringify" }
        ],
        weight: 2.2
    },
    {
        category: "High Context",
        name: "Codebase Architectural Analysis",
        prompt: `Analyze the following description of a monorepo structure and answer:
        1. Which package contains the core business logic?
        2. Where are the shared UI components located?
        3. What technology is used for the API layer?

        --- CODEBASE DESCRIPTION ---
        Our 'Titan' monorepo is managed with TurboRepo. 
        - /apps/web: Next.js frontend application.
        - /apps/api: Fastify-based backend service providing GraphQL endpoints.
        - /packages/core: The source of truth for all business rules, domain entities, and data validation logic.
        - /packages/ui: A library of reusable React components styled with Tailwind CSS, used by all frontends.
        - /packages/config: Shared ESLint, Prettier, and TypeScript configurations.
        --- END ---`,
        expectations: [
            { type: "contains", value: "packages/core" },
            { type: "contains", value: "packages/ui" },
            { type: "contains", value: "Fastify" }
        ],
        weight: 2.0
    },
    {
        category: "High Context",
        name: "Security Audit Extraction",
        prompt: `Read the following security audit snippet and extract:
        1. The CVE identifier of the critical vulnerability.
        2. The name of the affected library.
        3. The suggested remediation step.

        --- SECURITY AUDIT ---
        Report ID: SEC-2024-08
        Severity: CRITICAL
        Vulnerability: Remote Code Execution (RCE) via insecure deserialization.
        Identifier: CVE-2024-34567
        Affected Component: 'nexus-logic' version 1.4.2 and below.
        Details: An attacker can send a crafted payload to the /process-data endpoint to execute arbitrary system commands.
        Remediation: Upgrade 'nexus-logic' to version 1.5.0 or higher immediately and rotate all service tokens.
        --- END ---`,
        expectations: [
            { type: "contains", value: "CVE-2024-34567" },
            { type: "contains", value: "nexus-logic" },
            { type: "contains", value: "Upgrade" }
        ],
        weight: 2.5
    }
];