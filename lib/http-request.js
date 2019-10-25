var HttpClient = function(config){
    var self = this;
    self.default = { baseURL: '' };
    self.options = $.extend({}, self.default, config);

    self.createInstance = function(){
        var encodedData = btoa(":" + SECURITY_TOKEN);
        encodedData = "Basic " + encodedData;

        const instance = axios.create({
            baseURL: self.options.baseURL,
            headers: {'Authorization': encodedData, "Content-Type" : 'application/json'}
        });

        return instance;
    }

    return self.createInstance();
}