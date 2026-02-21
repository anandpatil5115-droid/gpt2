/**
 * Retro-Analog Terminal Logic
 * Handles high-contrast text generation with typewriter effects.
 */

const API_URL = "https://api-inference.huggingface.co/models/openai-community/gpt2";

// Application State
let hfApiKey = "";

// DOM Elements - Modal
const apiModal = document.getElementById('api-modal');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');

// DOM Elements - App Dashboard
const appContainer = document.getElementById('app-container');
const resetKeyBtn = document.getElementById('reset-key-btn');
const promptInput = document.getElementById('prompt-input');
const generateBtn = document.getElementById('generate-btn');
const btnText = generateBtn.querySelector('.btn-text');
const loader = generateBtn.querySelector('.loader');

// DOM Elements - Screen area
const outputContainer = document.getElementById('output-container');
const outputText = document.getElementById('output-text');
const bootStatus = document.getElementById('boot-status');
const copyBtn = document.getElementById('copy-btn');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');

/**
 * TYPEWRITER EFFECT
 * Simulates a hardware terminal typing out data
 */
function typewriterType(element, text, speed = 20) {
    element.textContent = "";
    let i = 0;

    // Smooth scroll to bottom of screen as text appears
    const scrollInterval = setInterval(() => {
        const glass = document.querySelector('.screen-glass');
        glass.scrollTop = glass.scrollHeight;
    }, 100);

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            clearInterval(scrollInterval);
        }
    }
    type();
}

/**
 * INITIALIZATION & AUTH
 */

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
        alert("Authorization Token required for manual override.");
        return;
    }
    hfApiKey = key;
    apiModal.style.display = 'none';
    appContainer.style.display = 'flex';
    promptInput.focus();
});

resetKeyBtn.addEventListener('click', () => {
    hfApiKey = "";
    appContainer.style.display = 'none';
    apiModal.style.display = 'flex';
    apiKeyInput.value = "";
    apiKeyInput.focus();
});

/**
 * AI GENERATION LOGIC
 */

async function executeTerminalTask() {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showError("CMD_ERROR: PLS ENTER NEURAL PROMPT");
        return;
    }

    // Reset UI State
    hideError();
    setLoading(true);
    bootStatus.style.display = 'none';
    outputContainer.style.display = 'none';

    try {
        // Technical connectivity check
        if (!navigator.onLine) {
            throw new Error("OFFLINE_ERROR: NO_INTERNET_DETECTED");
        }

        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors", // Explicitly enable CORS
            headers: {
                "Authorization": `Bearer ${hfApiKey.trim()}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 250,
                    temperature: 0.8,
                    return_full_text: false
                },
                options: {
                    wait_for_model: true
                }
            }),
        });

        // Basic check for response existence
        if (!response) {
            throw new Error("NET_ERROR: NO_RESPONSE_FROM_HUB");
        }

        // Handle technical HTTP errors
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            let msg = "SYS_CRITICAL: GEN_FAILED";
            if (response.status === 401) msg = "AUTH_DENIED: INVALID_TOKEN";
            else if (response.status === 429) msg = "BANDWIDTH_ERR: LIMIT_REACHED";
            else if (response.status === 503) msg = "HUB_OVERLOAD: MODEL_LOADING";
            else msg = data.error || `HTTP_ERR_${response.status}`;
            throw new Error(msg);
        }

        const data = await response.json();
        const generatedText = Array.isArray(data) ? data[0].generated_text : data.generated_text;

        if (!generatedText) {
            throw new Error("EMPTY_DATA_BUFFER: TRY_AGAIN");
        }

        // Success flow
        outputContainer.style.display = 'block';
        typewriterType(outputText, generatedText);

    } catch (error) {
        console.group("Terminal Task Debug Log");
        console.error("System Error Type:", error.name);
        console.error("Error Message:", error.message);
        console.error("Stack Trace:", error.stack);
        console.groupEnd();

        let displayMsg = error.message;
        if (displayMsg === "Failed to fetch") {
            displayMsg = "CONN_ERROR: HUB_UNREACHABLE (CHECK FIREWALL/ANTIVIRUS)";
        }

        showError(displayMsg);
        bootStatus.style.display = 'flex';
    } finally {
        setLoading(false);
    }
}

/**
 * UI HELPERS
 */

function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    if (isLoading) {
        btnText.style.display = 'none';
        loader.style.display = 'inline-block';
    } else {
        btnText.style.display = 'inline-block';
        loader.style.display = 'none';
    }
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorContainer.style.display = 'block';
}

function hideError() {
    errorContainer.style.display = 'none';
}

/**
 * CONNECTIVITY DIAGNOSTICS
 */
async function runDiagnostics() {
    outputContainer.style.display = 'block';
    bootStatus.style.display = 'none';
    outputText.textContent = "RUNNING_SYSTEM_DIAGNOSTICS...\n\n";

    const log = (msg) => outputText.textContent += `[DIAG] ${msg}\n`;

    log(`BOM_STATUS: ${navigator.onLine ? "ONLINE" : "OFFLINE"}`);
    log(`PROTOCOL: ${window.location.protocol}`);

    if (window.location.protocol === 'file:') {
        log("WARN: FILE_PROTOCOL detected. Some browsers block cross-origin requests from local files.");
    }

    try {
        log("TESTING: CORE_INTERNET_REACHABILITY (google.com)...");
        await fetch("https://www.google.com", { mode: 'no-cors' });
        log("PASS: NET_FOUND");
    } catch (e) {
        log("FAIL: NET_REACH_ERROR");
    }

    try {
        log("TESTING: HF_HUB_CONNECTIVITY...");
        const hfRes = await fetch("https://huggingface.co", { mode: 'no-cors' });
        log("PASS: HUB_REACHED");
    } catch (e) {
        log("FAIL: HUB_UNREACHABLE (POSSIBLE_DNS_OR_FIREWALL)");
    }

    try {
        log("TESTING: API_SUBDOMAIN_REACHABILITY...");
        // Test if the API subdomain itself is even pingable via a simple image request or no-cors fetch
        await fetch("https://api-inference.huggingface.co", { mode: 'no-cors' });
        log("PASS: API_SUBDOMAIN_FOUND");

        log("TESTING: API_PHYSICAL_HANDSHAKE...");
        const apiRes = await fetch("https://huggingface.co/openai-community/gpt2", { mode: 'no-cors' });
        log(`PASS: SUBDOMAIN_REACHED`);

        log("TESTING: API_PREFLIGHT_AUTH...");
        // Check if the actual Inference API responds to a simple ping
        const pingRes = await fetch(API_URL, { method: 'GET' });
        log(`PASS: API_STATUS_${pingRes.status}`);
    } catch (e) {
        log("FAIL: SUBSYSTEM_BLOCK_DETECTED");
        log(`ERR_DATA: ${e.message}`);
        log("ANALYSIS: Your system or browser is specifically killing the API connection.");
        log("ACTION: 1. Whitelist 'api-inference.huggingface.co' in your Antivirus/Firewall.");
        log("ACTION: 2. If using a Corporate/School network, the API subdomain might be restricted.");
        log("ACTION: 3. Try a different browser (e.g., Firefox if on Chrome).");
    }


    log("\nDIAGNOSTICS_COMPLETE.");
}

/**
 * GLOBAL LISTENERS
 */

generateBtn.addEventListener('click', executeTerminalTask);
document.getElementById('run-diag-btn').addEventListener('click', runDiagnostics);


copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(outputText.textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "DATA_COPIED";
        setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
    });
});

promptInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        executeTerminalTask();
    }
});

apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { saveKeyBtn.click(); }
});
