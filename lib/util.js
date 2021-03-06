function Log(){
    var self = this;
    self.showOutputLog = true;
};

Log.add = function(content){
    if (this.showOutputLog){
        console.log(content);
    }    
};

Log.enableOutputLog = function(status) {
    this.showOutputLog = status;
    Storage.set(Util.ENABLE_OUTPUT_LOG, status);
}

Log.OutPutLog = function() {
    return this.showOutputLog;
}

function Util(){ }

Util.createGUID = function() {
    function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
    }
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
}

Util.sortByKeyAsc = function(array, key) {
    return array.sort(function (a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

Util.sortByKeyDesc = function(array, key) {
    return array.sort(function (a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? +1 : ((x > y) ? -1 : 0));
    });
}

Util.CopyToClipboard = function(el) {    
    var body = document.body, range, sel;
    if (document.createRange && window.getSelection) {
        range = document.createRange();
        sel = window.getSelection();
        sel.removeAllRanges();
        try {
            range.selectNodeContents(el);
            sel.addRange(range);
        } catch (e) {
            range.selectNode(el);
            sel.addRange(range);
        }
    } else if (body.createTextRange) {
        range = body.createTextRange();
        range.moveToElementText(el);
        range.select();
    }
    document.execCommand("Copy")
}

Util.ENABLE_OUTPUT_LOG = "OUTPUT_LOG";
Util.AUTO_REFRESH = "AUTO_REFRESH";
Util.CHECKED_RELEASES = "CHECKED_RELEASES";
Util.FILTERED_CONTENT = "FILTERED_CONTENT";
Util.REFRESH_INTERVAL = "REFRESH_INTERVAL";
Util.DASHBOARD_TYPE = "DASHBOARD_TYPE";