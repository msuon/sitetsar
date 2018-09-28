var tabs = [];
var test_cases = [];
test_cases.push({url:"https://www.google.com/", wait: 3000});
test_cases.push({url:"http://monirothsuon.com/", wait: 15000});
test_cases.push({url:"https://www.apple.com/", wait: 10000});
test_cases.push({url:"https://www.gmail.com/", wait: 5000});
test_cases.push({url:"https://www.amazon.com/", wait: 2000});
test_cases.push({url:"https://www.facebook.com/", wait: 4000});
test_cases.push({url:"https://www.youtube.com/", wait: 5000});
test_cases.push({url:"https://www.yahoo.com/", wait: 5000});
test_cases.push({url:"https://www.walgreens.com/", wait: 5000});
test_cases.push({url:"https://www.netflix.com/", wait: 5000});
test_cases.push({url:"https://www.youtube.com/", wait: 5000});
test_cases.push({url:"https://www.gmail.com/", wait: 5000});
test_cases.push({url:"https://monirothsuon.com/", wait: 5000});
test_cases.push({url:"https://www.apple.com/", wait: 5000});

function delayed_open(delay, target_url){
    setTimeout(function (){
        chrome.tabs.create({url: target_url}, function (t){
            tabs.push(t.id);
        });
    }, delay);
}


function duration_at_open(test_cases, windowId){
    var delay = 0;
    for(var c in test_cases){

        delayed_open(delay, test_cases[c].url),
        delay += test_cases[c].wait;
    }

    // Open Summary Page
    setTimeout(function (){
        chrome.windows.remove(windowId, function (){
            console.log("ending!!");
            chrome.windows.create({url: chrome.extension.getURL("summary.html")});
        });
    }, delay);

    
}

function tab_switches(test_cases, windowId){

    var delay = 0;
    for(var c in test_cases){

        delayed_open(delay, test_cases[c].url),
            delay += test_cases[c].wait;
    }

    setTimeout(function (){

        let delay2 = 3000;
        // Move through tabs and close at end
        for(var tid in test_cases){
            setTimeout(function(){
                chrome.tabs.update(test_cases.pop(), {active: true});
            }, delay2);
            delay2 += 3000;
        }
        setTimeout(function(){
            chrome.windows.remove(windowId, function (){

                // Open Summary Page
                chrome.windows.create({url: chrome.extension.getURL("summary.html")});
            });
        }, delay2);
    }, delay);

}

function basic_time_test(){
    
    chrome.storage.local.clear();

    chrome.windows.getCurrent(function(w){
        duration_at_open(test_cases, w.id); 
    });

}

function tab_changes_test(){
    chrome.storage.local.clear();

    chrome.windows.getCurrent(function(w){
        tab_switches(test_cases, w.id); 
    });
}


$(document).ready(function (){
    $("#button_1").on("click", basic_time_test); 
});

