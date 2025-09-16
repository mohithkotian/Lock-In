// DOM elements
const statusSection = document.getElementById('statusSection');
const lockSection = document.getElementById('lockSection');
const activeLockSection = document.getElementById('activeLockSection');
const emergencySection = document.getElementById('emergencySection');
const timeRemaining = document.getElementById('timeRemaining');
const statusBadge = document.getElementById('statusBadge');
const minutesInput = document.getElementById('minutesInput');
const lockButton = document.getElementById('lockButton');
const unlockButton = document.getElementById('unlockButton');
const passwordInput = document.getElementById('passwordInput');
const emergencyUnlockButton = document.getElementById('emergencyUnlockButton');

// Emergency password (in production, this could be user-configurable)
const EMERGENCY_PASSWORD = 'unlock123';

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await updateUI();
    setupEventListeners();
    
    // Update UI every second when locked
    setInterval(updateUI, 1000);
});

function setupEventListeners() {
    lockButton.addEventListener('click', handleLock);
    unlockButton.addEventListener('click', handleUnlock);
    emergencyUnlockButton.addEventListener('click', handleEmergencyUnlock);
    
    // Enter key support
    minutesInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLock();
    });
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleEmergencyUnlock();
    });
}

async function updateUI() {
    try {
        const result = await chrome.storage.local.get(['lockState', 'lockEndTime', 'lockedTabs']);
        const lockState = result.lockState;
        const lockEndTime = result.lockEndTime;
        
        if (lockState === 'active' && lockEndTime) {
            const now = Date.now();
            const remaining = Math.max(0, lockEndTime - now);
            
            if (remaining > 0) {
                showActiveLock(remaining);
            } else {
                showInactiveLock();
            }
        } else {
            showInactiveLock();
        }
    } catch (error) {
        console.error('Error updating UI:', error);
        showInactiveLock();
    }
}

function showActiveLock(remainingMs) {
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    
    timeRemaining.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    statusBadge.textContent = 'Active';
    statusBadge.className = 'status-badge';
    
    lockSection.classList.add('hidden');
    activeLockSection.classList.remove('hidden');
    emergencySection.classList.remove('hidden');
    
    // Add fade-in animation
    if (!activeLockSection.classList.contains('fade-in')) {
        activeLockSection.classList.add('fade-in');
        emergencySection.classList.add('fade-in');
    }
}

function showInactiveLock() {
    timeRemaining.textContent = '--:--';
    statusBadge.textContent = 'Inactive';
    statusBadge.className = 'status-badge inactive';
    
    lockSection.classList.remove('hidden');
    activeLockSection.classList.add('hidden');
    emergencySection.classList.add('hidden');
    
    // Reset form
    passwordInput.value = '';
    
    // Add fade-in animation
    if (!lockSection.classList.contains('fade-in')) {
        lockSection.classList.add('fade-in');
    }
}

async function handleLock() {
    const minutes = parseInt(minutesInput.value);
    
    if (!minutes || minutes < 1 || minutes > 480) {
        alert('Please enter a valid duration between 1 and 480 minutes.');
        return;
    }
    
    try {
        lockButton.disabled = true;
        lockButton.textContent = 'Locking...';
        
        // Get current tabs
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tabs.length === 0 || activeTab.length === 0) {
            throw new Error('No tabs found');
        }
        
        const lockData = {
            lockState: 'active',
            lockEndTime: Date.now() + (minutes * 60 * 1000),
            lockedTabs: tabs.map(tab => ({
                id: tab.id,
                url: tab.url,
                title: tab.title
            })),
            activeTabId: activeTab[0].id,
            startTime: Date.now()
        };
        
        // Save lock state
        await chrome.storage.local.set(lockData);
        
        // Notify background script
        await chrome.runtime.sendMessage({ 
            type: 'START_LOCK', 
            data: lockData 
        });
        
        // Update UI
        await updateUI();
        
    } catch (error) {
        console.error('Error starting lock:', error);
        alert('Failed to start lock. Please try again.');
    } finally {
        lockButton.disabled = false;
        lockButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="m7 11 V 7 a 5 5 0 0 1 10 0 v 4"/>
            </svg>
            Lock In
        `;
    }
}

async function handleUnlock() {
    if (!confirm('Are you sure you want to end the lock early?')) {
        return;
    }
    
    await endLock();
}

async function handleEmergencyUnlock() {
    const password = passwordInput.value.trim();
    
    if (password === EMERGENCY_PASSWORD) {
        await endLock();
        passwordInput.value = '';
    } else {
        alert('Incorrect password. The emergency password is "unlock123".');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

async function endLock() {
    try {
        // Clear storage
        await chrome.storage.local.remove(['lockState', 'lockEndTime', 'lockedTabs', 'activeTabId', 'startTime']);
        
        // Notify background script
        await chrome.runtime.sendMessage({ type: 'END_LOCK' });
        
        // Update UI
        await updateUI();
        
    } catch (error) {
        console.error('Error ending lock:', error);
        alert('Failed to end lock. Please try again.');
    }
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'LOCK_EXPIRED') {
        updateUI();
    }
});