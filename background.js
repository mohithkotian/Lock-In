// Background script for Kokushibo Tab Lock

let lockState = {
    active: false,
    endTime: null,
    lockedTabs: [],
    activeTabId: null,
    alarmName: 'tabLockTimer',
    checkerInterval: null
};

async function startLock(data) {
    lockState = {
        active: true,
        endTime: data.lockEndTime,
        lockedTabs: data.lockedTabs,
        activeTabId: data.activeTabId,
        alarmName: 'tabLockTimer',
        checkerInterval: null
    };

    await chrome.storage.local.set({
        'lockState': 'active',
        'lockEndTime': data.lockEndTime,
        'lockedTabs': data.lockedTabs,
        'activeTabId': data.activeTabId,
        'lockPassword': data.password
    });

    const minutes = Math.ceil((data.lockEndTime - Date.now()) / 60000);
    await chrome.alarms.create(lockState.alarmName, { delayInMinutes: minutes });

    lockState.checkerInterval = setInterval(enforceLock, 1000);
}

async function endLock() {
    if (lockState.checkerInterval) clearInterval(lockState.checkerInterval);
    await chrome.alarms.clear(lockState.alarmName);
    await chrome.storage.local.remove(['lockState', 'lockEndTime', 'lockedTabs', 'activeTabId', 'lockPassword']);
    lockState = { active: false, endTime: null, lockedTabs: [], activeTabId: null, alarmName: 'tabLockTimer', checkerInterval: null };

    try {
        await chrome.runtime.sendMessage({ type: 'LOCK_EXPIRED' });
    } catch {}
}

async function enforceLock() {
    if (!lockState.active) {
        clearInterval(lockState.checkerInterval);
        return;
    }

    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const lockedTabIds = new Set(lockState.lockedTabs.map(t => t.id));

        if (activeTab && !lockedTabIds.has(activeTab.id)) {
            const targetId = lockState.activeTabId && lockedTabIds.has(lockState.activeTabId)
                ? lockState.activeTabId
                : lockState.lockedTabs[0]?.id;
            if (targetId) await chrome.tabs.update(targetId, { active: true });
        }

        const allTabs = await chrome.tabs.query({ currentWindow: true });
        for (const t of allTabs) {
            if (!lockedTabIds.has(t.id)) await chrome.tabs.remove(t.id);
        }
    } catch (e) {
        console.error("Error enforcing lock:", e);
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'START_LOCK') {
        startLock(msg.data);
    } else if (msg.type === 'TRY_UNLOCK') {
        chrome.storage.local.get('lockPassword').then(result => {
            if (result.lockPassword === msg.password) {
                endLock();
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false });
            }
        });
        return true;
    }
});

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === lockState.alarmName) endLock();
});

chrome.runtime.onStartup.addListener(async () => {
    const result = await chrome.storage.local.get(['lockState', 'lockEndTime', 'lockedTabs', 'activeTabId']);
    if (result.lockState === 'active' && result.lockEndTime > Date.now()) {
        lockState = {
            active: true,
            endTime: result.lockEndTime,
            lockedTabs: result.lockedTabs || [],
            activeTabId: result.activeTabId,
            alarmName: 'tabLockTimer'
        };
        lockState.checkerInterval = setInterval(enforceLock, 1000);
    }
});
// Add a listener for popup requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "GET_REMAINING") {
        chrome.storage.local.get("lockEndTime").then(data => {
            if (data.lockEndTime) {
                const remaining = Math.max(0, data.lockEndTime - Date.now());
                sendResponse({ remaining });
            } else {
                sendResponse({ remaining: 0 });
            }
        });
        return true; // keep channel open
    }
});


