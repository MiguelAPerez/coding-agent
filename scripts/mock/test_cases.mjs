export const models = [
    // 'llama3.2:latest',
    'ministral-3:8b',
    // 'dolphin3:8b',
    // 'qwen3-vl:8b',  11 slowest
    'ministral-3:14b',
    'qwen3:14b',
    // 'gpt-oss:20b',
    // 'gemma3:27b',
    'gemma3:4b',
    'qwen3-coder:30b',
    'qwen2.5-coder:7b',
    'qwen2.5-coder:14b',
    'mistral:latest'
];
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
        control: ["POST", "/message", "token", "message"],
        weight: 1
    },
    {
        category: "Code Generation",
        name: "React Hook",
        prompt: "Write a simple React useLocalStorage hook that takes a key and an initial value.",
        control: ["useState", "useEffect", "JSON.stringify", "localStorage.getItem"],
        weight: 1.5
    },
    {
        category: "Data Extraction",
        name: "Messy Log Parser",
        prompt: "Extract the IP address and the error message from this log line: '[2024-05-20 12:00:01] ERROR (192.168.1.45): Connection refused on port 8080'",
        control: ["192.168.1.45", "Connection refused"],
        weight: 1.2
    },
    {
        category: "Data Extraction",
        name: "Invoice Data",
        prompt: "Extract the Invoice Number, Date, and Total Amount from this text: 'Invoice #INV-2024-001 issued on 2024-10-15. The total due is $1,250.50. Please pay by the end of the month.'",
        control: ["INV-2024-001", "2024-10-15", "1,250.50"],
        weight: 1.5
    },
    {
        category: "Data Extraction",
        name: "Contact Info",
        prompt: "Extract the email and phone number from: 'For more information, contact support@example.com or call our hotline at +1-555-0199.'",
        control: ["support@example.com", "+1-555-0199"],
        weight: 1.2
    },
    {
        category: "Formatting",
        name: "Markdown Table",
        prompt: "Generate a markdown table with 3 columns: OS, Version, and Release Date. Poplate it with Windows 11, macOS Sonoma, and Ubuntu 24.04.",
        control: ["|", "---", "Windows 11", "Sonoma", "24.04"],
        weight: 1
    },
    {
        category: "Reasoning",
        name: "Logic Puzzle",
        prompt: "If all Bloops are Razzies and all Razzies are Lurgies, are all Bloops definitely Lurgies? Answer in one word.",
        control: ["Yes"],
        maxSentences: 1,
        weight: 1
    },
    {
        category: "Creative Writing",
        name: "Service Outage Email",
        prompt: "Write a short, professional email subject line for a planned maintenance window on Sunday at 2 AM.",
        control: ["Scheduled", "Maintenance", "Notification"],
        weight: 0.8
    },
    {
        category: "Creative Writing",
        name: "New Project README",
        prompt: "Write a brief README.md for a project called 'Skyline'. It's a weather tracking app. Include a description and a 'Getting Started' section with npm commands.",
        control: ["Skyline", "weather", "Getting Started", "npm install", "npm start"],
        weight: 1.5
    },
    {
        category: "Creative Writing",
        name: "Feature Announcement",
        prompt: "Write a short social media post (max 280 characters) announcing a new 'Dark Mode' feature for an app called 'Brightly'.",
        control: ["Dark Mode", "Brightly", "new feature"],
        weight: 1
    },
    {
        category: "Code Debugging",
        name: "JS Array Reference",
        prompt: "Find the bug in this code: const a = [1,2]; const b = a; b.push(3); console.log(a); Explain why 'a' changed.",
        control: ["reference", "memory", "shallow", "copy"],
        weight: 1.5
    },
    {
        category: "Summarization",
        name: "Docusaurus Meta",
        prompt: "Summarize what Docusaurus is in one concise sentence.",
        control: ["documentation", "static", "generator", "react"],
        maxSentences: 1,
        weight: 1
    },
    {
        category: "Summarization",
        name: "Quantum Computing",
        prompt: "Summarize the key concept of quantum superposition in three sentences or less.",
        control: ["multiple states", "simultaneously", "qubit"],
        maxSentences: 3,
        weight: 1.5
    },
    {
        category: "Summarization",
        name: "History of the Internet",
        prompt: "Provide a one-paragraph summary of how the internet evolved from ARPANET to the World Wide Web.",
        control: ["ARPANET", "packet switching", "TCP/IP", "Berners-Lee", "World Wide Web"],
        weight: 1.5
    },
    {
        category: "Security",
        name: "Env Variable Safety",
        prompt: "Why should you never commit .env files to GitHub? List the primary reason.",
        control: ["secrets", "credentials", "passwords", "security"],
        weight: 1.2
    },
    {
        category: "CLI Skills",
        name: "Git Revert vs Reset",
        prompt: "What is the difference between git revert and git reset --hard in terms of commit history?",
        control: ["new commit", "undo", "destructive", "history"],
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
        control: ["Azure", "2.4 million", "Sarah Chen", "AES-256-GCM"],
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
        control: ["WebAssembly", "JavaScript", "Rust", "performance", "native"],
        weight: 2.0
    },
    {
        category: "System Context",
        name: "Persona Adherence",
        systemContext: "You are a specialized technical support agent for 'NixOS'. You only provide answers related to NixOS configuration and package management. If asked about other operating systems, you politely decline and redirect the user back to NixOS.",
        prompt: "How do I install Discord on NixOS using flakes?",
        control: ["environment.systemPackages", "flake.nix", "nixpkgs"],
        weight: 1.5
    },
    {
        category: "System Context",
        name: "Internal Knowledge Retrieval",
        systemContext: "INTERNAL POLICY DOC: All employees must use 'Project Falcon' for tracking internal hours. The project code is FALCON-001. Reimbursements are only processed on the 15th of each month.",
        prompt: "What is the project code for tracking hours and when are reimbursements processed?",
        control: ["FALCON-001", "15th"],
        weight: 1.5
    },
    {
        category: "System Context",
        name: "Code Style Guide",
        systemContext: "CODE STYLE GUIDE: Use only function declarations, never arrow functions. All variables must be declared with 'var'. No semicolons allowed.",
        prompt: "Write a simple function to add two numbers following the style guide.",
        control: ["function", "var", "add"],
        weight: 1.5
    }
];