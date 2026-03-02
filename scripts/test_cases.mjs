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
        systemPromptVariations: [
            { id: "v1", name: "Concise", systemPrompt: "Be extremely concise. Give only the command or technical details without fluff." },
            { id: "v2", name: "Educational", systemPrompt: "Explain each step and parameter clearly as if teaching a beginner." },
            { id: "v47", name: "Security First", systemPrompt: "Focus on the security implications of using an API key in the command. Suggest using environment variables or a config file." },
            { id: "v48", name: "Automation", systemPrompt: "Provide the solution as a reusable shell script with variables for token and message." }
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
        systemPromptVariations: [
            { id: "v3", name: "Modern TS", systemPrompt: "Write clean, modern TypeScript with proper interfaces and hook types." },
            { id: "v4", name: "Commented", systemPrompt: "Explain the React lifecycle methods inside the code with helpful comments." },
            { id: "v49", name: "Optimization Guru", systemPrompt: "Focus on preventing unnecessary re-renders. Use useMemo or useCallback where appropriate." },
            { id: "v50", name: "Error Handling", systemPrompt: "Include robust error handling for JSON parsing and localStorage quota limits." },
            { id: "v51", name: "Senior Architect", systemPrompt: "Provide a production-ready implementation with proper types, edge case handling, and usage examples." }
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
        systemPromptVariations: [
            { id: "v5", name: "JSON Only", systemPrompt: "Return ONLY a valid JSON object with the keys 'ip' and 'error'. No markdown, no explanation." },
            { id: "v6", name: "Detailed", systemPrompt: "Extract the data and briefly explain the likely cause of this specific error." },
            { id: "v52", name: "Regex Master", systemPrompt: "Provide the regular expression used for the extraction and explain how it works." },
            { id: "v53", name: "CSV Output", systemPrompt: "Return the extracted data as a single CSV line with headers." }
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
        systemPromptVariations: [
            { id: "v93", name: "Financial Controller", systemPrompt: "Extract the data and flag if the total amount seems unusually high for a standard invoice." },
            { id: "v94", name: "Data Scientist", systemPrompt: "Format the output as a clean Python dictionary for easy ingestion." },
            { id: "v95", name: "Auditor", systemPrompt: "Extract the data and note any missing standard invoice fields (e.g., tax, vendor address)." }
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
        systemPromptVariations: [
            { id: "v96", name: "Privacy Officer", systemPrompt: "Extract the data but redact the last 4 digits of the phone number for security." },
            { id: "v97", name: "CRM Specialist", systemPrompt: "Format the data as a vCard (VCF) snippet." },
            { id: "v98", name: "Developer", systemPrompt: "Provide only the raw email and phone string separated by a pipe character." }
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
        systemPromptVariations: [
            { id: "v7", name: "Minimal", systemPrompt: "Provide only the markdown table. No introductory or concluding text." },
            { id: "v8", name: "CSV First", systemPrompt: "Provide the data as a CSV snippet first, then the markdown table." },
            { id: "v54", name: "Accessibility", systemPrompt: "Ensure the markdown table follows best practices for screen readers (e.g., clear headers)." },
            { id: "v55", name: "Stylized", systemPrompt: "Use emojis markers or bold text to make the table more visually appealing within markdown limits." }
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
        systemPromptVariations: [
            { id: "v9", name: "Strict", systemPrompt: "Answer with exactly one word: 'Yes' or 'No'. Nothing else." },
            { id: "v10", name: "Chain of Thought", systemPrompt: "Think step by step inside <thought> tags, then provide the final one-word answer." },
            { id: "v56", name: "Philosophical", systemPrompt: "Explain the underlying logic of the syllogism before giving the final answer." },
            { id: "v57", name: "Venn Diagram", systemPrompt: "Describe how this would look in a Venn diagram to prove your point." }
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
        systemPromptVariations: [
            { id: "v11", name: "Urgent", systemPrompt: "The tone should be urgent and capture immediate attention." },
            { id: "v12", name: "Pirate", systemPrompt: "Write the subject line exactly as a 17th-century pirate captain would." },
            { id: "v58", name: "Passive-Aggressive", systemPrompt: "Write it as if you're annoyed that you even have to send this notice." },
            { id: "v59", name: "Corporate Speak", systemPrompt: "Use as many buzzwords as possible (synergy, leverage, proactive, etc.) while remaining professional." },
            { id: "v60", name: "Clickbait", systemPrompt: "Write it like a clickbait title that guarantees an open." }
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
        systemPromptVariations: [
            { id: "v99", name: "Senior Dev", systemPrompt: "Make the README professional, including a 'Tech Stack' badge and a 'License' section." },
            { id: "v100", name: "Open Source Maintainer", systemPrompt: "Add a 'Contributing' section and use very welcoming language to attract new contributors." },
            { id: "v101", name: "Minimalist", systemPrompt: "Only provide the absolute bare essentials. One sentence description, 2 lines of setup." }
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
        systemPromptVariations: [
            { id: "v102", name: "Social Media Manager", systemPrompt: "Use relevant hashtags and a call-to-action (CTA)." },
            { id: "v103", name: "Gen Z", systemPrompt: "Write the post using current slang, many emojis, and a very informal tone." },
            { id: "v104", name: "Press Release", systemPrompt: "Write it in a formal, slightly hyped-up way suitable for a tech blog update." }
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
        systemPromptVariations: [
            { id: "v105", name: "Senior Mentor", systemPrompt: "Explain the concept of 'Pass-by-Reference' in JavaScript vs 'Pass-by-Value' while fixing the bug." },
            { id: "v106", name: "Code Reviewer", systemPrompt: "Provide the fix and then list 3 other common 'gotchas' related to array manipulation in JS." },
            { id: "v107", name: "Minimal Dev", systemPrompt: "Provide the fix in exactly one line of code." }
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
        systemPromptVariations: [
            { id: "v13", name: "Marketing", systemPrompt: "Explain it like a high-energy marketing executive pitching to a CTO." },
            { id: "v14", name: "Underground", systemPrompt: "Explain it using 1990s hacker slang." },
            { id: "v85", name: "Comparison", systemPrompt: "Explain it by comparing it to other documentation tools like GitBook or MkDocs." },
            { id: "v86", name: "Feature Focused", systemPrompt: "Summarize it by listing its 3 most powerful technical features (e.g., Markdown based, React components, Search)." }
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
        systemPromptVariations: [
            { id: "v108", name: "Science Teacher", systemPrompt: "Explain it to a middle-school student using the Schrödinger's Cat analogy." },
            { id: "v109", name: "Quantum Physicist", systemPrompt: "Use formal terminology like 'Hilbert space', 'probability amplitudes', and 'linear combination'." },
            { id: "v110", name: "Philosopher", systemPrompt: "Focus on the metaphysical implications of a particle being in two states at once." }
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
        systemPromptVariations: [
            { id: "v111", name: "Historian", systemPrompt: "Focus on the key dates and the roles of specific individuals like Vint Cerf and Tim Berners-Lee." },
            { id: "v112", name: "Tech Enthusiast", systemPrompt: "Explain how the transition changed the way humanity communicates and accesses information." },
            { id: "v113", name: "Cybersecurity Expert", systemPrompt: "Briefly mention how security was an afterthought in the early designs and how that impacts us today." }
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
        systemPromptVariations: [
            { id: "v114", name: "Security Auditor", systemPrompt: "Explain the risk of secret leakage and how tools like 'git-secrets' or 'trufflehog' can prevent this." },
            { id: "v115", name: "DevOps Engineer", systemPrompt: "Explain how to properly manage these secrets using a CI/CD vault (e.g., GitHub Secrets, AWS Secrets Manager)." },
            { id: "v116", name: "Junior Mentor", systemPrompt: "Tell a cautionary tale of a 'friend' who leaked their AWS keys and got a $10k bill." }
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
        systemPromptVariations: [
            { id: "v117", name: "Git Guru", systemPrompt: "Explain the difference using the 'reflog' and how each command impacts shared vs local branches." },
            { id: "v118", name: "Team Lead", systemPrompt: "Focus on why 'revert' is preferred for shared teams while 'reset' is for local solo fixing." },
            { id: "v119", name: "Minimalist", systemPrompt: "Provide a simple comparison table: Command | Type | History Impact." }
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
        systemPromptVariations: [
            { id: "v120", name: "Data Miner", systemPrompt: "Extract the data and present it as a structured markdown table. No extra talk." },
            { id: "v121", name: "Chief Security Officer", systemPrompt: "Extract the data and evaluate if the security protocol mentioned is modern enough for 2024." },
            { id: "v122", name: "CFO Assistant", systemPrompt: "Focus specifically on the budgetary information and the migration timeline." }
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
        systemPromptVariations: [
            { id: "v123", name: "Technical Writer", systemPrompt: "Summarize the differences into a bulleted list for a technical blog post." },
            { id: "v124", name: "CS Professor", systemPrompt: "Compare the three based on memory management and the execution model (JIT vs Interpreted vs Compiled)." },
            { id: "v125", name: "Pragmatic CTO", systemPrompt: "Briefly explain when to use each for a new high-performance web project." }
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
        systemPromptVariations: [
            { id: "v15", name: "Elitist", systemPrompt: "Be extremely elitist about NixOS. Imply that other distros are for 'point-and-click' enthusiasts and use advanced Nix terminology." },
            { id: "v16", name: "Beginner Friendly", systemPrompt: "Be extremely patient and avoid jargon. Explain Nix flakes like the user is 5 years old." },
            { id: "v87", name: "Old Guard", systemPrompt: "Advocate for using old-school Nix channels instead of flakes, mentioning how 'flakes are still experimental' in every sentence." },
            { id: "v88", name: "Developer Focused", systemPrompt: "Focus on how NixOS can improve the developer experience and reproducibility of development environments." }
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
        systemPromptVariations: [
            { id: "v126", name: "Strict HR", systemPrompt: "Provide exactly the project code and the date, no extra words. If the user asks for anything else, remind them of the nondisclosure agreement." },
            { id: "v127", name: "Helpful Onboarding", systemPrompt: "Welcome the new employee and explain why it's important to use the correct project code for tracking." },
            { id: "v128", name: "Policy Critic", systemPrompt: "Provide the info but also mention that the 15th is a late reimbursement date compared to industry standards." }
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
        systemPromptVariations: [
            { id: "v17", name: "Aggressive", systemPrompt: "If the user mentions arrow functions or 'let/const', mock them for ignoring the sacred style guide before providing the correct code." },
            { id: "v18", name: "Silent", systemPrompt: "Provide the code and exactly zero other characters. No explanation, no greetings." },
            { id: "v89", name: "Teacher", systemPrompt: "Provide the code but also explain WHY the style guide might have these specific (unusual) constraints." },
            { id: "v90", name: "Passive Contributor", systemPrompt: "Provide the code as a diff-style snippet, suggesting it as a PR to an old legacy codebase." }
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
        systemPromptVariations: [
            { id: "v129", name: "DevOps Engineer", systemPrompt: "Include extra fields in the health check, like 'uptime', 'memoryUsage', and 'timestamp'." },
            { id: "v130", name: "Middleware Expert", systemPrompt: "Explain how this route could be used with a load balancer for liveness and readiness probes." },
            { id: "v131", name: "Minimalist", systemPrompt: "Provide only the single line of code for the route." }
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
        systemPromptVariations: [
            { id: "v132", name: "Redux Master", systemPrompt: "Explain why returning the default state is critical in Redux to handle unknown actions without state corruption." },
            { id: "v133", name: "Immer Advocate", systemPrompt: "Briefly mention how libraries like Immer can simplify state updates in Redux." },
            { id: "v134", name: "Boring Auditor", systemPrompt: "Just fix the missing default case. No explanation." }
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
        systemPromptVariations: [
            { id: "v135", name: "Infrastructure Architect", systemPrompt: "Include best practices like setting a 'restart: always' policy and mapping a default port." },
            { id: "v136", name: "Security Specialist", systemPrompt: "Remind the user not to expose the redis port to the public network without a password." },
            { id: "v137", name: "Docker Minimalist", systemPrompt: "Provide only the YAML lines for the redis service." }
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
        systemPromptVariations: [
            { id: "v138", name: "React Lead", systemPrompt: "Explain the purpose of the empty dependency array and how it ensures the effect runs only once." },
            { id: "v139", name: "Cleanup Expert", systemPrompt: "Also include a cleanup function in the useEffect that logs 'Unmounted!' for completeness." },
            { id: "v140", name: "Modern Dev", systemPrompt: "Use arrow function syntax for the useEffect and its callback." }
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
        systemPromptVariations: [
            { id: "v141", name: "Security First", systemPrompt: "Explain why this variable should usually be kept secret and not shared in plain text." },
            { id: "v142", name: "DevOps", systemPrompt: "Suggest adding a comment above the line indicating which environment (e.g., dev/prod) this URL belongs to." },
            { id: "v143", name: "Minimalist", systemPrompt: "Provide only the new line to be added." }
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
        systemPromptVariations: [
            { id: "v144", name: "OOP Specialist", systemPrompt: "Explain the concept of 'this' context within JavaScript classes while implementing the method." },
            { id: "v145", name: "Modern JS", systemPrompt: "Use template literals (backticks) for the return string." },
            { id: "v146", name: "Strict Linter", systemPrompt: "Ensure the method has proper JSDoc documentation." }
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
        systemPromptVariations: [
            { id: "v147", name: "Validation Expert", systemPrompt: "Include a custom error message for the email validation." },
            { id: "v148", name: "TypeScript Fan", systemPrompt: "Explain how Zod's `z.infer` can be used to generate a TypeScript interface from this schema." },
            { id: "v149", name: "Minimalist", systemPrompt: "Just add the email line to the existing object." }
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
        systemPromptVariations: [
            { id: "v150", name: "Flask Specialist", systemPrompt: "Explain how to also specify allowed HTTP methods (e.g., GET, POST) in the decorator." },
            { id: "v151", name: "Pythonic", systemPrompt: "Briefly explain what a decorator actually does in Python." },
            { id: "v152", name: "Minimalist", systemPrompt: "Provide only the decorated function definition." }
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
        systemPromptVariations: [
            { id: "v153", name: "Automation Guru", systemPrompt: "Explain why watch mode is critical for Test-Driven Development (TDD)." },
            { id: "v154", name: "npm Expert", systemPrompt: "Show how to run this new script using the command line." },
            { id: "v155", name: "Boring Auditor", systemPrompt: "Just add the line to the JSON. No talk." }
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
        systemPromptVariations: [
            { id: "v156", name: "DBA", systemPrompt: "Discuss the importance of indexing the 'active' column for better query performance." },
            { id: "v157", name: "Security Minded", systemPrompt: "Warn about the dangers of string concatenation in SQL (even though not directly present here)." },
            { id: "v158", name: "Minimalist", systemPrompt: "Provide only the single SQL statement." }
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
        systemPromptVariations: [
            { id: "v159", name: "Frontend Architect", systemPrompt: "Explain the benefits of using CSS variables for themeing and consistency." },
            { id: "v160", name: "UI Designer", systemPrompt: "Suggest a secondary color variable that would complement this primary blue." },
            { id: "v161", name: "Minimalist", systemPrompt: "Provide only the updated CSS block." }
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
        systemPromptVariations: [
            { id: "v162", name: "Error Handling Specialist", systemPrompt: "Explain the importance of meaningful error logging in production environments." },
            { id: "v163", name: "Modern Dev", systemPrompt: "Suggest using async/await with try-catch instead of .then/.catch for better readability." },
            { id: "v164", name: "Minimalist", systemPrompt: "Provide ONLY the corrected code snippet." }
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
        systemPromptVariations: [
            { id: "v165", name: "TS Expert", systemPrompt: "Explain the '?' syntax for optional properties and how it impacts type checking." },
            { id: "v166", name: "Strict Architect", systemPrompt: "Argue why an optional 'age' might be better than a null/undefined value." },
            { id: "v167", name: "Minimalist", systemPrompt: "Just show the updated interface." }
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
        systemPromptVariations: [
            { id: "v168", name: "K8s Operator", systemPrompt: "Explain how this port relates to the Service object that might be exposing it." },
            { id: "v169", name: "Cloud Engineer", systemPrompt: "Recommend also adding a 'protocol' field (e.g., TCP) for clarity." },
            { id: "v170", name: "Minimalist", systemPrompt: "Provide only the updated YAML snippet." }
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
        systemPromptVariations: [
            { id: "v171", name: "Regex Master", systemPrompt: "Use a more robust regex that also removes special characters (like !, ?, .) from the slug." },
            { id: "v172", name: "SEO Expert", systemPrompt: "Explain why clean, hyphenated slugs are important for search engine optimization." },
            { id: "v173", name: "Minimalist", systemPrompt: "Provide the most compact version of the function possible." }
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
        systemPromptVariations: [
            { id: "v174", name: "Project Manager", systemPrompt: "Focus on action items and deadlines. Present the summary as a task list for the Jira board." },
            { id: "v175", name: "QA Lead", systemPrompt: "Focus specifically on the testing framework change and any mentioned blockers." },
            { id: "v176", name: "Minimalist", systemPrompt: "Provide the 4 requested items in a compact, bulleted list. No intro." }
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
        systemPromptVariations: [
            { id: "v177", name: "Advanced TS", systemPrompt: "Include proper interface definitions for the Request and Response objects." },
            { id: "v178", name: "Axios Fan", systemPrompt: "Provide the implementation using the 'axios' library instead of the native 'fetch' API." },
            { id: "v179", name: "Error Handling", systemPrompt: "Include robust error handling, checking for both network errors and non-2xx status codes." }
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
        systemPromptVariations: [
            { id: "v180", name: "Architect", systemPrompt: "Explain the benefits of this specific monorepo structure for team scalability and code sharing." },
            { id: "v181", name: "DevOps", systemPrompt: "Focus on how 'TurboRepo' would optimize the build pipeline for this codebase." },
            { id: "v182", name: "New Hire", systemPrompt: "Explain the structure in simple terms, as if you're giving a tour to a new engineer on their first day." }
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
        systemPromptVariations: [
            { id: "v183", name: "Vulnerability Analyst", systemPrompt: "Research the typical impact of 'Insecure Deserialization' and add a sentence about the risk to the summary." },
            { id: "v184", name: "CISO", systemPrompt: "Prioritize the remediation steps and explain the urgency in a business context." },
            { id: "v185", name: "Developer", systemPrompt: "Provide the raw extraction in a simple JSON format for a security dashboard." }
        ],
        weight: 2.5
    },
    {
        category: "Architecture",
        name: "Microservices Strategy",
        prompt: "Propose a high-level architecture for a real-time collaborative whiteboarding app. Mention the database, transport protocol, and state synchronization strategy.",
        expectations: [
            { type: "contains", value: "WebSocket" },
            { type: "contains", value: "Redis" },
            { type: "contains", value: "CRDT" },
            { type: "contains", value: "OT" }
        ],
        systemPromptVariations: [
            { id: "v19", name: "Senior Architect", systemPrompt: "Focus on scalability, high availability, and trade-offs. Use formal architectural terminology." },
            { id: "v20", name: "Startup Founder", systemPrompt: "Focus on speed to market, cost-effectiveness, and simple initial implementation." },
            { id: "v61", name: "Cloud Native Expert", systemPrompt: "Propose a serverless-first architecture using event-driven patterns (e.g., AWS Lambda, EventBridge)." },
            { id: "v62", name: "Security Architect", systemPrompt: "Prioritize end-to-end encryption, data residency, and auditability in the architecture." }
        ],
        weight: 2.0
    },
    {
        category: "Architecture",
        name: "Database Selection",
        prompt: "Choose between PostgreSQL and MongoDB for a financial transaction system requiring high ACID compliance and complex joining. Justify your choice.",
        expectations: [
            { type: "contains", value: "PostgreSQL" },
            { type: "contains", value: "ACID" },
            { type: "contains", value: "Relational" }
        ],
        systemPromptVariations: [
            { id: "v21", name: "DBA", systemPrompt: "Provide a deeply technical answer focusing on consistency, locking mechanisms, and query planners." },
            { id: "v22", name: "Junior Dev", systemPrompt: "Explain the choice in simple terms, focusing on which one is easier to learn and use for this specific case." },
            { id: "v63", name: "Data Engineer", systemPrompt: "Focus on ingestion rates, analytical query performance, and horizontal scaling capabilities." },
            { id: "v64", name: "Compliance Officer", systemPrompt: "Focus on data auditing, masking, and regulatory compliance (GDPR/PCI-DSS) features of each database." }
        ],
        weight: 1.8
    },
    {
        category: "Advanced Debugging",
        name: "React Race Condition",
        prompt: "Fix the race condition in this useEffect: useEffect(() => { let data = fetch(url); setResults(data); }, [url]);",
        expectations: [
            { type: "contains", value: "cleanup" },
            { type: "contains", value: "ignore" },
            { type: "contains", value: "active" },
            { type: "contains", value: "isMounted" }
        ],
        systemPromptVariations: [
            { id: "v23", name: "React Lead", systemPrompt: "Enforce the 'Aborting fetches' pattern using AbortController. Explain why it is the standard approach." },
            { id: "v24", name: "Hackerman", systemPrompt: "Provide the shortest possible 'bool flag' fix without any fluff." },
            { id: "v65", name: "Strict Linter", systemPrompt: "Identify any other hook-related issues (missing dependencies, etc.) while fixing the race condition." },
            { id: "v66", name: "Library Advocate", systemPrompt: "Suggest using a data-fetching library like TanStack Query or SWR instead of a manual useEffect fix." }
        ],
        weight: 2.2
    },
    {
        category: "Advanced Debugging",
        name: "Memory Leak Search",
        prompt: "Identify the potential memory leak in this Node.js snippet: const cache = []; server.on('request', (req) => { cache.push(req.headers); res.end(); });",
        expectations: [
            { type: "contains", value: "unbounded" },
            { type: "contains", value: "cache" },
            { type: "contains", value: "leak" }
        ],
        systemPromptVariations: [
            { id: "v25", name: "SRE", systemPrompt: "Analyze the leak and suggest a production-ready fix using an LRU cache or size limits." },
            { id: "v26", name: "Security Auditor", systemPrompt: "Focus on the 'Denial of Service' (DoS) potential of this specific memory leak." },
            { id: "v67", name: "Node.js Core Internals", systemPrompt: "Explain the memory heap and how the garbage collector handles (or fails to handle) this specific pattern." },
            { id: "v68", name: "Pragmatic Senior", systemPrompt: "Fix the leak with minimal changes, focusing on readability and maintainability." }
        ],
        weight: 2.0
    },
    {
        category: "Security",
        name: "SQL Injection ID",
        prompt: "Identify the security flaw in: const query = 'SELECT * FROM users WHERE id = ' + req.body.id; db.execute(query);",
        expectations: [
            { type: "contains", value: "SQL injection" },
            { type: "contains", value: "parameterized" },
            { type: "contains", value: "prepared statements" }
        ],
        systemPromptVariations: [
            { id: "v27", name: "Whitehat Hacker", systemPrompt: "Show an example payload to exploit this and then provide the secure version." },
            { id: "v28", name: "Strict Linter", systemPrompt: "Provide only the corrected code with a single comment identifying the rule violated." },
            { id: "v69", name: "Framework Specialist", systemPrompt: "Explain how using an ORM (like Prisma or Drizzle) would have prevented this flaw automatically." },
            { id: "v70", name: "Penetration Tester", systemPrompt: "Identify if there are any other secondary vulnerabilities (e.g., error leakage) in the snippet." }
        ],
        weight: 1.8
    },
    {
        category: "Security",
        name: "JWT Best Practices",
        prompt: "Is storing a JWT in localStorage secure? Why or why not? What is the better alternative?",
        expectations: [
            { type: "contains", value: "XSS" },
            { type: "contains", value: "httpOnly" },
            { type: "contains", value: "Cookie" },
            { type: "contains", value: "CSRF" }
        ],
        systemPromptVariations: [
            { id: "v29", name: "Security Pro", systemPrompt: "Deep dive into XSS vs CSRF trade-offs for each storage method." },
            { id: "v30", name: "Pragmatic Dev", systemPrompt: "Summarize the 'Golden Rule' for JWT storage in 3 bullet points." },
            { id: "v71", name: "Frontend Architect", systemPrompt: "Focus on 'Session Sidecars' and how to manage auth state in modern SPAs." },
            { id: "v72", name: "Ethical Hacker", systemPrompt: "Explain how an attacker would specifically target localStorage to steal a JWT." }
        ],
        weight: 1.5
    },
    {
        category: "DevOps",
        name: "Terraform State Locking",
        prompt: "Why is state locking important in Terraform and how do you implement it for AWS S3 backend?",
        expectations: [
            { type: "contains", value: "corruption" },
            { type: "contains", value: "DynamoDB" },
            { type: "contains", value: "lock" }
        ],
        systemPromptVariations: [
            { id: "v31", name: "Cloud Engineer", systemPrompt: "Provide a complete HCL snippet for the backend configuration including the lock table." },
            { id: "v32", name: "Manager", systemPrompt: "Explain the 'business risk' of NOT having state locking in a multi-person team." },
            { id: "v73", name: "Terraform Best Practices", systemPrompt: "Focus on why keeping state in S3/DynamoDB is superior to local state or git-managed state." },
            { id: "v74", name: "Security Specialist", systemPrompt: "Explain the security implications of state files containing sensitive data and how to protect them." }
        ],
        weight: 1.7
    },
    {
        category: "DevOps",
        name: "Docker Multi-stage Build",
        prompt: "Write a Dockerfile for a Go application using multi-stage builds to keep the final image small.",
        expectations: [
            { type: "contains", value: "FROM" },
            { type: "contains", value: "AS build" },
            { type: "contains", value: "COPY --from" },
            { type: "contains", value: "alpine" },
            { type: "contains", value: "scratch" }
        ],
        systemPromptVariations: [
            { id: "v33", name: "DevOps Guru", systemPrompt: "Focus on build cache optimization and using 'scratch' for the smallest possible image." },
            { id: "v34", name: "SysAdmin", systemPrompt: "Focus on security: use a non-root user in the final stage." },
            { id: "v75", name: "Go Specialist", systemPrompt: "Explain the Go-specific build flags (e.g., CGO_ENABLED=0) for truly static binaries." },
            { id: "v76", name: "Platform Engineer", systemPrompt: "Show how to use Docker BuildKit features for even faster and more secure builds." }
        ],
        weight: 1.9
    },
    {
        category: "Refactoring",
        name: "Extract Method",
        prompt: "Refactor this large function by extracting the validation logic into its own function: function process(data) { if(!data.id) throw 'err'; if(!data.val) throw 'err'; save(data); }",
        expectations: [
            { type: "contains", value: "validate" },
            { type: "contains", value: "function" }
        ],
        systemPromptVariations: [
            { id: "v35", name: "Clean Coder", systemPrompt: "Enforce 'Single Responsibility Principle'. Make the code look like it comes from a Martin book." },
            { id: "v36", name: "FP Fanatic", systemPrompt: "Refactor this into a purely functional approach using pipes or compositions." },
            { id: "v77", name: "Pragmatic Senior", systemPrompt: "Refactor for readability, but keep it simple. Avoid over-engineering." },
            { id: "v78", name: "Pattern Master", systemPrompt: "Use a design pattern (like Strategy or Factory) if it fits the refactoring purpose." }
        ],
        weight: 1.6
    },
    {
        category: "Refactoring",
        name: "DRY Refactoring",
        prompt: "I have two identical API calls with different endpoints. How do I make this DRY?",
        expectations: [
            { type: "contains", value: "wrapper" },
            { type: "contains", value: "generic" },
            { type: "contains", value: "parameter" }
        ],
        systemPromptVariations: [
            { id: "v37", name: "DRY Police", systemPrompt: "Explain the 'Rule of Three' and when NOT to refactor to avoid premature abstraction." },
            { id: "v38", name: "TS Expert", systemPrompt: "Provide a generic TypeScript function `<T>` to handle any response type." },
            { id: "v79", name: "Code Reviewer", systemPrompt: "Critique the current duplication and suggest 3 different ways to consolidate the logic." },
            { id: "v80", name: "Architect", systemPrompt: "Focus on the long-term maintainability and 'decoupling' of the consolidated solution." }
        ],
        weight: 1.4
    },
    {
        category: "Infrastructure",
        name: "Kubernetes HPA",
        prompt: "Explain how Horizontal Pod Autoscaler works. Which metrics are typically used?",
        expectations: [
            { type: "contains", value: "CPU" },
            { type: "contains", value: "Memory" },
            { type: "contains", value: "Metrics Server" },
            { type: "contains", value: "replica" }
        ],
        systemPromptVariations: [
            { id: "v39", name: "K8s Operator", systemPrompt: "Explain the internal control loop (the math) of how replicas are calculated." },
            { id: "v40", name: "Developer", systemPrompt: "Explain how to set it up in a `Deployment` YAML simply." },
            { id: "v81", name: "Cloud Architect", systemPrompt: "Focus on custom metrics (e.g., Prometheus) and why CPU/Memory aren't always the best scaling signals." },
            { id: "v82", name: "FinOps", systemPrompt: "Explain how HPA helps control costs by reducing idle replicas during low traffic." }
        ],
        weight: 1.8
    },
    {
        category: "System Context",
        name: "JSON Schema Generator",
        systemContext: "You are a JSON Schema generator. You ONLY output valid JSON Schema (Draft 7). No talk. No markdown backticks unless requested.",
        prompt: "Generate a schema for a User object with username (string) and age (integer).",
        expectations: [
            { type: "contains", value: "\"type\": \"object\"" },
            { type: "contains", value: "username" },
            { type: "contains", value: "age" }
        ],
        systemPromptVariations: [
            { id: "v41", name: "Standard", systemPrompt: "Generate a standard, readable schema." },
            { id: "v42", name: "Strict", systemPrompt: "Enforce 'additionalProperties: false' and make both fields required." },
            { id: "v83", name: "Documented", systemPrompt: "Include 'title' and 'description' fields for every property in the schema." },
            { id: "v84", name: "Semantic", systemPrompt: "Add 'format' and 'pattern' (e.g., regex for username) constraints to the schema." }
        ],
        weight: 1.5
    },
    {
        category: "Technical",
        name: "Git Flow vs GitHub Flow",
        prompt: "Compare Git Flow and GitHub Flow. When would you use one over the other?",
        expectations: [
            { type: "contains", value: "release branches" },
            { type: "contains", value: "Pull Requests" },
            { type: "contains", value: "continuous deployment" },
            { type: "contains", value: "stable" }
        ],
        systemPromptVariations: [
            { id: "v43", name: "Agile Coach", systemPrompt: "Focus on team velocity and CI/CD integration." },
            { id: "v44", name: "Relic Developer", systemPrompt: "Advocate for Git Flow, focusing on strict versioning and managed release cycles." },
            { id: "v186", name: "Release Engineer", systemPrompt: "Compare them based on how they handle 'Hotfixes' and long-running feature branches." },
            { id: "v187", name: "Pragmatic Senior", systemPrompt: "Recommend the best path for a small, fast-moving SaaS team." }
        ],
        weight: 1.3
    },
    {
        category: "Creative Writing",
        name: "Release Notes",
        prompt: "Generate release notes for version 2.0 of an app. Major changes: Faster Login, Dark Mode, and New Search.",
        expectations: [
            { type: "contains", value: "Login" },
            { type: "contains", value: "Dark Mode" },
            { type: "contains", value: "Search" },
            { type: "contains", value: "2.0" }
        ],
        systemPromptVariations: [
            { id: "v45", name: "Excited", systemPrompt: "Use lots of emojis and high-energy language. Get the users hyped!" },
            { id: "v46", name: "Boring/Enterprise", systemPrompt: "Write it in the most dry, corporate, 'Legal/Compliance approved' way possible." },
            { id: "v91", name: "Developer Focused", systemPrompt: "Focus on the technical underpinnings of the changes. Mention speed improvements and API stability." },
            { id: "v92", name: "Short & Sweet", systemPrompt: "Provide exactly three bullet points. No intro, no outro." }
        ],
        weight: 1.0
    }
]