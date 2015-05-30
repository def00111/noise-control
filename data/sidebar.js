/* globals addon */

let windowsList = document.getElementById("windows");

addon.port.on("everything", function(windows) {
	windowsList.innerHTML = "";
	for (let tabs of windows) {
		let windowItem = document.createElement("li");
		let tabsList = document.createElement("ul");
		for (let tab of tabs) {
			let listItem = document.createElement("li");
			listItem.setAttribute("id", tab.id);
			listItem.innerHTML =
				'<div class="tabicon"><img src="defaultFavicon.png" /></div>' +
				'<div class="tabtitle">hexy.ogg</div>' +
				'<div class="tabmute"><label><input type="checkbox" /><span class="mutelabel"> Mute</span></label></div>' +
				'<div class="tabvolume">' +
					'<svg width="16" height="16"><use style="transform: translate(0, -48px)" xlink:href="noisy.svg#base" /></svg>' +
					'<input type="range" step="5" />' +
					'<svg width="16" height="16"><use xlink:href="noisy.svg#base" /></svg>' +
				'</div>';
			listItem.querySelector("input[type=\"checkbox\"]").onclick = onMuteClick;
			listItem.querySelector("input[type=\"range\"]").onchange = onVolumeChange;
			listItem.querySelector("input[type=\"range\"]").onkeyup = onVolumeChangeKey;
			updateTab(listItem, tab);
			tabsList.appendChild(listItem);
		}
		windowItem.appendChild(tabsList);
		windowsList.appendChild(windowItem);
	}
});

addon.port.on("tabchanged", function(tab) {
	let listItem = document.getElementById(tab.id);
	updateTab(listItem, tab);
});

function getListItem(element) {
	let listItem = element.parentNode;
	while (listItem && listItem.localName != "li") {
		listItem = listItem.parentNode;
	}
	return listItem;
}

function onMuteClick() {
	let listItem = getListItem(this);

	addon.port.emit("audioStateChanged", {
		id: listItem.id,
		state: this.checked
	});
}

function onVolumeChange() {
	let listItem = getListItem(this);

	addon.port.emit("audioStateChanged", {
		id: listItem.id,
		state: this.value / 100
	});
}

function onVolumeChangeKey(event) {
	if ([33, 34, 37, 38, 39, 40].indexOf(event.keyCode) >= 0) {
		this.onchange();
	}
}

function updateTab(listItem, tab) {
	listItem.querySelector(".tabicon > img").src = tab.icon ? tab.icon : "chrome://mozapps/skin/places/defaultFavicon.png";
	listItem.querySelector(".tabtitle").textContent = tab.title;
	listItem.querySelector("input[type=\"checkbox\"]").checked = tab.noisy.indexOf("muted") >= 0;
	listItem.querySelector("input[type=\"range\"]").value = tab.volume * 100;
}
