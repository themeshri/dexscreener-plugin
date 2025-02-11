// background.js

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
    // Request notification permission on installation
    chrome.notifications.getPermissionLevel((level) => {
        console.log('Notification permission level:', level);
    });

    chrome.storage.local.get(['seenNames'], function(result) {
        if (!result.seenNames) {
            chrome.storage.local.set({
                seenNames: []
            });
        }
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NEW_TOKEN') {
        const tokenData = message.tokenData;
        console.log('Received new token:', tokenData); // Debug log
        
        // Create notification with error handling
        try {
            chrome.notifications.create(
                'token_' + Date.now(), // Unique ID for each notification
                {
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icon48.png'),
                    title: 'New Token Detected!',
                    message: `Name: ${tokenData.name}\nMarket Cap: ${tokenData.marketCap}\nTime: ${new Date(tokenData.timestamp).toLocaleString()}`,
                    priority: 2
                },
                (notificationId) => {
                    if (chrome.runtime.lastError) {
                        console.error('Notification error:', chrome.runtime.lastError);
                    } else {
                        console.log('Notification created:', notificationId);
                    }
                }
            );
        } catch (error) {
            console.error('Error creating notification:', error);
        }

        // Update badge
        chrome.action.setBadgeText({
            text: '!',
            tabId: sender.tab.id
        });
        
        chrome.action.setBadgeBackgroundColor({
            color: '#FF0000',
            tabId: sender.tab.id
        });

        // Store timestamp with token name
        chrome.storage.local.get(['seenNames'], function(result) {
            const seenNames = result.seenNames || [];
            const newToken = {
                name: message.name,
                timestamp: new Date().toISOString()
            };
            
            seenNames.push(newToken);
            
            chrome.storage.local.set({
                seenNames: seenNames
            });
        });
    }
    
    // Clear badge when popup is opened
    if (message.type === 'CLEAR_BADGE') {
        chrome.action.setBadgeText({
            text: '',
            tabId: sender.tab.id
        });
    }
});

// Add notification click handler
chrome.notifications.onClicked.addListener((notificationId) => {
    console.log('Notification clicked:', notificationId);
});

// Handle extension update or reload
chrome.runtime.onUpdateAvailable.addListener(() => {
    chrome.runtime.reload();
});

// Storage synchronization issue
let seenNames = new Set();
chrome.storage.local.get(['seenNames'], function(result) {
    if (result.seenNames) {
        seenNames = new Set(result.seenNames);
    }
});