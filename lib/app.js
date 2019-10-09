var app = new Vue({
    el: '#app',
    data: {
      title: 'Releases MediaHub - Overview v1.0.16',
      filtered: false,
      isVssReady: false,
      lasAppItemId: "",
      filterContent: "",
      checkedReleases: [],
      cards: [],
      apps: [
        { id: "sf", path: "\\3-SF", prefix: "SF", title: "SF", visible: false, releaseList: [], isReleaseListLoaded: false },
        { id: "biz", path: "\\1-BIZ", prefix: "vNext - DEV BIZ", title: "DEV BIZ", visible: false, releaseList: [], isReleaseListLoaded: false }
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

        // if (this.lasAppItemId.id !== appItem.id) {
        //   this.lasAppItemId = appItem.id;
        //   // clear all cards
        //   this.cards = [];
        //   // gets all the release configurations for service fabric.
        //   getReleaseDefinitions(appItem);
        //   VSS.notifyLoadSucceeded();
        // }
      },      
      onCheckItem: function(event){
        let id = parseInt(event.target.id);
        let index = _.findIndex(this.releaseList, function(it){ return id === it.definitionId; });
        let item = this.releaseList[index];
        item.isChecked = event.target.checked;
      },
      onFilter: function(event){
        this.filtered = !this.filtered;
      }
      // onApplyFilter: function(event){
      //   this.cards = [];
      //   $.each(this.apps, function (idx1, appItem) {
      //     $.each(appItem.releaseList , function (idx2, value) {
      //       let cssId = formatCssId(value.definitionName);
      //       addNewReleaseTableRow(value.definitionId, value.definitionName, cssId, 'badge-info');
      //       getReleaseDefinition(value.definitionId, value.definitionName);
      //     });
      //   });       
      // }
    }
})