# Texthooker Websocket Userscript

A userscript intended for use on the [Anacreon texthooking page](https://anacreondjt.gitlab.io/texthooker.html) but may be compatible with others. It allows for use with the [Textractor Websocket](https://github.com/sadolit/textractor-websocket) plugin allowing for instantaneous text inserting without the downsides of the slow and unreliable Clipboard Inserter extension while also adding enhancements to the texthooker page.

## Usage

- Install the [Textractor Websocket](https://github.com/sadolit/textractor-websocket) plugin in Textractor
- [Install the userscript](https://github.com/MarvNC/texthooker-websocket/raw/master/texthooker.user.js) (I recommend using [Violentmonkey](https://violentmonkey.github.io/) to manage userscripts)
- Start your visual novel
- After there are lines present in Textractor, click "Reconnect" on the texthooking page if it is not connected
- Unpause the timer

## Additional Features

![](images/chrome_Clipboard_Insertion_Page_-_Anacreon_Edition_-_http_2022-11-22_13-14-29.png)

- **Edit pasted text by double clicking**
- **Paste lines by CTRL + V'ing into the page**
- Do not allow lines to be added when timer is paused
- Hide timer and characters/hour speed while the timer is paused
- Easy copying of character count and time information for pasting to spreadsheets (by clicking on the character/line count)
- Flash screen if the timer is paused and new lines are inserted (to prevent you forgetting to unpause the timer)
- Auto pause the timer after 60 seconds AFK
- Easily set/adjust the current timer (Press the hamburger menu, first option)
- Pause timer on page load
