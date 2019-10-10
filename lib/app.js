var app = new Vue({
    el: '#app',
    data: {
      title: 'Releases MediaHub - Overview v1.0.23',
      filtered: false,
      isVssReady: false,
      lasAppItemId: "",
      filterContent: "",
      checkedReleases: [],
      cards: [],
      apps: [
        { id: "sf", path: "\\3-SF", prefix: "SF", title: "SF", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "info" },
        { id: "biz", path: "\\1-BIZ", prefix: "vNext - DEV BIZ", title: "DEV BIZ", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "warning" },
        { id: "ott", path: "\\2-OTT", prefix: "vNext - DEV OTT", title: "OTT", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "success" },
        { id: "bom", path: "\\5-BOM", prefix: "vNext - DEV BOM", title: "BOM", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "secondary" },
        { id: "ovx", path: "\\7-OVX", prefix: "vNext - DEV OVX", title: "OVX", visible: false, releaseList: [], isReleaseListLoaded: false, checkItems: false, color: "primary" }
      ],      
    },

    computed: {
      filteredCards: function () {
        let filter = [];
        
        // filter by Input Search Content
        if ((this.filterContent === null) || (this.filterContent === "")) {
          filter = this.cards;
        } else {
          let newFilter = this.filterContent.trim().toLowerCase();
          filter = this.cards.filter
              (
                f => f.releaseTitle.includes(newFilter) || 
                     f.content.dev1.contentFilter.includes(newFilter) || f.content.dev2.contentFilter.includes(newFilter) || 
                     f.content.qa1.contentFilter.includes(newFilter) || f.content.qa2.contentFilter.includes(newFilter) || 
                     f.content.stg1.contentFilter.includes(newFilter) || f.content.stg2.contentFilter.includes(newFilter) || 
                     f.content.prd1.contentFilter.includes(newFilter) || f.content.prd2.contentFilter.includes(newFilter)
              );
        }

        // get checked releases
        return filter.filter(f => this.checkedReleases.indexOf(f.releaseTitle) >= 0);
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
        let slicedControlName = event.target.attributes.scn.value;
        let buildId = event.target.attributes.bid.value;
        let releaseText = event.target.attributes.rt.value;
        showWorkItemsListDialog(slicedControlName, buildId, releaseText);
      }
    }
});