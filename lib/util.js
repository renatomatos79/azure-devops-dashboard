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

Util.ENABLE_OUTPUT_LOG = "OUTPUT_LOG";
Util.AUTO_REFRESH = "AUTO_REFRESH";
Util.CHECKED_RELEASES = "CHECKED_RELEASES";