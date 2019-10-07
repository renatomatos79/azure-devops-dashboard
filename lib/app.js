var app = new Vue({
    el: '#app',
    data: {
      title: 'Releases MediaHub - Overview v1.0.16',
      filtered: false,
      isVssReady: false,
      lasAppItemId: "",
      cards: [],      
      apps: [
        { id: "sf", path: "\\3-SF", prefix: "SF", title: "SF", visible: false, releaseList: [], isReleaseListLoaded: false },
        { id: "biz", path: "\\1-BIZ", prefix: "vNext - DEV BIZ", title: "DEV BIZ", visible: false, releaseList: [], isReleaseListLoaded: false }
      ],
      
    },
    methods: {
      init: function(){
        this.cards = [];
        this.isVssReady = true;
      },
      setAppVisibility: function(visible){
        $.each(this.apps, function(index, item){
          item.visible = visible;
        })
      },
      onAppClick: function(event){        
        let id = event.target.id;
        let index = _.findIndex(this.apps, function(it){ return id === it.id; });         
        let appItem = this.apps[index];
        let oldStatus = appItem.visible;
        this.setAppVisibility(false);
        appItem.visible = !oldStatus;

        if (this.lasAppItemId.id !== appItem.id) {
          this.lasAppItemId = appItem.id;
          // clear all cards
          this.cards = [];
          // gets all the release configurations for service fabric.
          getReleaseDefinitions(appItem);
          VSS.notifyLoadSucceeded();
        }
      },      
      onCheckItem: function(event){
        let id = parseInt(event.target.id);
        let index = _.findIndex(this.releaseList, function(it){ return id === it.definitionId; });
        let item = this.releaseList[index];
        let name = item.definitionId + "-row";
        this.releaseList[index].isChecked = event.target.checked;
        if (event.target.checked) {
          $("tr[name='"+name+"']").show();
        } else {
          $("tr[name='"+name+"']").hide();
        }        
      },
      onFilter: function(event){
        this.filtered = !this.filtered;
      }
    }
  })