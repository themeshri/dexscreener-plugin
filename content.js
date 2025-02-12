// content.js
let seenNames = new Set();
let tokenTimestamps = new Map();
let isEnabled = true; // Default to enabled
let isMuted = false;

// Load previously seen names from storage
chrome.storage.local.get(['seenNames'], function(result) {
    if (result.seenNames) {
        seenNames = new Set(result.seenNames);
    }
});

// Create audio element for notification
const audio = new Audio(chrome.runtime.getURL('notification.mp3'));

// Ensure audio is loaded and ready
audio.load();

// Listen for toggle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_PLUGIN') {
        isEnabled = message.enabled;
        if (!isEnabled) {
            observer.disconnect();
        } else {
            initializeObserver();
        }
    }
    if (message.type === 'TOGGLE_MUTE') {
        isMuted = message.muted;
    }
});

// Load initial state
chrome.storage.local.get(['pluginEnabled'], function(result) {
    isEnabled = result.pluginEnabled !== false;
    if (isEnabled) {
        initializeObserver();
    }
});

// Load initial mute state
chrome.storage.local.get(['isMuted'], function(result) {
    isMuted = result.isMuted === true;
});

// Function to check for new names
function checkForNewName(symbol, marketCap, volume, contractAddress) {
    if (!isEnabled || !symbol || symbol === 'undefined') {
        return;
    }

    const currentTime = Date.now();
    const lastSeenTime = tokenTimestamps.get(symbol);

    if (lastSeenTime && (currentTime - lastSeenTime) < 5000) {
        return;
    }

    if (!seenNames.has(symbol)) {
        tokenTimestamps.set(symbol, currentTime);

        const tokenData = {
            name: symbol.trim(),
            timestamp: currentTime,
            marketCap: marketCap?.trim() || 'N/A',
            volume: volume?.trim() || 'N/A',
            contractAddress: contractAddress
        };
        
        console.log('Token data with contract:', tokenData);
        
        seenNames.add(symbol);
        
        chrome.runtime.sendMessage({
            type: 'NEW_TOKEN',
            tokenData: tokenData
        });

        chrome.storage.local.get(['seenNames'], function(result) {
            const storedNames = result.seenNames || [];
            if (tokenData.name && tokenData.name !== 'undefined') {
                storedNames.push(tokenData);
                chrome.storage.local.set({
                    'seenNames': storedNames
                });
            }
        });

        try {
            if (!isMuted) {
                audio.currentTime = 0;
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log('Audio play error:', error);
                    });
                }
            }
        } catch (error) {
            console.error('Error playing audio:', error);
        }

        console.log('New token found:', tokenData);
    }
}

// Set up the observer
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            const rows = document.querySelectorAll('.ds-dex-table-row');
            rows.forEach(row => {
                const symbolElement = row.querySelector('.ds-dex-table-row-base-token-symbol');
                const marketCapElement = row.querySelector('.ds-dex-table-row-col-market-cap');
                const volumeElement = row.querySelector('.ds-table-data-cell.ds-dex-table-row-col-volume');
                
                if (symbolElement && marketCapElement && volumeElement) {
                    const symbol = symbolElement.textContent?.trim();
                    const marketCap = marketCapElement.textContent?.trim();
                    const volume = volumeElement.textContent?.trim();
                    
                    // Get contract address from the parent anchor tag
                    const contractAddress = row.closest('a')?.getAttribute('href')?.split('/').pop() || 'N/A';
                    
                    // Only process if we have valid data
                    if (symbol && symbol !== 'undefined') {
                        checkForNewName(symbol, marketCap, volume, contractAddress);
                    }
                }
            });
        }
    });
});

// Function to capture all existing tokens on the page
function captureExistingTokens() {
    const rows = document.querySelectorAll('.ds-dex-table-row');
    rows.forEach(row => {
        const symbolElement = row.querySelector('.ds-dex-table-row-base-token-symbol');
        const marketCapElement = row.querySelector('.ds-dex-table-row-col-market-cap');
        const volumeElement = row.querySelector('.ds-table-data-cell.ds-dex-table-row-col-volume');
        
        if (symbolElement && marketCapElement && volumeElement) {
            const symbol = symbolElement.textContent?.trim();
            const marketCap = marketCapElement.textContent?.trim();
            const volume = volumeElement.textContent?.trim();
            const contractAddress = row.closest('a')?.getAttribute('href')?.split('/').pop() || 'N/A';
            
            if (symbol && symbol !== 'undefined') {
                checkForNewName(symbol, marketCap, volume, contractAddress);
            }
        }
    });
}

// Start observing when DOM is ready
function initializeObserver() {
    const targetNode = document.querySelector('.ds-dex-table');
    if (targetNode) {
        // First capture existing tokens
        captureExistingTokens();
        
        // Then start observing for new ones
        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
        console.log('Observer started');
    } else {
        // If table not found, retry after a short delay
        setTimeout(initializeObserver, 1000);
    }
}

// Also capture tokens when the page content updates (like when filters change)
document.addEventListener('DOMContentLoaded', captureExistingTokens);
window.addEventListener('load', captureExistingTokens);

// Start the process
initializeObserver();

// Add a periodic check for new tokens (in case some are missed)
setInterval(captureExistingTokens, 5000);  // Check every 5 seconds