function Storage(){}

Storage.set = function(key, value){
    localStorage.setItem(key, value);
}

Storage.get = function(key, defaultValue){
    const item = localStorage.getItem(key);
    if (item === null || item === undefined)
    {
        return defaultValue;        
    }
    return item;
}

Storage.clear = function(){
    localStorage.clear();
}
