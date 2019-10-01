var app = new Vue({
    el: '#app',
    data: {
      title: 'Releases MediaHub - Overview v2',
      filtered: false,
      releaseList: [],
      isReleaseListLoaded: false     
    },
    methods: {
      onCheckItem: function(event){
        let id = parseInt(event.target.id);
        let index = _.findIndex(this.releaseList, function(it){ return id === it.definitionId; });
        let item = this.releaseList[index];
        let name = item.definitionId + "-row";
        this.releaseList[index].isChecked = event.target.checked;
        if (event.target.checked) {
          $("div[name='"+name+"']").show();
        } else {
          $("div[name='"+name+"']").hide();
        }        
      },
      onFilter: function(event){
        this.filtered = !this.filtered;
      }
    }
  })