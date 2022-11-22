// ==UserScript==
// @name        Texthooker Websocket Inserter
// @match       http*://*.*.*/texthooker.html
// @match       file:///*texthooker.html
// @grant       none
// @version     1.0
// @author      Zetta#3033, Marv
// @description Inserts text into a texthooker page, for use with this textractor plugin https://github.com/sadolit/textractor-websocket
// @grant       GM_addStyle
// @grant       GM_setClipboard
// ==/UserScript==

const sleepTime = 60000;
let lastActivityTime = 0;
let lastFlashTime = 0;
const flashDuration = 500;
const flashInterval = 500;

let socket = null;
let wsStatusElem = null;
let timerElem = null;
let inserting = true;

const node = document.getElementById('menu').firstChild;

const originalTimerSelector = `span.menuitem[title="Click to pause timer"]`;
const originalTimerElem = document.querySelector(originalTimerSelector);

const addCSS = /* css */ `
body{
  transition: background-color ${flashDuration}ms ease-in-out;
}
${originalTimerSelector} {
  display: none !important;
}
.timer {
  margin-right: 0.8em;
}
.timerText {
  color: #fff;
}
.INSERTING {
  color: rgb(24, 255, 24);
}
.PAUSED {
  color: rgb(255, 255, 24);
}
.connectionStatus {
  color: rgb(255, 24, 24);
  margin-right: 1em;
  display: inline-block;
}
.Connected {
  color: rgb(24, 255, 24);
}
`;

(function () {
  GM_addStyle(addCSS);

  // start paused
  originalTimerElem.click();

  setUpTimerElem();
  setInterval(updateTimerElem, 1000);

  setUpCharacterCounterElem();

  connect();

  setUpClipboardInsert();

  setUpDoubleClickEdit();

  // sleep on inactivity
  setInterval(() => {
    if (lastActivityTime + sleepTime < Date.now() && inserting === true) {
      timerElem.click();
    }
  }, 1000);

  setUpChangeTimer();
})();

function setUpDoubleClickEdit() {
  // listen for double click
  document.addEventListener('dblclick', (e) => {
    if (e.target.tagName == 'SPAN') {
      // edit text
      e.target.contentEditable = true;
      e.target.focus();
      // save on blur or enter
      e.target.addEventListener('blur', (e) => {
        e.target.contentEditable = false;
        saveText(e.target);
      });
      e.target.addEventListener('keydown', (e) => {
        if (e.key == 'Enter') {
          e.target.contentEditable = false;
        }
      });
    }
  });
}

function saveText(elem) {
  const parentLine = elem.parentElement;
  const index = Array.from(parentLine.parentElement.children).indexOf(parentLine);
  const lines = JSON.parse(localStorage.getItem('logItemsList'));
  console.log(`Previous line: ${lines[index].text}, new line: ${elem.innerText}`);
  lines[index].text = elem.innerText;
  localStorage.setItem('logItemsList', JSON.stringify(lines));
}

function setUpTimerElem() {
  timerElem = document.createElement('span');
  timerElem.className = 'menuitem timer';
  node.insertBefore(timerElem, node.firstChild);
  updateTimerElem();

  timerElem.addEventListener('click', (e) => {
    lastActivityTime = Date.now();
    originalTimerElem.click();
    updateTimerElem();
  });
}

function setUpClipboardInsert() {
  document.addEventListener('paste', (e) => {
    const text = e.clipboardData.getData('text/plain');
    addText(text);
  });
}

function updateTimerElem() {
  const { paused, time, speed } = getTimerInfo();
  inserting = paused !== 'PAUSED';
  const status = inserting ? 'INSERTING' : 'PAUSED';
  timerElem.innerHTML = /* html */ `
  <span class="timerText">${time} ${inserting ? '' : speed} </span>
  <span class="${status}">${status}</span>`;
}

function getTimerInfo() {
  const [paused, time, speed] = originalTimerElem.innerHTML.split(' ');
  return { paused, time, speed };
}

function setUpCharacterCounterElem() {
  const characterCounterElem = document.querySelector(
    'span[title="Total characters / Total lines"]'
  );
  characterCounterElem.classList.add('menuitem');
  characterCounterElem.style.display = 'inline-block';
  characterCounterElem.addEventListener('click', (e) => {
    // copy contents to clipboard
    const { time } = getTimerInfo();
    const characters = characterCounterElem.innerText.split(' / ')[0];
    GM_setClipboard(time + '\t' + characters);
  });
}

function createStatusElem() {
  wsStatusElem = document.createElement('span');

  wsStatusElem.classList.add('connectionStatus');
  wsStatusElem.classList.add('menuitem');
  wsStatusElem.addEventListener('click', (e) => {
    if (wsStatusElem.innerText == 'Reconnect') {
      connect();
    } else {
      socket.close();
      updateStatus(false);
    }
  });
  node.insertBefore(wsStatusElem, node.firstChild);
}

function updateStatus(connected) {
  if (wsStatusElem === null) {
    createStatusElem();
  }
  const connectedText = connected ? 'Connected' : 'Reconnect';
  wsStatusElem.innerText = connectedText;
  wsStatusElem.classList.toggle('Connected', connected);
}

function connect() {
  socket = new WebSocket('ws://localhost:6677/');
  socket.onopen = (e) => {
    updateStatus(true);
  };
  socket.onclose = (e) => {
    updateStatus(false);
  };
  socket.onerror = (e) => {
    updateStatus(false);
    console.log(`[error] ${e.message}`);
  };
  socket.onmessage = onMessage;
}

function onMessage(e) {
  if (inserting) {
    addText(e.data);
  } else {
    if (lastFlashTime + flashInterval < Date.now()) {
      lastFlashTime = Date.now();
      // flash screen
      const existingBackground = document.body.style.backgroundColor;
      document.body.style.backgroundColor = 'pink';
      setTimeout(() => {
        document.body.style.backgroundColor = existingBackground;
      }, flashDuration / 2);
    }
  }
  lastActivityTime = Date.now();
}

function addText(text) {
  let textNode = document.createElement('p');
  textNode.innerText = text;
  document.body.insertBefore(textNode, null);
}

function setUpChangeTimer() {
  const menu = document.getElementById('menu');
  const changeTimerElem = document.createElement('div');

  menu.appendChild(changeTimerElem);

  changeTimerElem.className = 'icon-clock menuitem';
  changeTimerElem.style.display = 'none';
  changeTimerElem.innerText = 'Set Timer';

  const br = document.createElement('br');
  br.style.display = 'none';
  menu.appendChild(br);

  changeTimerElem.onclick = () => {
    const currentTime = getTimerInfo().time;
    const newTime = prompt('Enter new time', currentTime);
    if (newTime) {
      const timeInMs =
        newTime.split(':').reduce((acc, time) => {
          return acc * 60 + parseInt(time);
        }, 0) * 1000;
      localStorage.elapsedTime = timeInMs;
      location.reload();
    }
  };

  let expanded = false;
  menu.querySelector('span[title="Toggle menu"').addEventListener('click', async () => {
    expanded = !expanded;
    if (expanded) {
      changeTimerElem.style.display = 'inline-block';
      br.style.display = 'block';
    } else {
      changeTimerElem.style.display = 'none';
      br.style.display = 'none';
    }
  });
}
