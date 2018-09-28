// Todo: Add categories of data for permenent storage (local at this point)
// 1) "visited" for site data currently saved
// 2) "settings" for storing all the settings

var Windows = new Object();
var FocusedRecord = { curr_focused_window: undefined, prev_focused_window: undefined};
var wind_id;

function calculate_elapsed(start_ms){
    return new Date().getTime() - start_ms;
}

function record_site_duration(windowId, tabId){
    let ts =  Windows[windowId].last_update_ts;
    let url = Windows[windowId].curr_domain;
    let title = Windows[windowId].curr_title;

    if(url != undefined && ts != undefined){
        let duration_ms = calculate_elapsed(ts);
        save_to_sync(windowId, url, duration_ms, title);
    }
}

function get_domain(url){       
    return (url != undefined ? url.split("/").slice(0, 3).join("/") : undefined);
}

function save_to_sync(windowId, site, duration_ms, title){
    chrome.storage.local.get("site_data", function(items){
        
        // Checking case when no data base structure for duration exists
        if(!("site_data" in items)){
            console.log("No site_duration data. Creating one..." + duration_ms);
            items["site_data"] = new Object(); 
        }

        // Checking case when no entry for site exits, initialize it to 0
        if(!(site in items["site_data"])){
            // items.site_data[site] = {duration_ms: 0};
            items.site_data[site] = {titles: new Object()};
        }
       
        // Checking case when no entry for title exists
        if(!(title in items.site_data[site].titles)){
            items.site_data[site].titles[title] = {duration_ms: 0}
        }


        items.site_data[site].titles[title].duration_ms += duration_ms;
        chrome.storage.local.set(items); 

    });
}

function window_init(new_wind){
    // Todo: need to handle when tab detached from window
    console.log("Staring new window!");
    console.log(new_wind);
    new_wind["last_update_ts"] = undefined;
    new_wind["tabs"] = new Object();
    // new_wind["visited"] = new Object();
    new_wind["curr_tab_id"] = undefined;
    new_wind["prev_tab_id"] = undefined;
    new_wind["curr_domain"] = undefined;
    new_wind["prev_domain"] = undefined;
    new_wind["curr_title"] = undefined;
    new_wind["prev_title"] = undefined;

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
    console.log("update_urls called");
    let url = Windows[tab.windowId].curr_domain;
    if(url != get_domain(tab.url) && tabId == Windows[tab.windowId].curr_tab_id){

        record_site_duration(tab.windowId, tabId);
        
        chrome.tabs.sendMessage(tabId, {cmd:"get_title"}, 
            function(response){
                
                let page_title = (response != undefined) ? response.page_title : "unknown";

                console.log("New Tab Title: " + page_title);
                Windows[tab.windowId].prev_title = Windows[tab.windowId].curr_title;
                Windows[tab.windowId].curr_title = page_title;
                Windows[tab.windowId].prev_domain = Windows[tab.windowId].curr_domain;
                Windows[tab.windowId].curr_domain = get_domain(tab.url);
                Windows[tab.windowId].last_update_ts = new Date().getTime();
            }
        );
    }

}


function tab_cleanup(tabId, removeInfo){
    // Responsibilities:
    // 1) Remove current tab info from window's tabs record
    // 2) Update curr to undefined (new tab_id will be assigned on actviated)
    // Todo: fix when window close tab not recorded
    console.log("tab_cleanup called");
    try{
        Windows[removeInfo.windowId].prev_tab_id = Windows[removeInfo.windowId].curr_tab_id;
        Windows[removeInfo.windowId].curr_tab_id = undefined;
        delete Windows[removeInfo.windowId].tabs[tabId];
    }
    catch(error){
        window.alert("Tab Cleanup: Error on " + new Date() + "\nAt WindowId: " + removeInfo.windowId + "\nAt tab: " + tabId);
        console.debug("Tab Cleanup: Error on " + new Date() + "\nAt WindowId: " + removeInfo.windowId + "\nAt tab: " + tabId);
        console.debug(Windows);
        console.error(error);
    }
}

