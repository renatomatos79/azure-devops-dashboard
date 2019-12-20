var HttpClient = function(config){
    var self = this;
    self.default = { baseURL: '', token: '' };
    self.options = $.extend({}, self.default, config);

    self.createInstance = function(){
        var encodedData = btoa(":" + self.options.token);
        encodedData = "Basic " + encodedData;

        const instance = axios.create({
            baseURL: self.options.baseURL,
            headers: {'Authorization': encodedData, "Content-Type" : 'application/json'}
        });

        return instance;
    }

    return self.createInstance();
}