// Todo: Add categories of data for permenent storage (local at this point)
// 1) "visited" for site data currently saved
// 2) "settings" for storing all the settings
var Windows = new Object();
var FocusedRecord = { curr_focused_window: undefined, prev_focused_window: undefined};
var wind_id;

function onNewTab(t){

}


function calculate_elapsed(start_ms){
    return new Date().getTime() - start_ms;
}

function record_site_duration(windowId, tabId){
    let ts =  Windows[windowId].last_update_ts;
    let url = Windows[windowId].curr_domain;

    if(url != undefined && ts != undefined){
        let duration_ms = calculate_elapsed(ts);
        if(!(url in Windows[windowId].visited)){
            Windows[windowId].visited[url] = new Object();
            Windows[windowId].visited[url].duration_ms = 0;
        }
        Windows[windowId].visited[url].domain = url;
        Windows[windowId].visited[url].duration_ms += duration_ms;
    }
}

function get_domain(url){       
    return (url != undefined ? url.split("/").slice(0, 3).join("/") : undefined);
}

function save_to_sync(windowId){
    chrome.storage.local.get(function(items){
        for(var site in Windows[windowId].visited){
            let obj = new Object();

            // Bug: Windows[windowId] is no longer there
            if(site in items){
                console.log("Site retrieved, updating..." + Windows[windowId].visited[site].duration_ms);
                obj[site] = items[site];
                obj[site].duration_ms += Windows[windowId].visited[site].duration_ms; 
            }
            else{
                console.log("Site does not exist, making new entry...");
                obj[site] = Windows[windowId].visited[site];
            }
            chrome.storage.local.set(obj);
        }
        delete Windows[windowId];
    });
}

function window_init(new_wind){
    // Todo: need to handle when tab detached from window
    console.log("Staring new window!");
    console.log(new_wind);
    new_wind["last_update_ts"] = undefined;
    new_wind["tabs"] = new Object();
    new_wind["visited"] = new Object();
    new_wind["curr_tab_id"] = undefined;
    new_wind["prev_tab_id"] = undefined;
    new_wind["curr_domain"] = undefined;
    new_wind["prev_domain"] = undefined;
    Windows[new_wind.id] = new_wind;

}

function tab_init(new_tab){
    // Assumption: new tab was opened on the same window as the old tab. We keep tabs sepearted by windowsIds
    Windows[new_tab.windowId].tabs[new_tab.id] = new_tab;
    Windows[new_tab.windowId].prev_tab_id = Windows[new_tab.windowId].curr_tab_id;
    Windows[new_tab.windowId].curr_tab_id = new_tab.id; 
    
}

function update_urls(tabId, tab){
    // Responsible for updated curr and prev url and record time spent on previous site.
    let url = Windows[tab.windowId].curr_domain;
    if(url != get_domain(tab.url) && tabId == Windows[tab.windowId].curr_tab_id){

        record_site_duration(tab.windowId, tabId);

        Windows[tab.windowId].prev_domain = Windows[tab.windowId].curr_domain;
        Windows[tab.windowId].curr_domain = get_domain(tab.url);
        Windows[tab.windowId].last_update_ts = new Date().getTime();
    }

}


function tab_cleanup(tabId, removeInfo){
    // Responsibilities:
    // 1) Remove current tab info from window's tabs record
    // 2) Update curr to undefined (new tab_id will be assigned on actviated)
    // Todo: fix when window close tab not recorded
    Windows[removeInfo.windowId].prev_tab_id = Windows[removeInfo.windowId].curr_tab_id;
    Windows[removeInfo.windowId].curr_tab_id = undefined;
    delete Windows[removeInfo.windowId].tabs[tabId];
}

function window_cleanup(windowId){
    // Responsibilities:
    // 1) Update the sync for visited sites
    // 2) Cleanup window

    try{
        record_site_duration(windowId, Windows[windowId].curr_tab_id);
        save_to_sync(windowId);
    }
    catch(error) {
        console.debug("WindowId: " + windowId);
        console.debug(Windows);
        console.error(error);
        
    }
}

function tab_update_handler(tabId, changeInfo, tab){
    // Responsible for:
    // 1) Recording URL time if changed 
    // 2) Update URL if changed
    // 3) Makes sure that the tab data is up to date
    //
    // Todo: Is the tab data useful? We might not because we never really need 
    // outdated tab data and any tab change will cause the tab data to be outdated.

    update_urls(tabId, tab);
    Windows[tab.windowId].tabs[tabId] = tab;
}

function tabChangedHandler(activeInfo){
    // Responsible for:
    // 1) Recording URL time if changed
    // 2) Update URL (in subfunction) if changed
    // 3) Update window's prev and curr tab_id records
    
    Windows[activeInfo.windowId].prev_tab_id = Windows[activeInfo.windowId].curr_tab_id;
    Windows[activeInfo.windowId].curr_tab_id = activeInfo.tabId;
    update_urls(activeInfo.tabId, Windows[activeInfo.windowId].tabs[activeInfo.tabId]);
}


function focus_changed_handler(windowId){
    // Responsibilities:
    // 1) Set curr_focused_window for tracking which window is in focus
    // 2) Record time spent for window focus was taken from 
    // 3) Setting prev_focused_window for assignment of inactive time (undefined)
    console.log(FocusedRecord);
    console.log(windowId);
    console.log("prev_focus: " + FocusedRecord.curr_focused_window);
    if(FocusedRecord.curr_focused_window != undefined && FocusedRecord.curr_focused_window in Windows){
        record_site_duration(FocusedRecord.curr_focused_window, Windows[FocusedRecord.curr_focused_window].curr_tab_id);
        Windows[FocusedRecord.prev_focused_window].last_update_ts = undefined;
    }
    if(windowId in Windows)
        FocusedRecord.curr_focused_window = (windowId != -1) ? windowId : undefined;                // Save new focused id, but convert -1 to undefined for consistency sake 
    FocusedRecord.prev_focused_window = FocusedRecord.curr_focused_window;
    console.log("curr_focus: " + FocusedRecord.curr_focused_window);

    if(windowId != -1){
        Windows[FocusedRecord.curr_focused_window].last_update_ts = new Date().getTime();
    }
}

function open_test_page(tab){
    // Open a new tab with to the extension page
    chrome.tabs.create({url: chrome.extension.getURL("popup.html")});
}


chrome.windows.onCreated.addListener(window_init);                                              // For when new window opened 
chrome.windows.onRemoved.addListener(window_cleanup);                                           // For when window closes
chrome.tabs.onCreated.addListener(tab_init);                                                    // For when new tab opened
chrome.tabs.onRemoved.addListener(tab_cleanup);                                                 // For when tab closed
chrome.tabs.onUpdated.addListener(tab_update_handler);                                          // For when url changed (in tab)
chrome.tabs.onActivated.addListener(tabChangedHandler);                                         // For when tab changed
chrome.windows.onFocusChanged.addListener(focus_changed_handler);                               // For when window focus changed.

chrome.browserAction.onClicked.addListener(open_test_page);                                     // For when the button is presed
