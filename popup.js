document.addEventListener('DOMContentLoaded', () => {
    const setupView = document.getElementById('setupView');
    const activeView = document.getElementById('activeView');
    const completedView = document.getElementById('completedView');

    const minutesInput = document.getElementById('minutesInput');
    const passwordInput = document.getElementById('passwordInput');
    const lockButton = document.getElementById('lockButton');

    const timeRemaining = document.getElementById('timeRemaining');
    const unlockPasswordInput = document.getElementById('unlockPasswordInput');
    const unlockButton = document.getElementById('unlockButton');
    const newSessionButton = document.getElementById('newSessionButton');

    const bgSetup = document.getElementById('bgSetup');
    const bgActive = document.getElementById('bgActive');

    let timerInterval;

    function switchView(view) {
        setupView.classList.add('hidden');
        activeView.classList.add('hidden');
        completedView.classList.add('hidden');
        view.classList.remove('hidden');

        if (view === activeView) {
            bgSetup.classList.add('hidden');
            bgActive.classList.remove('hidden');
        } else {
            bgActive.classList.add('hidden');
            bgSetup.classList.remove('hidden');
        }
    }

    function startTimer(endTime) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const left = Math.max(0, endTime - Date.now());
            const m = Math.floor(left / 60000);
            const s = Math.floor((left / 1000) % 60);
            timeRemaining.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            if (left <= 0) {
                clearInterval(timerInterval);
                switchView(completedView);
            }
        }, 1000);
    }

    lockButton.addEventListener('click', async () => {
        const minutes = parseInt(minutesInput.value, 10);
        const password = passwordInput.value;

        if (isNaN(minutes) || minutes < 1 || minutes > 480) {
            alert('Duration must be 1–480 minutes.');
            return;
        }
        if (password.length < 4) {
            alert('Password must be at least 4 characters.');
            return;
        }

        const tabs = await chrome.tabs.query({ currentWindow: true });
        const activeTab = tabs.find(t => t.active);

        const data = {
            lockEndTime: Date.now() + minutes * 60000,
            password,
            lockedTabs: tabs,
            activeTabId: activeTab?.id
        };

        chrome.runtime.sendMessage({ type: 'START_LOCK', data });
        switchView(activeView);
        startTimer(data.lockEndTime);
    });

    unlockButton.addEventListener('click', () => {
        const pwd = unlockPasswordInput.value;
        if (!pwd) return alert('Enter code.');
        chrome.runtime.sendMessage({ type: 'TRY_UNLOCK', password: pwd }, (res) => {
            if (res?.success) {
                clearInterval(timerInterval);
                switchView(completedView);
            } else {
                alert('Incorrect code.');
            }
        });
    });

    newSessionButton.addEventListener('click', () => {
        minutesInput.value = 30;
        passwordInput.value = '';
        unlockPasswordInput.value = '';
        timeRemaining.textContent = '--:--';
        switchView(setupView);
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'LOCK_EXPIRED') {
            clearInterval(timerInterval);
            switchView(completedView);
        }
    });

    switchView(setupView);
});
document.addEventListener("DOMContentLoaded", () => {
    const timeRemaining = document.getElementById("timeRemaining");

    let timerInterval;

    function startTimer(endTime) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const left = Math.max(0, endTime - Date.now());
            const m = Math.floor(left / 60000);
            const s = Math.floor((left / 1000) % 60);
            timeRemaining.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

            if (left <= 0) {
                clearInterval(timerInterval);
                chrome.runtime.sendMessage({ type: "LOCK_EXPIRED" });
            }
        }, 1000);
    }

    // When popup loads, check if a lock is running
    chrome.runtime.sendMessage({ type: "GET_REMAINING" }, (res) => {
        if (res.remaining > 0) {
            const endTime = Date.now() + res.remaining;
            startTimer(endTime);
            // show active view automatically
            document.getElementById("setupView").classList.add("hidden");
            document.getElementById("activeView").classList.remove("hidden");
        }
    });
});
