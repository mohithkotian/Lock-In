<p align="center">
  <img src="icon128.png" alt="Lock-In Logo" width="120" />
</p>

<h1 align="center">🔒 Lock-In</h1>


A lightweight Chrome extension that helps you stay focused by locking your browser for a set amount of time.
No distractions, no excuses — just deep work.

✨ Features

Custom Focus Sessions → Set a timer anywhere from 1 to 480 minutes.

Password Protection → End sessions early only if you know the password you set.

Emergency Unlock → Escape hatch for critical situations.

Immersive UI → Kokushibo-inspired design with glowing buttons and backgrounds.

Session Persistence → Timer continues running even if you close the popup or restart Chrome.

🚀 Installation

Since Lock-In isn’t on the Chrome Web Store, you’ll need to load it manually:

Clone this repository or download it as a ZIP:

git clone https://github.com/mohithkotian/lock-in.git


Open Chrome and go to chrome://extensions/.

Enable Developer Mode (toggle in the top-right).

Click Load unpacked and select the project folder.

You should now see the Lock-In icon in your extensions bar.

💡 Usage

Click the Lock-In icon in your toolbar.

Enter how many minutes you want to focus.

Set a password for unlocking early.

Press Begin Focus.

While the session is active:

A countdown timer runs in the background.

Tabs are locked (switching/closing restricted).

You can only stop early by entering your password.

When the timer ends, the lock is automatically lifted.

⚙️ Technical Details

Built With

HTML, CSS, JavaScript (ES6)

Chrome Extensions API (Manifest V3)

How It Works

The popup handles session setup and displays the countdown.

The background service worker enforces the lock, monitors tabs, and uses chrome.alarms for timing.

Session data (end time, password, active tab) is stored with chrome.storage.local, so it persists even if you restart Chrome.

📸 Screenshots
Setup
<img width="504" height="746" alt="image" src="https://github.com/user-attachments/assets/3256e3fd-b106-48a4-b8e1-7d52fe655bcf" />

Start a session with duration + password.

Active Session

Focus mode activated — Kokushibo’s eyes keep watch.
<img width="497" height="746" alt="image" src="https://github.com/user-attachments/assets/dbcdd64c-c1dd-4773-afe6-263e32c906d7" />

Completion

When the timer ends, Lock-In frees your tabs.
<img width="495" height="748" alt="image" src="https://github.com/user-attachments/assets/9c7fb6c2-ea95-4f38-ba44-1108ef1e988f" />


📝 License

MIT License © 2025 mohithkotian
