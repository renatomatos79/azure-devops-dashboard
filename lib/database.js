let dbInstance;

var AzureDashBoardDB = function(){
  var self = this;
  // constants
  self.dbName = "AzureDevOpsDashboard";
  self.storeReleaseDefinitions = "ReleaseDefinitions";
  self.storeDeployments = "Deployments";

  self.init = function(){
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

    // var request = window.indexedDB.open("AzureDevOpsDashboard", {version: 4, storage: "temporary"});
    DBOpenRequest = window.indexedDB.open(self.dbName, 4);
    
    // these two event handlers act on the database being opened successfully, or not
    DBOpenRequest.onerror = function(event) {
      Log.add('Error loading database.');
    };

    // connection ok
    DBOpenRequest.onsuccess = function(event) {
      Log.add('Database initialised.');
      dbInstance = DBOpenRequest.result;
    };

    // This event handles the event whereby a new version of the database needs to be created
    // Either one has not been created before, or a new version number has been submitted via the
    // window.indexedDB.open line above
    // it is only implemented in recent browsers
    DBOpenRequest.onupgradeneeded = function(event) {
      dbInstance = event.target.result;
  
      dbInstance.onerror = function(event) {
        Log.add('Error loading database.');
      };
  
      // Create an objectStore for this database
      let pipelineStore = dbInstance.createObjectStore(self.storeReleaseDefinitions, { keyPath: "gid" });
      pipelineStore.createIndex("id", "id", { unique: true });
      pipelineStore.createIndex("name", "name", { unique: false });
      pipelineStore.createIndex("path", "path", { unique: false });
      pipelineStore.createIndex("url", "url", { unique: false });
      pipelineStore.createIndex("isPrincipal", "isPrincipal", { unique: false });
      pipelineStore.createIndex("appId", "appId", { unique: false });

      Log.add(`Object ${self.storeRel1easeDefinitions} created!`);

      // Create an objectStore for this database
      let deploymentStore = dbInstance.createObjectStore(self.storeDeployments, { keyPath: "gid" });
      deploymentStore.createIndex("appId", "appId", { unique: true });
      deploymentStore.createIndex("definitionId", "definitionId", { unique: false });
      deploymentStore.createIndex("definitionName", "definitionName", { unique: false });
      deploymentStore.createIndex("envGroup", "envGroup", { unique: false });
      deploymentStore.createIndex("buildId", "buildId", { unique: false });
      deploymentStore.createIndex("releaseDefinitionId", "releaseDefinitionId", { unique: false });
      deploymentStore.createIndex("releaseId", "releaseId", { unique: false });
      deploymentStore.createIndex("releaseText", "releaseText", { unique: false });
      deploymentStore.createIndex("releaseNumber", "releaseNumber", { unique: false });
      deploymentStore.createIndex("uri", "uri", { unique: false });
      deploymentStore.createIndex("uriReleasePipeline", "uriReleasePipeline", { unique: false });
      deploymentStore.createIndex("uriReleaseLink", "uriReleaseLink", { unique: false });
      deploymentStore.createIndex("statusText", "statusText", { unique: false });
      deploymentStore.createIndex("sortColumn", "sortColumn", { unique: false });
      deploymentStore.createIndex("contentFilter", "contentFilter", { unique: false });
  
      Log.add(`Object ${self.storeDeployments} created!`);
    };

  };

  // add new row
  self.addReleaseDefinition = function(id, name, path, url, isPrincipal, appId) {
    const key = Util.createGUID();

    // grab the values entered into the form fields and store them in an object ready for being inserted into the IDB
    let newItem = { gid: key, id: id, name: name, path: path, url: url, isPrincipal: isPrincipal, appId: appId };

    // open a read/write db transaction, ready for adding the data
    let transaction = dbInstance.transaction([self.storeReleaseDefinitions], "readwrite");

    // report on the success of the transaction completing, when everything is done
    transaction.oncomplete = function() {
      Log.add('Transaction completed: database modification finished');
    };

    transaction.onerror = function(error) {
      Log.add(`Transaction not opened due to error: ${error.target.error.message}`);
    };

    // call an object store that's already been added to the database
    let objectStore = transaction.objectStore(self.storeReleaseDefinitions);
    
    // Make a request to add our newItem object to the object store
    let objectStoreRequest = objectStore.add(newItem);
    objectStoreRequest.onsuccess = function() {
      Log.add('Release definition added successful.');
    };
  };

  self.addDeployment = function(content) {
    const key = Util.createGUID();

    // grab the values entered into the form fields and store them in an object ready for being inserted into the IDB
    content.gid = key;

    // open a read/write db transaction, ready for adding the data
    let transaction = dbInstance.transaction([self.storeDeployments], "readwrite");

    // report on the success of the transaction completing, when everything is done
    transaction.oncomplete = function() {
      Log.add('Transaction completed: database modification finished');
    };

    transaction.onerror = function(error) {
      Log.add(`Transaction not opened due to error: ${error.target.error.message}`);
    };

    // call an object store that's already been added to the database
    let objectStore = transaction.objectStore(self.storeDeployments);
    
    // Make a request to add our newItem object to the object store
    let objectStoreRequest = objectStore.add(content);
    objectStoreRequest.onsuccess = function() {
      Log.add('Deployment added successful.');
    };
  };

  self.clear = function() {
    let transaction = dbInstance.transaction([self.storeReleaseDefinitions, self.storeDeployments], "readwrite");
    transaction.objectStore(self.storeReleaseDefinitions).clear();
    transaction.objectStore(self.storeDeployments).clear();
  };

  return self;
}

window.onload = function() {
  var dbSetup = new AzureDashBoardDB();
  dbSetup.init(); 
}