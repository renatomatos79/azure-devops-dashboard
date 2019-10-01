var app = new Vue({
    el: '#app',
    data: {
      title: 'Releases MediaHub - Overview v2',
      filtered: false,
      // releaseList structure { definitionId: 548, definitionName: "SF Account", isChecked: true }
      releaseList: [],
      isReleaseListLoaded: false     
    },
    computed: {
      filteredItems() {
        return this.releaseList.filter(item => {
           return item.isChecked === true;
        })
      }
    },
    methods: {
      toggleVisible: function(event, build) {
        if (build.expanded) {
          build.expanded = false;
        } else if (!build.expanded) {
          Vue.set(build, 'expanded', true);
        }
      },
      checkRelease: function(event){
        let id = parseInt(event.target.id);
        let index = _.findIndex(this.releaseList, function(it){ return id === it.definitionId; });
        this.releaseList[index].isChecked = event.target.checked;
      },
      showFilter: function(event){
        this.filtered = !this.filtered;
      }
    }
  })