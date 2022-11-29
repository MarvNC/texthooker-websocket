// ==UserScript==
// @name        Texthooker Websocket Inserter
// @match       http*://*.*.*/texthooker.html
// @match       file:///*texthooker.html
// @grant       none
// @version     1.1
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

let afkTimerEnabled = true;
let showTimer = true;

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

  setUpAfkTimer();

  setUpShowTimer();

  setUpChangeTimer();
})();

function setUpDoubleClickEdit() {
  // listen for double click
  document.addEventListener('dblclick', (e) => {
    if (e.target.tagName == 'SPAN') {
      if (!e.target.parentElement.className == 'textline') return;

      // check not dragger
      if (e.target.classList.contains('dragger')) return;

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
  let newHTML = '';
  if (showTimer) {
    newHTML = /* html */ `
  <span class="timerText">${time} ${inserting ? '' : speed} </span>`;
  }
  newHTML += /* html */ `<span class="${status}">${status}</span>`;
  timerElem.innerHTML = newHTML;
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
  updateStatus(false);
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

function addMenuElement(newElem) {
  const menu = document.getElementById('menu');
  menu.appendChild(newElem);
  newElem.style.display = 'none';

  const br = document.createElement('br');
  br.style.display = 'none';
  menu.appendChild(br);

  let expanded = false;
  menu.querySelector('span[title="Toggle menu"').addEventListener('click', async () => {
    expanded = !expanded;
    if (expanded) {
      newElem.style.display = 'inline-block';
      br.style.display = 'block';
    } else {
      newElem.style.display = 'none';
      br.style.display = 'none';
    }
  });
}

function setUpChangeTimer() {
  const changeTimerElem = document.createElement('div');
  addMenuElement(changeTimerElem);

  changeTimerElem.className = 'icon-clock menuitem';
  changeTimerElem.innerText = 'Set Timer';

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
}

function setUpAfkTimer() {
  // default to true if unset
  afkTimerEnabled = localStorage.getItem('afkTimerEnabled') != 'false';
  console.log(`Afk timer enabled: ${afkTimerEnabled}`);

  // add menu element
  const afkTimerElem = elementFromHTML(/* html */ `
<label class="menuitem">
  <input type="checkbox">
  Enable AFK Timer
</label>`);

  if (afkTimerEnabled) {
    afkTimerElem.querySelector('input').checked = true;
  }

  addMenuElement(afkTimerElem);

  afkTimerElem.querySelector('input').addEventListener('change', (e) => {
    const checked = e.target.checked;
    afkTimerEnabled = checked;
    localStorage.setItem('afkTimerEnabled', checked);
    console.log('afkTimerEnabled', afkTimerEnabled);
  });

  // sleep on inactivity
  setInterval(() => {
    if (lastActivityTime + sleepTime < Date.now() && inserting === true) {
      if (afkTimerEnabled) {
        timerElem.click();
      }
    }
  }, 1000);
}

function setUpShowTimer() {
  // default to true if unset
  showTimer = localStorage.getItem('showTimerEnabled') != 'false';
  console.log(`Show timer enabled: ${showTimer}`);

  updateTimerElem();

  // add menu element
  const showTimerElem = elementFromHTML(/* html */ `
<label class="menuitem">
  <input type="checkbox">
  Show Timer
</label>`);

  if (showTimer) {
    showTimerElem.querySelector('input').checked = true;
  }

  addMenuElement(showTimerElem);

  showTimerElem.querySelector('input').addEventListener('change', (e) => {
    const checked = e.target.checked;
    showTimer = checked;
    localStorage.setItem('showTimerEnabled', checked);
    console.log('showTimerEnabled', showTimer);
    updateTimerElem();
  });
}

function elementFromHTML(html) {
  const template = document.createElement('template');
  html = html.trim();
  template.innerHTML = html;
  return template.content.firstChild;
}
