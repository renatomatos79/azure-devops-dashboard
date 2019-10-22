setInterval(() => {

    if (app.settings.autoRefresh === true) {
        if (app.isAppRunning() === false) {
            app.refresh.elapsedTime++;
            if (app.refresh.elapsedTime > app.refresh.interval) {
                app.refresh.elapsedTime = 0;
                app.onRefresh();
            }
        }
    }

}, 1000);