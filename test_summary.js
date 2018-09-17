window.onload = function() {
    setTimeout(function(){
        chrome.storage.local.get(function(data){
            let s = "";
            for(var site in data){
                s += "<b>" + site + ":</b>  " + data[site].duration_ms + "<br>"; 
            }
            document.getElementById("summary").innerHTML=s;
        });
    }, 1000);
}
