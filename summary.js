// Gathering data and saving it
$(document).ready(function(){

    var template = $("#progress_bar").html();
    var templateScript = Handlebars.compile(template);
    var context = new Object();
    context.sites = [];

    chrome.storage.local.get(function(data){
        // Data Colection: Get sum for use in percentage and duration for each site based on titles
        let site_durations = new Object();                                                      // Used to store calculated durations on each site
        let keyLst = Object.keys(data.site_data);                                               // Used for calculating percentage 
        var sum = keyLst.reduce(function (accu, key){
            let num = 0;
            for(var e in data.site_data[key].titles){
                num +=  data.site_data[key].titles[e].duration_ms;
            }
            site_durations[key] = num; 
            return accu + num; 
        }, 0);
        
        // Create visual represenation from Data Collection
        sites = [];
        for(var k in data.site_data){
            console.log(sum);
            console.log(data.site_data[k].duration_ms);
            
            let percentage = (site_durations[k]/sum) * 100;
            sites.push({"domain_name": k, "percentage": percentage, "sec": site_durations[k]/1000}); 
        }

        // Sorting: Order from most to least
        context.sites = sites.sort(function(a,b){
            if(a.sec < b.sec)
                return 1;
            if(a.sec > b.sec)
                return -1;
            return 0;
        });

        // Handle Bar: Template injection of visual representation
        var html = templateScript(context);
        $(document.body).append(html);
        
    });

});
