#  Tab lock :-

A lightweight Chrome extension that helps you stay focused by locking your browser for a set amount of time.  
No distractions, no excuses — just deep work.

---

## ✨ Features

- **Custom Focus Sessions** → Set a timer anywhere from 1 to 480 minutes.  
- **Password Protection** → End sessions early only if you know the password you set.  
- **Emergency Unlock** → An escape hatch for critical situations.  
- **Minimal, Clean UI** → Status badges and background changes keep things clear.  
- **Session Persistence** → Lock continues even if you restart Chrome.  

---

## 🚀 Installation

Since Tab Lock isn’t on the Chrome Web Store, you’ll need to load it manually:

1. Download or clone this repository.  
2. Open Chrome and go to `chrome://extensions`.  
3. Enable **Developer Mode** (top-right toggle).  
4. Click **Load unpacked** and select the project folder.  

You should now see the Tab Lock icon in your extensions bar.

---

## 💡 Usage

1. Click the Tab Lock icon in your toolbar.  
2. Enter how many minutes you want to focus.  
3. Set a password for unlocking early.  
4. Press **Start Focus Lock**.  

While the session is active:  
- A live countdown timer is displayed.  
- Tabs are restricted.  
- You can only stop early with your password.  

When the timer reaches zero, the lock ends automatically.

---

## ⚙️ Technical Details

**Built With**  
- HTML, CSS, JavaScript (ES6)  
- Chrome Extension API (Manifest V3)  

**How It Works**  
- The **popup** handles input and shows the countdown.  
- The **background service worker** enforces the lock, listens for tab events, and uses `chrome.alarms` for timing.  
- All session data (end time, password, status) is stored with `chrome.storage`, so it persists across restarts.  

---
