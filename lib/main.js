/* global exports, require */
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const keysetID = "noise-control-keyset";
const keyID = "key_noiseControl";

const ID_KEYSET_MAIN = "mainKeyset";

const { Cc, Ci, Cu } = require("chrome");
const { data, loadReason, version } = require("sdk/self");
const { viewFor } = require("sdk/view/core");
const preferences = require("sdk/simple-prefs");
const tabs = require("sdk/tabs");
const _ = require("sdk/l10n").get;
const { toggle } = require('sdk/ui/sidebar/actions');
const { isShowing } = require('sdk/ui/sidebar/utils');
const events = require("sdk/system/events");
const { browserWindows }= require("sdk/windows");

/*** START UP ***/
function onReady(event) {
  setup(event.subject);
}
events.on("browser-delayed-startup-finished", onReady, false);

function setup(window) {
	let { document: doc, gBrowser, MutationObserver } = window;
	
	gBrowser.tabContainer.addEventListener("TabAttrModified", onTabAttrModified, false);
	
	let $ = id => doc.getElementById(id);
	let xul = type => doc.createElementNS(XUL_NS, type);
	
	let modifiers = preferences.prefs["modifiers"] || "accel,alt";
	let key = preferences.prefs["key"] || "n";
	
  let keyset = $(keysetID);
  if (keyset)
    return;
  else
    keyset = xul("keyset");
  keyset.setAttribute("id", keysetID);

  // add hotkey
  let toggleKey = xul("key");
  toggleKey.setAttribute("id", keyID);
  toggleKey.setAttribute("key", key);
  toggleKey.setAttribute("modifiers", modifiers);
  toggleKey.setAttribute("oncommand", "void(0);");
  toggleKey.addEventListener("command", toggle.bind(null, sidebar), true);
  $(ID_KEYSET_MAIN).parentNode.appendChild(keyset).appendChild(toggleKey);
  
  let menuitem = $("jetpack-sidebar-noise-control");
  if (menuitem)
    menuitem.setAttribute("key", keyID);
  else {
    let target = $('viewSidebarMenu');

    let config = { childList: true };
    
    let observer = new MutationObserver(mutations => {
      for (let mutation of mutations) {
        if (mutation.type == "childList") {
          for (let node of mutation.addedNodes) {
            if (node.localName == "menuitem") {
              let id = node.getAttribute("id");
              if (id == "jetpack-sidebar-noise-control") {
                node.setAttribute("key", keyID);
                observer.disconnect();
              }
            }
          }
        }
      }    
    });
    observer.observe(target, config);
  }
}

function modifiersChanged(pref) {
	let modifiers = preferences.prefs[pref] || "accel,alt";

	for (let sdkWindow of browserWindows) {
		let { document: doc } = viewFor(sdkWindow);
    
    let $ = id => doc.getElementById(id);
    
    let key = $(keyID);
    if (key) {
		  key.setAttribute("modifiers", modifiers);
		  
		  let menuitem = $("jetpack-sidebar-noise-control");
		  if (menuitem) {
		    menuitem.removeAttribute("acceltext");
		  }
		}
	}
}
preferences.on("modifiers", modifiersChanged);

function keyChanged(pref) {
	let key = preferences.prefs[pref] || "n";

	for (let sdkWindow of browserWindows) {
		let { document: doc } = viewFor(sdkWindow);
    
    let $ = id => doc.getElementById(id);
    
    let toggleKey = $(keyID);
    if (toggleKey) {
		  toggleKey.setAttribute("key", key);
		  
		  let menuitem = $("jetpack-sidebar-noise-control");
		  if (menuitem) {
		    menuitem.removeAttribute("acceltext");
		  }
		}
	}
}
preferences.on("key", keyChanged);

let sidebarWorkers = new Set();
let sidebar = require("sdk/ui/sidebar").Sidebar({
	id: "noise-control",
	title: _("sidebar.title"),
	url: "./sidebar.html",
	onAttach: function (worker) {
	  sidebarWorkers.add(worker);
	},
	onReady: function (worker) {
		let windows = [];
		for (let sdkWindow of browserWindows) {
			windows.push(getNoisyTabsForWindow(viewFor(sdkWindow)));
		}
		worker.port.emit("everything", windows);
		worker.port.on("audioStateChanged", function(data) {
			for (let sdkWindow of browserWindows) {
				let { gBrowser } = viewFor(sdkWindow);
				for (let tab of gBrowser.tabs) {
					if (tab.getAttribute("linkedpanel") == data.id) {
					  tab.toggleMuteAudio();
						return;
					}
				}
			}
		});
	},
	onDetach: function(worker) {
		sidebarWorkers.delete(worker);
	}
});
exports.sidebar = sidebar;

for (let sdkWindow of browserWindows) {
  setup(viewFor(sdkWindow));
}

function onTabAttrModified(event) {
  if (!sidebarWorkers.size)
    return;
  
  ["muted", "soundplaying"].forEach(attr => {
    if (event.detail.changed.indexOf(attr) >= 0) {
      let windows = [];
      for (let sdkWindow of browserWindows) {
        windows.push(getNoisyTabsForWindow(viewFor(sdkWindow)));
      }
      
      for (let sw of sidebarWorkers) {
			  sw.port.emit("everything", windows);
		  }
	  }
  });
}

/*** SHUT DOWN ***/
exports.onUnload = function(reason) {
	if (reason == "shutdown") {
		return;
	}

  events.off("browser-delayed-startup-finished", onReady);
	preferences.removeListener("modifiers", modifiersChanged);
	preferences.removeListener("key", keyChanged);
	
	for (let sdkWindow of browserWindows) {
		let { document: doc, gBrowser } = viewFor(sdkWindow);
		
		gBrowser.tabContainer.removeEventListener("TabAttrModified", onTabAttrModified, false);
		
    let keyset = doc.getElementById(keysetID);
    if (keyset) {
      keyset.parentNode.removeChild(keyset);
    }
  }
  
	if (isShowing(sidebar))
    sidebar.hide();
	sidebar.dispose();
};

function getNoisyTabData(tab) {
	return {
		id: tab.getAttribute("linkedpanel"),
		icon: tab.getAttribute("image"),
		title: tab.getAttribute("label"),
		muted: tab.getAttribute("muted")
	};
}

function getNoisyTabsForWindow(chromeWindow) {
	let noisyTabs = [];
	for (let tab of chromeWindow.gBrowser.visibleTabs) {
		if (tab.getAttribute("soundplaying")) {
			noisyTabs.push(getNoisyTabData(tab));
		}
	}
	return noisyTabs;
}