function window_cleanup(windowId){
    // Responsibilities:
    // 1) Update the sync for visited sites
    // 2) Cleanup window
    console.log("window_cleanup called");
    try{
        record_site_duration(windowId, Windows[windowId].curr_tab_id);
    }
    catch(error) {
        window.alert("Window Cleanup: Error on " + new Date() + "\nAt WindowId: " + windowId);
        console.debug("Window Cleanup: Error on " + new Date() + "\nAt WindowId: " + windowId);
        console.debug(Windows);
        console.error(error);
        
    }
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
    if(changeInfo.status == "complete"){ 
        console.log("tab_update_handler called");
        update_urls(tabId, tab);
        Windows[tab.windowId].tabs[tabId] = tab;
    }
}

function tabChangedHandler(activeInfo){
    // Responsible for:
    // 1) Recording URL time if changed
    // 2) Update URL (in subfunction) if changed
    // 3) Update window's prev and curr tab_id records
    
    console.log("tabChangedHandler called");
    try{
        Windows[activeInfo.windowId].prev_tab_id = Windows[activeInfo.windowId].curr_tab_id;
        Windows[activeInfo.windowId].curr_tab_id = activeInfo.tabId;
        update_urls(activeInfo.tabId, Windows[activeInfo.windowId].tabs[activeInfo.tabId]);
    }
    catch(error){
        window.alert("Tab Change: Error on " + new Date() + "\nAt WindowId: " + activeInfo.windowId + "\nAt tab: " + activeInfo.tabId);
        console.debug("Tab Change: Error on " + new Date() + "\nAt WindowId: " + activeInfo.windowId + "\nAt tab: " + activeInfo.tabId);
        console.debug(Windows);
        console.error(error);
    }
}


function focus_changed_handler(windowId){
    // Responsibilities:
    // 1) Set curr_focused_window for tracking which window is in focus
    // 2) Record time spent for window focus was taken from 
    // 3) Setting prev_focused_window for assignment of inactive time (undefined)
    console.log("focus_changed_handler called");
    try{
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
    catch(error){
        window.alert("Focus Change: Error on " + new Date() + "\nAt WindowId: " + windowId);
        console.debug("Focus Change: Error on " + new Date() + "\nAt WindowId: " + windowId);
        console.debug(Windows);
        console.error(error);
    }
}


function open_test_page(tab){
    // Open a new tab with to the extension page
    // chrome.tabs.create({url: chrome.extension.getURL("popup.html")});                           // Uncomment if wanted to test
    
    chrome.tabs.create({url: chrome.extension.getURL("summary.html")});                           // Uncomment if wanted to test
    
    
}


chrome.windows.onCreated.addListener(window_init);                                              // For when new window opened 
chrome.windows.onRemoved.addListener(window_cleanup);                                           // For when window closes
chrome.tabs.onCreated.addListener(tab_init);                                                    // For when new tab opened
chrome.tabs.onRemoved.addListener(tab_cleanup);                                                 // For when tab closed
chrome.tabs.onUpdated.addListener(tab_update_handler);                                          // For when url changed (in tab)
chrome.tabs.onActivated.addListener(tabChangedHandler);                                         // For when tab changed
chrome.windows.onFocusChanged.addListener(focus_changed_handler);                               // For when window focus changed.

chrome.browserAction.onClicked.addListener(open_test_page);                                     // For when the button is presed

// Todo 09/20
// - make sure data is being saved at the following events
// -- tab change --
// -- tab url change --
// -- tab close -- Happens on tab_update (beacuse it switches to new tab), what if it's the last tab? (testing needed)
// -- window change -- 
// -- focus change -- (same as window change)
// -- window close -- 
//
//
//
// Things to change/add
// Save title of each page visited under domain data (which also has it's own duration_ms)
//      -- Added this but will only trigger when domain first loads (might have to do with if prev_domain == curr_domain, need to make it full url not just domain)
//
//
// TODO:
//-- Need to track by either title or full url, not just name
//
// Bugs:
// -- Errors while trying to retrieve data from site without title
// ---- When this error occurs duration count keeps going on for last non errored site
// -- Tab updates multiple times when a page first load.
// ---- We are calling the handlers multiple times before and after the document is ready. Need to only call once when the document is ready
//
//
// Important Points:
// -- Tab change:
// ---- If domain is same it's not being recorded
// -- Window Change
// ---- Works fine
// -- Tab close:
// ---- Problem stem from tab change
// -- Window Close:
// -- Works fine unless window doesn't exist in Windows global
// -- URL change (Same tab):
// ---- Clicking link in same domain doesn't record
// ---- Going to site in the same domain doesn't record
// -- When tab is pulled off into a new window 
// ---- Error occurs (needs further investigation)
