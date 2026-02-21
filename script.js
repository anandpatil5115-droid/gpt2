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
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${hfApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 250,
                    temperature: 0.8,
                    return_full_text: false
                }
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            let msg = "SYS_CRITICAL: GEN_FAILED";
            if (response.status === 401) msg = "AUTH_DENIED: INVALID_TOKEN";
            else if (response.status === 429) msg = "BANDWIDTH_ERR: LIMIT_REACHED";
            else msg = data.error || "UNKNOWN_HARDWARE_ERROR";
            throw new Error(msg);
        }

        const generatedText = Array.isArray(data) ? data[0].generated_text : data.generated_text;

        if (!generatedText) {
            throw new Error("EMPTY_DATA_BUFFER: TRY_AGAIN");
        }

        // Success flow
        outputContainer.style.display = 'block';
        typewriterType(outputText, generatedText);

    } catch (error) {
        console.error("Terminal Task Error:", error);
        showError(error.message);
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
 * GLOBAL LISTENERS
 */

generateBtn.addEventListener('click', executeTerminalTask);

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
