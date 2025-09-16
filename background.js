// Background script for Tab Lock extension

let lockState = {
    active: false,
    endTime: null,
    lockedTabs: [],
    activeTabId: null,
    alarmName: 'tabLockTimer'
};

// Initialize on startup
chrome.runtime.onStartup.addListener(initializeFromStorage);
chrome.runtime.onInstalled.addListener(initializeFromStorage);

async function initializeFromStorage() {
    try {
        const result = await chrome.storage.local.get([
            'lockState', 'lockEndTime', 'lockedTabs', 'activeTabId'
        ]);
        
        if (result.lockState === 'active' && result.lockEndTime) {
            const now = Date.now();
            
            if (result.lockEndTime > now) {
                // Lock is still active
                lockState = {
                    active: true,
                    endTime: result.lockEndTime,
                    lockedTabs: result.lockedTabs || [],
                    activeTabId: result.activeTabId,
                    alarmName: 'tabLockTimer'
                };
                
                // Set up alarm for remaining time
                const remainingMinutes = Math.ceil((result.lockEndTime - now) / 60000);
                await chrome.alarms.create(lockState.alarmName, {
                    delayInMinutes: remainingMinutes
                });
                
                console.log('Tab Lock restored from storage:', remainingMinutes, 'minutes remaining');
            } else {
                // Lock has expired
                await endLock();
            }
        }
    } catch (error) {
        console.error('Error initializing from storage:', error);
    }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'START_LOCK':
            startLock(message.data);
            break;
        case 'END_LOCK':
            endLock();
            break;
    }
    sendResponse({ success: true });
});

async function startLock(data) {
    try {
        lockState = {
            active: true,
            endTime: data.lockEndTime,
            lockedTabs: data.lockedTabs,
            activeTabId: data.activeTabId,
            alarmName: 'tabLockTimer'
        };
        
        // Set up alarm
        const minutes = Math.ceil((data.lockEndTime - Date.now()) / 60000);
        await chrome.alarms.create(lockState.alarmName, {
            delayInMinutes: minutes
        });
        
        console.log('Tab Lock started:', minutes, 'minutes');
        
        // Close any tabs that aren't locked
        const currentTabs = await chrome.tabs.query({ currentWindow: true });
        const lockedTabIds = new Set(lockState.lockedTabs.map(tab => tab.id));
        
        for (const tab of currentTabs) {
            if (!lockedTabIds.has(tab.id)) {
                try {
                    await chrome.tabs.remove(tab.id);
                } catch (error) {
                    console.log('Could not close tab:', tab.id, error);
                }
            }
        }
        
        // Focus the originally active tab
        if (lockState.activeTabId) {
            try {
                await chrome.tabs.update(lockState.activeTabId, { active: true });
            } catch (error) {
                console.log('Could not focus active tab:', error);
            }
        }
        
    } catch (error) {
        console.error('Error starting lock:', error);
    }
}

async function endLock() {
    try {
        // Clear alarm
        if (lockState.alarmName) {
            await chrome.alarms.clear(lockState.alarmName);
        }
        
        // Reset state
        lockState = {
            active: false,
            endTime: null,
            lockedTabs: [],
            activeTabId: null,
            alarmName: 'tabLockTimer'
        };
        
        // Clear storage
        await chrome.storage.local.remove([
            'lockState', 'lockEndTime', 'lockedTabs', 'activeTabId', 'startTime'
        ]);
        
        console.log('Tab Lock ended');
        
        // Notify popup if open
        try {
            await chrome.runtime.sendMessage({ type: 'LOCK_EXPIRED' });
        } catch (error) {
            // Popup might not be open, ignore error
        }
        
    } catch (error) {
        console.error('Error ending lock:', error);
    }
}

// Handle alarm (timer expiry)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === lockState.alarmName) {
        console.log('Tab Lock timer expired');
        endLock();
    }
});

// Prevent new tabs from being created
chrome.tabs.onCreated.addListener(async (tab) => {
    if (!lockState.active) return;
    
    try {
        // Check if this is one of the originally locked tabs being restored
        const isLockedTab = lockState.lockedTabs.some(lockedTab => 
            lockedTab.url === tab.url || lockedTab.id === tab.id
        );
        
        if (!isLockedTab) {
            console.log('Closing new tab:', tab.id, tab.url);
            await chrome.tabs.remove(tab.id);
        }
    } catch (error) {
        console.error('Error handling new tab:', error);
    }
});

// Prevent switching to non-locked tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    if (!lockState.active) return;
    
    try {
        const lockedTabIds = lockState.lockedTabs.map(tab => tab.id);
        
        if (!lockedTabIds.includes(activeInfo.tabId)) {
            console.log('Preventing switch to non-locked tab:', activeInfo.tabId);
            
            // Switch back to a locked tab (prefer the originally active one)
            const targetTabId = lockState.activeTabId && lockedTabIds.includes(lockState.activeTabId)
                ? lockState.activeTabId
                : lockedTabIds[0];
            
            if (targetTabId) {
                await chrome.tabs.update(targetTabId, { active: true });
            }
        }
    } catch (error) {
        console.error('Error handling tab activation:', error);
    }
});

// Prevent navigation away from locked pages
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (!lockState.active || details.frameId !== 0) return; // Only handle main frame
    
    try {
        const lockedTab = lockState.lockedTabs.find(tab => tab.id === details.tabId);
        
        if (lockedTab && details.url !== lockedTab.url) {
            console.log('Preventing navigation away from locked page:', details.url);
            
            // Redirect back to original URL
            await chrome.tabs.update(details.tabId, { url: lockedTab.url });
        }
    } catch (error) {
        console.error('Error handling navigation:', error);
    }
});

// Handle tab removal (cleanup)
chrome.tabs.onRemoved.addListener((tabId) => {
    if (!lockState.active) return;
    
    // Remove from locked tabs if it was closed
    lockState.lockedTabs = lockState.lockedTabs.filter(tab => tab.id !== tabId);
    
    // If all locked tabs are closed, end the lock
    if (lockState.lockedTabs.length === 0) {
        console.log('All locked tabs closed, ending lock');
        endLock();
    }
});

// Check lock status periodically
setInterval(async () => {
    if (lockState.active && lockState.endTime && Date.now() >= lockState.endTime) {
        console.log('Lock expired (periodic check)');
        await endLock();
    }
}, 30000); // Check every 30 seconds