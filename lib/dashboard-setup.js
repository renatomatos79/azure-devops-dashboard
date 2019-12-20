VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true,
    usePlatformScripts: true
});

// Register callback to get called when initial handshake completed
VSS.ready(() => {
    // this is the startup method
    app.init();
    VSS.notifyLoadSucceeded();
}); 
