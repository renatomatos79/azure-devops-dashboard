var app = new Vue({
    el: '#app',
    data: {
      title: 'Releases MediaHub - Overview',
      filtered: false
    },
    methods: {
      toggleVisible: function(event, build) {
        if (build.expanded) {
          build.expanded = false;
        } else if (!build.expanded) {
          Vue.set(build, 'expanded', true);
        }
      },
      applyFilter: function(event){
        this.filtered = !this.filtered;
      }


    }
  })