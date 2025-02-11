// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const nameList = document.getElementById('nameList');
    const resetButton = document.getElementById('resetButton');

    function displayNames() {
        nameList.innerHTML = '';
        chrome.storage.local.get(['seenNames'], function(result) {
            if (result.seenNames && result.seenNames.length > 0) {
                const validEntries = result.seenNames
                    .filter(token => token.name && token.name !== 'undefined')
                    .sort((a, b) => b.timestamp - a.timestamp);

                validEntries.forEach(token => {
                    const row = document.createElement('tr');
                    
                    // Token Name cell
                    const nameCell = document.createElement('td');
                    nameCell.textContent = token.name;
                    row.appendChild(nameCell);
                    
                    // Market Cap cell
                    const marketCapCell = document.createElement('td');
                    marketCapCell.textContent = token.marketCap || 'N/A';
                    row.appendChild(marketCapCell);
                    
                    // Time cell
                    const timeCell = document.createElement('td');
                    timeCell.textContent = new Date(token.timestamp).toLocaleTimeString();
                    row.appendChild(timeCell);
                    
                    // Volume cell
                    const volumeCell = document.createElement('td');
                    volumeCell.textContent = token.volume || 'N/A';
                    row.appendChild(volumeCell);

                    // Contract Address cell
                    const contractCell = document.createElement('td');
                    contractCell.className = 'contract-address';
                    contractCell.textContent = token.contractAddress || 'N/A';
                    contractCell.style.cursor = 'pointer';
                    contractCell.title = 'Click to copy';
                    contractCell.onclick = () => {
                        navigator.clipboard.writeText(token.contractAddress);
                        // Visual feedback
                        const originalColor = contractCell.style.color;
                        contractCell.style.color = '#4CAF50';
                        setTimeout(() => {
                            contractCell.style.color = originalColor;
                        }, 500);
                    };
                    row.appendChild(contractCell);

                    nameList.appendChild(row);
                });

                if (validEntries.length === 0) {
                    const row = document.createElement('tr');
                    const cell = document.createElement('td');
                    cell.colSpan = 5;
                    cell.textContent = 'No valid tokens detected yet';
                    row.appendChild(cell);
                    nameList.appendChild(row);
                }
            } else {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 5;
                cell.textContent = 'No tokens detected yet';
                row.appendChild(cell);
                nameList.appendChild(row);
            }
        });
    }

    // Display initial list
    displayNames();

    // Set up storage change listener
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.seenNames) {
            displayNames();
        }
    });

    // Reset button click handler
    resetButton.addEventListener('click', async function() {
        if (confirm('Are you sure you want to reset the history? This cannot be undone.')) {
            await chrome.storage.local.set({ 'seenNames': [] });
            try {
                const tabs = await chrome.tabs.query({active: true, currentWindow: true});
                if (tabs[0] && tabs[0].url && tabs[0].url.includes('dexscreener.com')) {
                    await chrome.tabs.sendMessage(tabs[0].id, {type: 'RESET_NAMES'}).catch(() => {});
                }
            } catch (error) {
                console.log('Reset storage completed, content script not accessible');
            }
            displayNames();
        }
    });

    // Auto-refresh every 2 seconds
    setInterval(displayNames, 2000);
});