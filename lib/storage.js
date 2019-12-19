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

Storage.getInt = function(key, defaultValue){
    return parseInt(Storage.get(key, defaultValue));
}

Storage.getFloat = function(key, defaultValue){
    return parseFloat(Storage.get(key, defaultValue));
}

Storage.getBoolean = function(key, defaultValue){
    const value = Storage.get(key, defaultValue);
    return (value.toLowerCase() === "true");
}

Storage.clear = function(){
    localStorage.clear();
}
