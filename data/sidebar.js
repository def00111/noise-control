/* globals addon */
let windowsList = document.getElementById("windows");
let tabTemplate = document.getElementById("tab").content;

tabTemplate.querySelector("span.mutelabel").textContent =
  " " + document.querySelector('[data-l10n-id="mute.label"]').textContent;

addon.port.on("everything", function(windows) {
	windowsList.innerHTML = "";
	for (let tabs of windows) {
		let windowItem = document.createElement("li");
		let tabsList = document.createElement("ul");
		for (let tab of tabs) {
      let listItem = tabTemplate.cloneNode(true).firstElementChild;
      listItem.setAttribute("id", tab.id);
			listItem.querySelector("input[type=\"checkbox\"]").onclick = onMuteClick;
			updateTab(listItem, tab);
			tabsList.appendChild(listItem);
		}
		windowItem.appendChild(tabsList);
		windowsList.appendChild(windowItem);
	}
});

function getListItem(element) {
	let listItem = element.parentNode;
	while (listItem && listItem.localName != "li") {
		listItem = listItem.parentNode;
	}
	return listItem;
}

function onMuteClick() {
	addon.port.emit("audioStateChanged", {
		id: getListItem(this).id
	});
}

function updateTab(listItem, tab) {
	listItem.querySelector(".tabicon > img").src = tab.icon ? tab.icon : "chrome://mozapps/skin/places/defaultFavicon.png";
	listItem.querySelector(".tabtitle").textContent = tab.title;
	listItem.querySelector(".tabtitle").setAttribute("title", tab.title);
	listItem.querySelector("input[type=\"checkbox\"]").checked = tab.muted == "true";
}
