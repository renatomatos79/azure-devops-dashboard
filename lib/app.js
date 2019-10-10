var app = new Vue({
    el: '#app',
    data: {
      title: 'Releases MediaHub - Overview v1.0.28',
      filtered: false,
      isVssReady: false,
      lasAppItemId: "",
      filterContent: "",
      checkedReleases: [],
      cards: [],
      apps: [
        { id: "biz",    path: "\\1-BIZ",    searchContent: "BIZ",    prefix: "vNext - DEV BIZ",     sufix: "BIZ Deployment with DSC",    title: "BIZ", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "warning", truncateBuildNumber: false },
        { id: "ott",    path: "\\2-OTT",    searchContent: "OTT",    prefix: "vNext - DEV OTT",     sufix: "OTT Deployment with DSC",    title: "OTT", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "success", truncateBuildNumber: false },
        { id: "sf",     path: "\\3-SF",     searchContent: "SF",     prefix: "SF",                  sufix: "",                           title: "SF", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "info", truncateBuildNumber: true },
        { id: "player", path: "\\4-PLAYER", searchContent: "Player", prefix: "vNext - DEV Player",  sufix: "Player Deployment with DSC", title: "PLAYER", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "dark", truncateBuildNumber: false },
        { id: "bom",    path: "\\5-BOM",    searchContent: "BOM",    prefix: "vNext - DEV BOM",     sufix: "BOM Deployment with DSC",    title: "BOM", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "secondary", truncateBuildNumber: false },
        { id: "azr",    path: "\\6-AZR",    searchContent: "AZR",    prefix: "vNext - DEV AZR",     sufix: "AZR Deployment with DSC",    title: "AZR", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "danger", truncateBuildNumber: false },
        { id: "ovx",    path: "\\7-OVX",    searchContent: "OVX",    prefix: "vNext - DEV OVX",     sufix: "OVX Deployment with DSC",    title: "OVX", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "primary", truncateBuildNumber: false }
      ],
    },
    computed: {
      filteredCards: function () {
        let resultList = this.cards.filter(f => f.isPrincipal === true);
        let text = this.filterContent.trim().toLowerCase();
        
        // filter by Input Search 
        if (text !== "") {
          resultList = resultList.filter
              (
                f => f.releaseTitle.trim().toLowerCase().includes(text) || 
                    f.content.dev.some(dev => dev.contentFilter.includes(text)) || 
                    f.content.qa.some(qa => qa.contentFilter.includes(text)) || 
                    f.content.stg.some(stg => stg.contentFilter.includes(text)) || 
                    f.content.prd.some(prd => prd.contentFilter.includes(text)) 
              );
        }

        // only releases with at least one build
        resultList = resultList.filter(f => (f.content.dev.length + f.content.qa.length + f.content.stg.length + f.content.prd.length) > 0);

        // get checked releases
        return resultList.filter(f => this.checkedReleases.indexOf(f.releaseTitle) >= 0);
      }
    },
    methods: {
      init: function(){
        this.cards = [];
        this.isVssReady = true;
        this.prepareReleaseList();
      },
      prepareReleaseList: function(){
        $.each(this.apps, function (idx1, appItem) {
          getReleaseDefinitions(appItem);
        });  
        VSS.notifyLoadSucceeded();
      },
      onAppClick: function(event){        
        let id = event.target.id;
        let index = _.findIndex(this.apps, function(it){ return id === it.id; });         
        let appItem = this.apps[index];
        appItem.visible = !appItem.visible;
        if (appItem.isReleaseListLoaded === false) {
          getReleaseDefinitions(appItem);
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
      }
    }
});