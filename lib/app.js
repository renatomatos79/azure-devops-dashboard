var app = new Vue({
    el: '#app',
    data: {
      title: 'Releases MH - DashBoard',
      version: 'v1.0.65',
      filtered: false,
      settings: {
        show: null,
        showMore: null,
        showPhaseName: false,
        showOutputLog: false,        
        autoRefresh: true
      },
      refresh: {
        interval: 120,
        elapsedTime: 0,
        inputInterval: 120,
        intervalMinValue: 45,
        intervalMaxValue: 1440
      },
      isVssReady: false,
      lasAppItemId: "",
      filterContent: "",
      cards: [],
      productionReleases: [],
      selectedProducitonRelease: "",
      selectedProductionBadge: "",
      apps: [
        { id: "azr",    path: "\\6-AZR",    searchContent: "AZR",    prefix: "vNext - DEV AZR",     sufix: "AZR Deployment with DSC",    title: "AZR", visible: false, releaseList: [], isReleaseListLoaded: false, color: "danger", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-3', checkedReleases: [] },
        { id: "biz",    path: "\\1-BIZ",    searchContent: "BIZ",    prefix: "vNext - DEV BIZ",     sufix: "BIZ Deployment with DSC",    title: "BIZ", visible: false, releaseList: [], isReleaseListLoaded: false, color: "warning", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-4', checkedReleases: [] },
        { id: "bom",    path: "\\5-BOM",    searchContent: "BOM",    prefix: "vNext - DEV BOM",     sufix: "BOM Deployment with DSC",    title: "BOM", visible: false, releaseList: [], isReleaseListLoaded: false, color: "secondary", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-3', checkedReleases: [] },
        { id: "ott",    path: "\\2-OTT",    searchContent: "OTT",    prefix: "vNext - DEV OTT",     sufix: "OTT Deployment with DSC",    title: "OTT", visible: false, releaseList: [], isReleaseListLoaded: false, color: "success", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-3', checkedReleases: [] },
        { id: "ovx",    path: "\\7-OVX",    searchContent: "OVX",    prefix: "vNext - DEV OVX",     sufix: "OVX Deployment with DSC",    title: "OVX", visible: false, releaseList: [], isReleaseListLoaded: false, color: "primary", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-3', checkedReleases: [] },
        { id: "player", path: "\\4-PLAYER", searchContent: "Player", prefix: "vNext - DEV Player",  sufix: "Player Deployment with DSC", title: "PLAYER", visible: false, releaseList: [], isReleaseListLoaded: false, color: "dark", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-2', checkedReleases: [] },
        { id: "sf",     path: "\\3-SF",     searchContent: "SF",     prefix: "SF",                  sufix: "",                           title: "SF", visible: false, releaseList: [], isReleaseListLoaded: false, color: "info", truncateBuildNumber: true, isRunning: false, margin: 'py-3 pl-4', checkedReleases: [] }
      ]      
    },
    computed: {
      filteredCards: function () {
        let resultList = this.cards;
        const text = this.filterContent.trim().toLowerCase();
        let checkedReleases = [];
        this.apps.forEach(appItem => {
          appItem.checkedReleases.forEach(release => {
            checkedReleases.push(release);
          });
        });

        if (checkedReleases.length === 0) {
          return [];
        }        

        // filter by Input Search 
        if (text !== "") {
          resultList = resultList.filter
              (
                f => 
                    f.content.dev.some(dev => dev.contentFilter.includes(text)) ||
                    f.content.qa.some(qa => qa.contentFilter.includes(text)) ||
                    f.content.stg.some(stg => stg.contentFilter.includes(text)) ||
                    f.content.prd.some(prd => prd.contentFilter.includes(text))
              );
        }

        // only releases with at least one build
        resultList = resultList.filter(f => (f.content.dev.length + f.content.qa.length + f.content.stg.length + f.content.prd.length) > 0);

        // get checked releases by app
        resultList = resultList.filter(f => checkedReleases.indexOf(f.release.definitionName) >= 0);

        // at the end sort
        return Util.sortByKeyAsc(resultList, "appTitle");
      }      
    },
    watch: {
      'settings.autoRefresh': function(val, oldVal) {
        app.refresh.elapsedTime = 0;
        Storage.set(Util.AUTO_REFRESH, val);
        Log.add(`Refresh timeout changed!`);
      },
      'settings.showOutputLog': function(val, oldVal) {
        Log.enableOutputLog(val);
        Log.add(`Output log changed to ${val}`);
      },
      'filterContent': function(val, oldVal){
        Storage.set(Util.FILTERED_CONTENT, val);
      },
      'apps': {
        deep: true,
        handler: function(val, oldVal){
          val.forEach(appItem => {
            const storageName = appItem.id.toUpperCase() + "_" + Util.CHECKED_RELEASES;
            Storage.set(storageName, appItem.checkedReleases);
          });          
        }
      },
      'refresh.inputInterval': function(val, oldVal) {
        const newVal = parseInt(val);
        if (newVal >= 60 || newVal <= 1440) {
          Storage.set(Util.REFRESH_INTERVAL, newVal);
          this.updateRefreshInterval(newVal);
        } 
      }
    },
    methods: {
      init: function(){
        this.cards = [];
        this.isVssReady = true;
        this.apps.forEach(a=>{a.isRunning=false;});
        // this.clearDB();
        initDashboard();
        this.loadDefaultValues();
        this.prepareReleaseList();
      },
      loadDefaultValues: function(){
        const enableOutputLog = Storage.getBoolean(Util.ENABLE_OUTPUT_LOG, false);
        const autoRefresh = Storage.getBoolean(Util.AUTO_REFRESH, true);
        const filterContent = Storage.get(Util.FILTERED_CONTENT, "");
        const refreshInterval =  Storage.getInt(Util.REFRESH_INTERVAL, 120);

        this.apps.forEach(appItem => {
          const storageName = appItem.id.toUpperCase() + "_" + Util.CHECKED_RELEASES;
          const checkedReleases = Storage.get(storageName, []);
          if (checkedReleases != null && checkedReleases.length > 0) {
            checkedReleases.split(",").forEach(item => {
              appItem.checkedReleases.push(item);
            });
          }
        });
        this.settings.autoRefresh = autoRefresh;
        this.settings.showOutputLog = enableOutputLog;
        this.filterContent = filterContent;
        this.refresh.inputInterval = refreshInterval;
        this.updateRefreshInterval(refreshInterval);
        Log.enableOutputLog(enableOutputLog);
      },
      // clearDB: function(){
      //   var db = new AzureDashBoardDB();
      //   db.clear();
      // },
      getAppItem: function(id){
        const item = this.apps.filter(f => f.id === id);
        if (item === null || item === undefined) {
          return null;
        } else {
          return item[0];
        }
      },
      getCard: function(definitionId){
        const card = this.cards.filter(f => f.release.definitionId === definitionId);
        if (card === null || card === undefined) {
          return null;
        } else {
          return card[0];
        }
      },
      prepareReleaseList: function(){
        $.each(this.apps, function (idx1, appItem) {
          getReleaseDefinitionsForAppItem(appItem);
        });  
        VSS.notifyLoadSucceeded();
      },
      updateApplicationFilter: function(){
        this.$forceUpdate();
      },
      isAppRunning: function(){
        return this.apps.some(s => s.isRunning === true);
      },
      onAppClick: function(event){        
        let id = event.target.attributes.applicationId.value;
        let appItem = this.getAppItem(id);
        appItem.visible = !appItem.visible;
        if (appItem.isReleaseListLoaded === false) {
          getReleaseDefinitionsForAppItem(appItem);
          VSS.notifyLoadSucceeded();
        }        
      },      
      onCheckItem: function(event){
        let id = event.target.attributes.applicationId.value;
        let index = _.findIndex(this.releaseList, function(it){ return id === it.definitionId; });
        let item = this.releaseList[index];
        item.isChecked = event.target.checked;
      },
      onFilter: function(event){
        this.filtered = !this.filtered;
      },
      onRefresh: function(event){
        if (this.isAppRunning() === false) {
          this.init();
        }
      },
      onChangeSettings: function(event){
        this.settings.show = !this.settings.show;
      },
      onCheckItems: function(event){
        const id = event.target.attributes.applicationId.value;
        const appItem = this.getAppItem(id);
        // appItem.checkItems = !appItem.checkItems;
        let releases = appItem.releaseList.map(m => m.definitionName);
        if (appItem.checkedReleases.length === 0) {
          releases.forEach(r => {
            let index = appItem.checkedReleases.indexOf(r);
            if (index < 0) appItem.checkedReleases.push(r);
          });          
        } else {
          appItem.checkedReleases= [];
        }
        this.updateApplicationFilter();
      },
      onReleaseItemClick: function(event) {
        let buildId = event.target.attributes.bid.value;
        let releaseText = event.target.attributes.rt.value;
        let badgeColor = 'badge-' + event.target.attributes.bc.value;
        showWorkItemsListDialog(buildId, releaseText, badgeColor);
      },
      onViewReleasesHistoryClick: function(event) {
        const definitionName = event.target.attributes.definitionName.value;
        const productions = Deployments.filter(f => f.definitionName === definitionName && f.envGroup === "prd");
        this.productionReleases = Util.sortByKeyDesc(productions, "sortColumn"); 
        this.selectedProducitonRelease = event.target.attributes.rt.value;
        this.selectedProductionBadge = 'badge-' + event.target.attributes.bc.value;

        $( "#dialog" ).dialog({
          autoOpen: false,
          height: 400,
          width: 600,
          show: {
            effect: "blind",
            duration: 1000
          },
          hide: {
            effect: "explode",
            duration: 1000
          }
        });

        $("#dialog" ).dialog( "open" );
        $("button.ui-dialog-titlebar-close").html('<i class="fa fa-times"></i>');
        $("div.ui-dialog-titlebar").css("color", "white");
        $("div.ui-dialog-titlebar").css("font-size", "15px");
        $("div.ui-dialog-titlebar").css("background-color", "#17a2b8");


      },
      updateRefreshInterval: function(value) {
        if (value >= this.refresh.intervalMinValue && value <= this.refresh.intervalMaxValue) {
          this.refresh.interval = value;
        }
      },
      onClipboardClick: function(event) {
        const table = document.getElementById('tabProdReleases');
        Util.CopyToClipboard(table);
      }
    }
});