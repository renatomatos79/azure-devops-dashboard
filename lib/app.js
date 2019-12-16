var app = new Vue({
    el: '#app',
    data: {
      title: 'Releases MH - DashBoard - v1.0.59',
      filtered: false,
      settings: {
        show: false,
        showMore: false,
        showPhaseName: false,
        autoRefresh: false
      },
      refresh: {
        interval: 120,
        elapsedTime: 0
      },
      isVssReady: false,
      lasAppItemId: "",
      filterContent: "",
      checkedReleases: [],
      cards: [],
      apps: [
        { id: "biz",    path: "\\1-BIZ",    searchContent: "BIZ",    prefix: "vNext - DEV BIZ",     sufix: "BIZ Deployment with DSC",    title: "BIZ", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "warning", truncateBuildNumber: false, isRunning: false, margin: 'mt-3' },
        { id: "ott",    path: "\\2-OTT",    searchContent: "OTT",    prefix: "vNext - DEV OTT",     sufix: "OTT Deployment with DSC",    title: "OTT", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "success", truncateBuildNumber: false, isRunning: false, margin: 'mt-0' },
        { id: "sf",     path: "\\3-SF",     searchContent: "SF",     prefix: "SF",                  sufix: "",                           title: "SF", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "info", truncateBuildNumber: true, isRunning: false, margin: 'mt-3' },
        //{ id: "player", path: "\\4-PLAYER", searchContent: "Player", prefix: "vNext - DEV Player",  sufix: "Player Deployment with DSC", title: "PLAYER", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "dark", truncateBuildNumber: false, isRunning: false, margin: 'mt-3' },
        //{ id: "bom",    path: "\\5-BOM",    searchContent: "BOM",    prefix: "vNext - DEV BOM",     sufix: "BOM Deployment with DSC",    title: "BOM", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "secondary", truncateBuildNumber: false, isRunning: false, margin: 'mt-0' },
        //{ id: "azr",    path: "\\6-AZR",    searchContent: "AZR",    prefix: "vNext - DEV AZR",     sufix: "AZR Deployment with DSC",    title: "AZR", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "danger", truncateBuildNumber: false, isRunning: false, margin: 'mt-0' },
        //{ id: "ovx",    path: "\\7-OVX",    searchContent: "OVX",    prefix: "vNext - DEV OVX",     sufix: "OVX Deployment with DSC",    title: "OVX", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "primary", truncateBuildNumber: false, isRunning: false, margin: 'mt-0' }
      ],
    },
    computed: {
      filteredCards: function () {
        return this.cards;
        
        let cards = [];
        this.apps.releaseList.filter(f => f.isPrincipal === true).forEach(release => {
          release.cards.forEach(card => { cards.push(card); });
        });
        
        // let resultList = temp.filter(f => f.release.isPrincipal === true);
        let text = this.filterContent.trim().toLowerCase();
        let resultList = cards;
        
        // filter by Input Search 
        if (text !== "") {
          resultList = resultList.filter
              (
                f => f.releaseTitle.trim().toLowerCase().includes(text) || 
                    f.content.devFull.some(dev => dev.contentFilter.includes(text)) || 
                    f.content.qaFull.some(qa => qa.contentFilter.includes(text)) || 
                    f.content.stgFull.some(stg => stg.contentFilter.includes(text)) || 
                    f.content.prdFull.some(prd => prd.contentFilter.includes(text)) 
              );
        }

        // only releases with at least one build
        resultList = resultList.filter(f => (f.content.dev.length + f.content.qa.length + f.content.stg.length + f.content.prd.length) > 0);

        // get checked releases
        return resultList.filter(f => this.checkedReleases.indexOf(f.releaseTitle) >= 0);
      }
    },
    watch: {
      'settings.autoRefresh': function(val, oldVal) {
        app.refresh.elapsedTime = 0;
      }
    },
    methods: {
      init: function(){
        this.cards = [];
        this.isVssReady = true;
        this.apps.forEach(a=>{a.isRunning=false;});
        this.clearDB();
        this.prepareReleaseList();
      },
      clearDB: function(){
        var db = new AzureDashBoardDB();
        db.clear();
      },
      getAppItem: function(id){
        const item = this.apps.filter(f => f.id === id);
        if (item === null || item === undefined) {
          return null;
        } else {
          return item;
        }
      },
      prepareReleaseList: function(){
        $.each(this.apps, function (idx1, appItem) {
          getReleaseDefinitionsForAppItem(appItem);
        });  
        VSS.notifyLoadSucceeded();
      },
      isAppRunning: function(){
        return this.apps.some(s => s.isRunning === true);
      },
      onAppClick: function(event){        
        let id = event.target.id;
        let index = _.findIndex(this.apps, function(it){ return id === it.id; });         
        let appItem = this.apps[index];
        appItem.visible = !appItem.visible;
        if (appItem.isReleaseListLoaded === false) {
          getReleaseDefinitionsForAppItem(appItem);
          VSS.notifyLoadSucceeded();
        }        
      },      
      onCheckItem: function(event){
        let id = parseInt(event.target.id);
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
        let id = event.target.id;
        let index = _.findIndex(this.apps, function(it){ return id === it.id; });         
        let appItem = this.apps[index];
        appItem.checkItems = !appItem.checkItems;
        let releases = appItem.releaseList.map(m => m.definitionName);
        if (appItem.checkItems) {
          releases.forEach(r => {
            let index = this.checkedReleases.indexOf(r);
            if (index < 0) this.checkedReleases.push(r);
          });          
        } else {
          releases.forEach(r => {
            let index = this.checkedReleases.indexOf(r);
            if (index >=0 ) this.checkedReleases.splice(index, 1);
          });
        }
      },
      onReleaseItemClick: function(event) {
        let buildId = event.target.attributes.bid.value;
        let releaseText = event.target.attributes.rt.value;
        let badgeColor = 'badge-' + event.target.attributes.bc.value;
        showWorkItemsListDialog(buildId, releaseText, badgeColor);
      },
      onShowMoreClick: function(event, env) {
        if (event.target.attributes.length > 0 && event.target.attributes.cardid !== undefined) {
          debugger;
          let cardid = event.target.attributes.cardid.value;
          let releases = this.apps.releaseList.filter( release => release.cards.some( card => card.id === cardid ) );
          if (releases.length > 0) {
            let release = releases[0];
            let cards = release.cards.filter(f=>f.id === cardid);
            if (cards.length > 0) {
              let card = cards[0];
              if (env === 'dev') {
                card.content.devShowMore = !card.content.devShowMore;
              } else if (env === 'qa') {
                card.content.qaShowMore = !card.content.qaShowMore;
              } else if (env === 'stg') {
                card.content.stgShowMore = !card.content.stgShowMore;
              } else {
                card.content.prdShowMore = !card.content.prdShowMore;
              }
            }
          }         
        }
      }
    }
});