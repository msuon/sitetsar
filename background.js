var Windows = new Object();
var wind_id;

function onNewTab(t){

}


function calculate_elapsed(start_ms){
    return new Date().getTime() - start_ms;
}

function record_site_duration(url, windowId, tabId){
    let duration_ms = calculate_elapsed(Windows[windowId].last_update_ts);

    if(!(url in Windows[windowId].visited)){
        Windows[windowId].visited[url] = new Object();
        Windows[windowId].visited[url].duration_ms = 0;
    }
    Windows[windowId].visited[url].domain = url;
    Windows[windowId].visited[url].duration_ms += duration_ms;
}

function get_domain(url){       
    return (url != undefined ? url.split("/")[2] : undefined);
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

        if(url != undefined && Windows[tab.windowId].last_update_ts != undefined){
            record_site_duration(url, tab.windowId, tabId);
        }

        Windows[tab.windowId].prev_domain = Windows[tab.windowId].curr_domain;
        Windows[tab.windowId].curr_domain = get_domain(tab.url);
        Windows[tab.windowId].last_update_ts = new Date().getTime();
    }

}


function tab_cleanup(tabId, removeInfo){
    // Responsibilities:
    // 1) Remove current tab info from window's tabs record
    // 2) Update curr to undefined (new tab_id will be assigned on actviated)
    Windows[removeInfo.windowId].prev_tab_id = Windows[removeInfo.windowId].curr_tab_id;
    Windows[removeInfo.windowId].curr_tab_id = undefined;
    delete Windows[removeInfo.windowId].tabs[tabId];
}

function window_cleanup(windowId, removeInfo){
    // Responsibilities:
    // 1) Update the sync for visited sites
    // 2) Cleanup window
    delete Windows[windowId];
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


chrome.windows.onCreated.addListener(window_init);                                              // For when new window opened 
chrome.windows.onRemoved.addListener(window_cleanup);                                           // For when window closes
chrome.tabs.onCreated.addListener(tab_init);                                                    // For when new tab opened
chrome.tabs.onRemoved.addListener(tab_cleanup);                                                 // For when tab closed
chrome.tabs.onUpdated.addListener(tab_update_handler);                                          // For when url changed (in tab)
chrome.tabs.onActivated.addListener(tabChangedHandler);                                         // For when tab changed
