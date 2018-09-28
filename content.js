chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        if(request.cmd == "get_title"){
            sendResponse({page_title: $(document).find("title").text()});     // This might error out
            console.log($(document).find("title").text());
        }
    }
);

