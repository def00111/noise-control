/* globals addon */
let tabsList = document.getElementById("tabs");
let tabTemplate = document.getElementById("tab").content;

addon.port.on("everything", function(tabs) {
  tabTemplate.querySelector("span.mutelabel").textContent =
    " " + document.querySelector('[data-l10n-id="mute.label"]').textContent;
  
	tabsList.innerHTML = "";
	for (let tab of tabs) {
		tabsList.appendChild(createListItem(tab));
	}
});

addon.port.on("tabchanged", function(tab) {
	let listItem = document.getElementById(tab.id);
	if (listItem) {
	  updateTab(listItem, tab);
	}
	else {
	  tabsList.appendChild(createListItem(tab));
	}
});

addon.port.on("tabremoved", function(tab) {
	let listItem = document.getElementById(tab.id);
	if (listItem)
	  listItem.parentNode.removeChild(listItem);
});

function createListItem(tab) {
  let listItem = tabTemplate.cloneNode(true).firstElementChild;
  listItem.setAttribute("id", tab.id);
	listItem.querySelector("input[type=\"checkbox\"]").onclick = onMuteClick;
	updateTab(listItem, tab);
	return listItem;
}

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
