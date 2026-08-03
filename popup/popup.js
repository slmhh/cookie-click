'use strict';

var totalEl = document.getElementById('total');
var eatenEl = document.getElementById('eaten');
var busy = false;

function render(data) {
  totalEl.textContent = data.total || 0;
  eatenEl.textContent = data.eaten || 0;
}

function load() {
  chrome.storage.local.get({ total: 0, eaten: 0 }, render);
}

document.getElementById('eat').addEventListener('click', function () {
  if (busy) return;
  busy = true;
  chrome.storage.local.get({ total: 0, eaten: 0 }, function (d) {
    busy = false;
    var total = d.total || 0;
    if (total <= 0) return;
    chrome.storage.local.set({ total: total - 1, eaten: (d.eaten || 0) + 1 }, load);
  });
});

document.getElementById('clear').addEventListener('click', function () {
  chrome.storage.local.set({ total: 0, eaten: 0 }, load);
});

chrome.storage.onChanged.addListener(load);
load();
