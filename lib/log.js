function Log(){
    var self = this;
    self.enabled = true;
};

Log.add = function(content){
    if (this.enabled){
        console.log(content);
    }    
};

Log.enableOutputLog = function(status) {
    this.enabled = status;
}