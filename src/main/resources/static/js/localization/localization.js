const TRANSLATION_BASE_URL = "/localization";
const STORAGE_KEY = "biolab.language";
const DEFAULT_LANGUAGE = "en";
const LANGUAGE_NAMES = {
    en: "English",
    ru: "Русский"
};

const textNodeKeys = new WeakMap();
const dictionaries = {};

let currentLanguageCode = DEFAULT_LANGUAGE;
let loaded = false;

export async function initLocalization() {
    await loadLanguageFile(DEFAULT_LANGUAGE);
    currentLanguageCode = normalizeLanguage(localStorage.getItem(STORAGE_KEY) || preferredBrowserLanguage());
    await loadLanguageFile(currentLanguageCode);
    bindLanguageControls();
    applyTranslations(document);
    loaded = true;
}

export function t(key, params = {}) {
    const source = String(key ?? "");
    const dictionary = dictionaries[currentLanguageCode] ?? {};
    const fallbackDictionary = dictionaries[DEFAULT_LANGUAGE] ?? {};
    const template = dictionary[source] ?? fallbackDictionary[source] ?? source;
    return interpolate(template, params);
}


export function currentDateLocale() {
    return currentLanguageCode === "ru" ? "ru-RU" : "en-US";
}

export function applyTranslations(root = document) {
    if (!root) return;

    if (document?.documentElement) {
        document.documentElement.lang = currentLanguageCode;
    }
    if (document) {
        document.title = t("BioLab Engine");
    }

    translateAttributes(root);
    translateTextNodes(root);
    syncLanguageControls();
}

export async function setLanguage(language) {
    const nextLanguage = normalizeLanguage(language);
    await loadLanguageFile(nextLanguage);

    if (nextLanguage === currentLanguageCode) {
        syncLanguageControls();
        return;
    }

    currentLanguageCode = nextLanguage;
    localStorage.setItem(STORAGE_KEY, currentLanguageCode);
    applyTranslations(document);
    window.dispatchEvent(new CustomEvent("biolab:language-change", {
        detail: { language: currentLanguageCode }
    }));
}


async function loadLanguageFile(language) {
    const normalized = normalizeLanguage(language);
    if (dictionaries[normalized]) return dictionaries[normalized];

    try {
        const response = await fetch(`${TRANSLATION_BASE_URL}/${normalized}.json`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        dictionaries[normalized] = await response.json();
    } catch (error) {
        console.error(`Failed to load ${normalized} localization file`, error);
        dictionaries[normalized] = normalized === DEFAULT_LANGUAGE ? {} : dictionaries[DEFAULT_LANGUAGE] ?? {};
    }

    return dictionaries[normalized];
}

function bindLanguageControls() {
    document.querySelectorAll('input[name="language"]').forEach(input => {
        input.disabled = false;
        input.addEventListener("change", async () => {
            if (input.checked) await setLanguage(input.value);
        });
    });
    syncLanguageControls();
}

function syncLanguageControls() {
    document.querySelectorAll('input[name="language"]').forEach(input => {
        input.disabled = false;
        input.checked = input.value === currentLanguageCode;
        input.closest(".locale-option")?.classList.toggle("active", input.checked);
        input.closest(".locale-option")?.classList.remove("disabled");
    });

    document.querySelectorAll(".locale-option").forEach(option => {
        const value = option.querySelector('input[name="language"]')?.value;
        option.title = value && LANGUAGE_NAMES[value] ? LANGUAGE_NAMES[value] : "";
    });
}

function translateAttributes(root) {
    const container = root.nodeType === Node.ELEMENT_NODE ? root : root.documentElement;
    if (!container?.querySelectorAll) return;

    for (const element of container.querySelectorAll("[title], [placeholder], [aria-label]")) {
        translateAttribute(element, "title", "localizationTitle");
        translateAttribute(element, "placeholder", "localizationPlaceholder");
        translateAttribute(element, "aria-label", "localizationAriaLabel");
    }
}

function translateAttribute(element, attrName, dataName) {
    if (!element.hasAttribute(attrName)) return;

    if (!element.dataset[dataName]) {
        const original = normalizeText(element.getAttribute(attrName));
        if (hasTranslationKey(original)) {
            element.dataset[dataName] = original;
        }
    }

    const key = element.dataset[dataName];
    if (key) element.setAttribute(attrName, t(key));
}

function translateTextNodes(root) {
    const container = root.nodeType === Node.ELEMENT_NODE ? root : root.body;
    if (!container) return;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(parent.tagName)) {
                return NodeFilter.FILTER_REJECT;
            }
            const key = textNodeKeys.get(node) ?? normalizeText(node.nodeValue);
            return hasTranslationKey(key) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
        let key = textNodeKeys.get(node);
        if (!key) {
            key = normalizeText(node.nodeValue);
            textNodeKeys.set(node, key);
        }
        const original = node.nodeValue ?? "";
        const leading = original.match(/^\s*/)?.[0] ?? "";
        const trailing = original.match(/\s*$/)?.[0] ?? "";
        node.nodeValue = `${leading}${t(key)}${trailing}`;
    }
}

function normalizeLanguage(language) {
    const normalized = String(language ?? DEFAULT_LANGUAGE).toLowerCase().split("-")[0];
    return Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, normalized) ? normalized : DEFAULT_LANGUAGE;
}

function preferredBrowserLanguage() {
    return navigator.language || DEFAULT_LANGUAGE;
}

function normalizeText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}

function hasTranslationKey(key) {
    return Boolean(key) && (
        Object.prototype.hasOwnProperty.call(dictionaries[DEFAULT_LANGUAGE] ?? {}, key)
        || Object.prototype.hasOwnProperty.call(dictionaries[currentLanguageCode] ?? {}, key)
    );
}

function interpolate(template, params) {
    return String(template ?? "").replace(/\{(\w+)}/g, (match, name) => {
        return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match;
    });
}


