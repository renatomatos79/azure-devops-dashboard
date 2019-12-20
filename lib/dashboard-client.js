var DashboardClient = function(options){
    var self = this;

    /* SETTINGS */

    self.defaults = {
        onCardCreated: function(card){
            Log.add("Card created => ", card);
        }
    };

    self.options = $.extend({}, self.defaults, options);

    /* CONSTANTS */

    // EXTENSION CONFIGURATION
    self.ENDPOINT = "https://vsrm.dev.azure.com/";
    self.VS_ENDPOINT = "https://mediahub.visualstudio.com/";
    self.PROJECT_NAME = "MediaHub/";
    self.SECURITY_TOKEN = "jjmbdpiw2vunzfbpumkfxpwzy5lgthlvjfvdke2fco7ohtsogiha";
    // RELEASE STATUS
    self.SUCCEEDED = 'succeeded';
    self.PARTIALLY_SUCCEEDED = 'partiallySucceeded';
    self.NOT_DEPLOYED = 'notDeployed';
    self.FAILED = 'failed';
    self.REJECTED = 'rejected';
    self.PENDING = 'Pending';
    self.IN_PROGRESS = 'inProgress';
    self.PHASE_IN_PROGRESS = "PhaseInProgress";
    self.CANCELED = "Canceled";
    // ENVIRONMENTS
    self.DEVELOPMENT = 'Dev';
    self.QUALITY = 'Quality';
    self.STAGING = 'Staging';
    self.PRODUCTION = 'Production';
    // DASHBOARD ENVIRONMENTS
    self.ENVIRONMENT_DEV1 = "dev1";
    self.ENVIRONMENT_DEV2 = "dev2";
    self.ENVIRONMENT_QA1 = "qa1";
    self.ENVIRONMENT_QA2 = "qa2";
    self.ENVIRONMENT_STG1 = "stg1";
    self.ENVIRONMENT_STG2 = "stg2";
    self.ENVIRONMENT_PRD1 = "prd1";
    self.ENVIRONMENT_PRD2 = "prd2";

    // lists
    self.Deployments = [];
    self.WorkItems = [];
    self.RequestedWorkItems = [];
    self.Cards = [];

    /* METHODS  */

    self.clear = function(){
        self.Deployments = [];
        self.WorkItems = [];
        self.RequestedWorkItems = [];
        self.Cards = [];
    };

    self.getURI = function(uri) {
        return self.ENDPOINT + self.PROJECT_NAME + self.PROJECT_NAME + uri;
    };
    
    self.getWorkItemEditUri = function(workItem) {
        return self.VS_ENDPOINT + self.PROJECT_NAME + `/_workitems/edit/${workItem}`;
    };

    self.getApplications = function(){
        return [
            { id: "azr",    path: "\\6-AZR",    searchContent: "AZR",    prefix: "vNext - DEV AZR",     sufix: "AZR Deployment with DSC",    title: "AZR", visible: false, releaseList: [], isReleaseListLoaded: false, color: "danger", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-3', checkedReleases: [] },
            { id: "biz",    path: "\\1-BIZ",    searchContent: "BIZ",    prefix: "vNext - DEV BIZ",     sufix: "BIZ Deployment with DSC",    title: "BIZ", visible: false, releaseList: [], isReleaseListLoaded: false, color: "warning", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-4', checkedReleases: [] },
            { id: "bom",    path: "\\5-BOM",    searchContent: "BOM",    prefix: "vNext - DEV BOM",     sufix: "BOM Deployment with DSC",    title: "BOM", visible: false, releaseList: [], isReleaseListLoaded: false, color: "secondary", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-3', checkedReleases: [] },
            { id: "ott",    path: "\\2-OTT",    searchContent: "OTT",    prefix: "vNext - DEV OTT",     sufix: "OTT Deployment with DSC",    title: "OTT", visible: false, releaseList: [], isReleaseListLoaded: false, color: "success", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-3', checkedReleases: [] },
            { id: "ovx",    path: "\\7-OVX",    searchContent: "OVX",    prefix: "vNext - DEV OVX",     sufix: "OVX Deployment with DSC",    title: "OVX", visible: false, releaseList: [], isReleaseListLoaded: false, color: "primary", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-3', checkedReleases: [] },
            { id: "player", path: "\\4-PLAYER", searchContent: "Player", prefix: "vNext - DEV Player",  sufix: "Player Deployment with DSC", title: "PLAYER", visible: false, releaseList: [], isReleaseListLoaded: false, color: "dark", truncateBuildNumber: false, isRunning: false, margin: 'py-3 pl-2', checkedReleases: [] },
            { id: "sf",     path: "\\3-SF",     searchContent: "SF",     prefix: "SF",                  sufix: "",                           title: "SF", visible: false, releaseList: [], isReleaseListLoaded: false, color: "info", truncateBuildNumber: true, isRunning: false, margin: 'py-3 pl-4', checkedReleases: [] }
          ]    
    };

    self.getAppItem = function(id){
        const item = self.getApplications().filter(f => f.id === id);
        if (item === null || item === undefined) {
          return null;
        } else {
          return item[0];
        }
    },

    self.getCard = function(definitionId){
        const card = self.Cards.filter(f => f.release.definitionId === definitionId);
        if (card === null || card === undefined) {
          return null;
        } else {
          return card[0];
        }
    },

    self.getDeployments = function(){
        return self.Deployments;
    }

    self.getWorkItems = function(){
        return self.WorkItems;
    }

    // this is a function which sorts a specific "list" and then take the first "count" elements
    self.takeElementsInComplementListOrderByDesc = function(list, count) {
        let max = count - 1;
        let items = list.filter(f => f.isPrincipal === false);
        let myMap = function(item, idx) {
            return { index: idx, content: item };
        };
        const sortedList = items
            .reverse().map( (m, i) => myMap(m, i) )
            .filter( (f,i) => i <= max)
            .map( m => m.content );
        return sortedList;
    }
    
    // Gets all availables release by Application ID. e.g: BIZ, SF, 
    self.getReleaseDefinitionsForAppItem = function(appItem) {
        let searchContent = appItem.searchContent;
        let uri = self.getURI("_apis/release/definitions");
        appItem.isRunning = true;

        const httpClient = new HttpClient({token: self.SECURITY_TOKEN});
        httpClient.get(uri, { params: { data: {
            "api-version": "5.0",
            isDeleted: false,
            searchText: searchContent,
            // extra payload
            extra: {
                appItemId: appItem.id
            }
        }}}).then(function(response){
            const appItemId = response.config.params.data.extra.appItemId;
            const responseAppItem = self.getAppItem(appItemId);
            const searchPath = responseAppItem.path.toLowerCase();
            const hasSufix = responseAppItem.sufix !== "";
            const prefix = responseAppItem.prefix.toLowerCase();  
            const releaseList = [];     

            const callbackCardUpdated = function(definitionId, environment, content){
                const card = self.getCard(definitionId);
                if (card) {
                    const releaseDefinitionName = card.release.definitionName;
                    
                    self.Deployments = self.addItemIfNotExists(self.Deployments, content);
                    const list = self.Deployments.filter(f => f.definitionName === releaseDefinitionName && f.envGroup === environment);
                    card.content[environment] = self.sortReleaseListAndTakeElements(list, 2);
                }
            }

            // to avoid mistakes during the filter, only consider data which contains the same path property content
            response.data.value.forEach( (value, index) => {
                if (value.path.toLowerCase() === searchPath.toLowerCase()) {
                    // among the releases definitions we must chose only one to be printed into the dashboard
                    // this release item will be named as Principal
                    // let's see the BOM example:
                    // vNext - DEV BOM Deployment with DSC -> Principal (prefix matches -> vNext DEV BOM)
                    // vNext - 2.51 BOM Deployment with DSC -> Member (sufix matches -> BOM Deployment with DSC)
                    let isPrincipal = value.name.toLowerCase().startsWith(prefix);
                    let isReleaseMemberItem = isPrincipal || hasSufix;
                    if (isReleaseMemberItem) {
                        const releaseItem = {
                            app: responseAppItem,
                            definitionId: value.id,
                            definitionName: value.name,
                            path: value.path,
                            url: value.url,
                            isPrincipal: isPrincipal,
                            cards: []
                        };
                        // add the release item to the list! Attention => SF has many principal items
                        releaseList.push(releaseItem);
                       
                        // if the item was identified as principal, create a card for it
                        if (isPrincipal === true) {
                            self.addCardDefinition(responseAppItem, releaseItem);  
                            // get card definition for each release linked to the app
                            self.getCardDefinitionWithDeployments(releaseItem, callbackCardUpdated);
                        }
                        
                    }
                }
            });

            // at the end keep a copy of the principal items to the app.
            // to the end user, this list will be used as a filter purpose
            const principalList = releaseList.filter(f => f.isPrincipal === true);
            responseAppItem.isReleaseListLoaded = true;
            responseAppItem.releaseList = Util.sortByKeyAsc(principalList, "definitionName");
            responseAppItem.isRunning = false;
        });
    }

    self.getEnvironment = function(env) {
        let envName = env.trim().toLowerCase();
        let dev = ["dev"];
        let qa = ["qa", self.QUALITY.trim().toLowerCase()];
        let stg = ["stg", self.STAGING.trim().toLowerCase()];
        let prd = ["prd", self.PRODUCTION.trim().toLowerCase()];
    
        if (dev.some(s => envName.includes(s))) {
            return self.DEVELOPMENT;
        } else if (qa.some(s => envName.includes(s))) {
            return self.QUALITY;
        } else if (stg.some(s => envName.includes(s))) {
            return self.STAGING;
        } if (prd.some(s => envName.includes(s))) {
            return self.PRODUCTION;
        } else {
            return "";
        }
    }

    self.getCardDefinitionWithDeployments = function(releaseItem, callbackCardAdded) {
        const appId = releaseItem.app.id;
        const definitionId = releaseItem.definitionId;
        const definitionName = releaseItem.definitionName;
        const uri = self.getURI("_apis/release/definitions/" + definitionId);
        const httpClient = new HttpClient({token: self.SECURITY_TOKEN});
        httpClient.get(uri, { params: { data: {
            "api-version": "5.0",
            // extra payload
            extra: {
                appId: appId,
                definitionId: definitionId,
                definitionName: definitionName
            }        
        } }}).then(function(response){
            
            const responseAppId = response.config.params.data.extra.appId;
            const responseDefinitionId = response.config.params.data.extra.definitionId;
            const responseDefinitionName = response.config.params.data.extra.definitionName;
    
            response.data.environments.forEach((value, index) => {
                let env = self.getEnvironment(value.name);
                if (env === self.DEVELOPMENT) {
                    self.getLastSucceededDeploymentInfo(responseAppId, responseDefinitionId, responseDefinitionName, self.ENVIRONMENT_DEV1, value.name, value.id, callbackCardAdded);
                } else if (env === self.QUALITY) {
                    self.getLastSucceededDeploymentInfo(responseAppId, responseDefinitionId, responseDefinitionName, self.ENVIRONMENT_QA1, value.name, value.id, callbackCardAdded);
                } else if (env === self.STAGING) {
                    self.getLastSucceededDeploymentInfo(responseAppId, responseDefinitionId, responseDefinitionName, self.ENVIRONMENT_STG1, value.name, value.id, callbackCardAdded);
                } else if (env === self.PRODUCTION) {
                    self.getLastSucceededDeploymentInfo(responseAppId, responseDefinitionId, responseDefinitionName, self.ENVIRONMENT_PRD1, value.name, value.id, callbackCardAdded);
                } else {
                    Log.add("Environment not found! " + value.name);
                }
            });
        });
    }


    self.getLastSucceededDeploymentInfo = function(appId, definitionId, definitionName, environment, environmentFullName, definitionEnvironmentId, callbackCardAdded) {
        if (definitionEnvironmentId && definitionEnvironmentId > 0) {
            const uri = self.getURI(`_apis/release/deployments?definitionId=${definitionId}&definitionEnvironmentId=${definitionEnvironmentId}`);
            const httpClient = new HttpClient({token: self.SECURITY_TOKEN});
            httpClient.get(uri, { params: { data: {
                "api-version": "5.0",
                // extra payload
                extra: {
                    appId: appId,
                    definitionId: definitionId,
                    definitionName: definitionName,
                    environment: environment,
                    environmentFullName: environmentFullName,
                    definitionEnvironmentId: definitionEnvironmentId
                }            
            } }}).then(function(response){
                const responseAppId = response.config.params.data.extra.appId;
                const appItem = self.getAppItem(responseAppId);
                const truncateBuildNumber = appItem.truncateBuildNumber;
                const responseDefinitionId = response.config.params.data.extra.definitionId;
                const responseDefinitionName = response.config.params.data.extra.definitionName;
                const responseEnvironmentFullName = response.config.params.data.extra.environmentFullName;
                const responseEnvironment = response.config.params.data.extra.environment;
    
                response.data.value.forEach((value, index) => {
                    const fullReleaseName = value.release.name;
                    const releaseName = Util.removeLastVersionControlNumber(value.release.name, truncateBuildNumber);
                    const releaseId = value.release.id;              
                    const releaseDefinitionId = value.releaseDefinition.id;
                    const reason = value.reason;
                    const deployDate = value.completedOn;
                    // using versionParts we can ignore releases sound like "SF UniversalCatalog 4"                
                    const vParts = Util.versionParts(releaseName);
                    let deploymentStatus = undefined;                
                    
                    if (value.deploymentStatus === self.FAILED) {
                        deploymentStatus = false;
                    } else if (value.deploymentStatus === self.SUCCEEDED) {
                        deploymentStatus = true;
                    }
                   
                    let allowRelease = (value.operationStatus !== self.CANCELED) && (vParts > 1);
                    if (allowRelease) {
                        const buildId = value.release.artifacts[0].definitionReference.version.id;
                        self.setReleaseProperties(responseAppId, responseDefinitionId, responseDefinitionName, responseEnvironment, responseEnvironmentFullName, buildId, releaseName, fullReleaseName, releaseDefinitionId, releaseId, deploymentStatus, reason, deployDate, callbackCardAdded);
                        self.getWorkItemsFromBuildNumber(responseAppId, responseDefinitionId, responseDefinitionName, responseEnvironment, buildId);
                    }
                });
            });
        }
    }

    self.addCardDefinition = function(appItem, releaseItem) {
        let card = 
        {
            id: Util.createGUID(),
            app: appItem,
            appTitle: appItem.title,
            release: releaseItem,
            content: {
                dev: [], 
                qa: [], 
                stg: [], 
                prd: [] 
            }
        };

        if (self.options.onCardCreated) {
            self.options.onCardCreated.call(self, card);
        }

        self.Cards.push(card);
        
        return card;
    }

    self.sortReleaseListAndTakeElements = function(items, count) {
        
        // Note! We consider -1 is a "high value" because the list is being descending sorted
        // -1: a is higher than b
        //  0: a is equal to b
        // +1: b is higher than a
        function compareReleases(a, b) {
            const itemA = { phase: a.sortColumn.split("|")[1], release: a.releaseNumber };
            const itemB = { phase: b.sortColumn.split("|")[1], release: b.releaseNumber };
            let mv = Util.maxVersion(itemA.release, itemB.release);
    
            if (itemA.release === itemB.release) {
                if (itemA.phase > itemB.phase) {
                    return self.MAX_DESCENDING_SORTED_VALUE;
                } else if (itemA.phase < itemB.phase) {
                    return Util.MIN_DESCENDING_SORTED_VALUE;
                } else {
                    return Util.EQUAL_SORTED_VALUE;
                }
            } else {
                if (mv === itemA.release) {
                    return Util.MAX_DESCENDING_SORTED_VALUE;
                } else {
                    return Util.MIN_DESCENDING_SORTED_VALUE;
                }
            }           
        }
    
        function orderbyDesc(a, b) {
          const maxSortedValue = compareReleases(a, b);
          return maxSortedValue;
        }
    
        function getMax(list){
            let max = null;
            if (list.length > 0) {
                list.forEach(item => {
                    if (max === null) {
                        max = item;
                    } else {
                        let compare = compareReleases(max, item);
                        if (compare === Util.MIN_DESCENDING_SORTED_VALUE) {
                            max = item;
                        }
                    }
                });
            }
            return max;
        }   
    
        const sortedList = items.sort(orderbyDesc);
    
        if (count == 0) {
            return sortedList;
        }    
    
        let result = [];
        let succeeded = sortedList.filter(f => f.statusText !== undefined && f.statusText.trim().toLowerCase().includes("succeeded"));
        let pending = sortedList.filter(f => f.statusText !== undefined && f.statusText.trim().toLowerCase().includes("pending"));
        let failed  = sortedList.filter(f => f.statusText !== undefined && f.statusText.trim().toLowerCase().includes("failed"));
        let lastSucceeded = getMax(succeeded);
        let lastPending = getMax(pending);
        let lastFailed = getMax(failed);
        let lastComparableObject = null;
    
        if (lastSucceeded !== null) {
            result.push(lastSucceeded);
        }
    
        // only pending
        if (lastPending !== null && lastFailed === null) {
            lastComparableObject = lastPending;
        }
    
        // only failed
        if (lastPending === null && lastFailed !== null) {
            lastComparableObject = lastFailed;
        }
    
        // pending and failed
        if (lastPending !== null && lastFailed !== null) {
            let compare = compareReleases(lastPending, lastFailed);
            if (compare === Util.MAX_DESCENDING_SORTED_VALUE) {
                lastComparableObject = lastPending;
            } else {
                lastComparableObject = lastFailed;
            }
        }
    
        // there is no lastSucceeded: add lastComparableObject if exists
        if (lastSucceeded === null && lastComparableObject !== null) {
            result.push(lastComparableObject);
        } 
    
        // there is lastSucceeded: add the highest( lastSucceeded or lastComparableObject)
        if (lastSucceeded !== null && lastComparableObject !== null) {
            let compare = compareReleases(lastSucceeded, lastComparableObject);
            if (compare === Util.MIN_DESCENDING_SORTED_VALUE) {
                result.push(lastComparableObject);
            }
        } 
    
        return result;
    }

    self.addItemIfNotExists = function(list, item) {
        let any = list.some(s => s.sortColumn === item.sortColumn);
        if (!any) {
            list.push(item);
        }
        return list;
    }

    self.notifyCardAdded = function(responseDefinitionId, environment, content, callbackCardAdded) {
        if (callbackCardAdded) {
            callbackCardAdded.call(this, responseDefinitionId, environment, content);
        }    
    }

    self.setReleaseProperties = function(appId, responseDefinitionId, responseDefinitionName, environment, environmentFullName, buildId, releaseText, releaseTextComplete, releaseDefinitionId, releaseId, deploymentStatus, reason, deployDate, callbackCardAdded) {
        if (releaseText) {
            // gets the uri dynamically.
            let uri = VSS.getWebContext().account.uri + "/" + VSS.getWebContext().account.name + "/";   // https://mediahub.visualstudio.com/MediaHub
            let uriReleasePipeline = "#";
            let uriReleaseLink = "#";
            let statusIconClass = "pending-status-icon";
            let statusTextClass = "pending-status";
            let statusText = "Pending Approval";
            let envGroup = environment.replace("1","").replace("2", "");
            let releaseNumber = Util.converToComparableVersion(releaseText);
            let sortContent = releaseText.trim() + "|" + environmentFullName.trim() + "|" + releaseNumber;
    
            if (releaseId && releaseId > 0) {
                uriReleasePipeline = uri + "_releaseProgress?_a=release-pipeline-progress&releaseId=" + releaseId;
            }
    
            if (releaseDefinitionId && releaseDefinitionId > 0) {
                uriReleaseLink = uri + "_release?view=all&definitionId=" + releaseDefinitionId;
            }
            
            if (deploymentStatus !== undefined) {
                if (deploymentStatus) {
                    statusIconClass = "succeeded-status-icon";
                    statusTextClass = "succeeded-status";
                    statusText = " Succeeded";
                } else {
                    statusIconClass = "failed-status-icon";
                    statusTextClass = "failed-status";
                    statusText = " Failed";
                }
            }
    
            const appItem = self.getAppItem(appId);
            
            const content = {
                gid: "", // PK for IndexedDB - Filled into azureDB.addDeployment
                app: appId, 
                definitionId: responseDefinitionId,
                definitionName: responseDefinitionName,
                envGroup: envGroup,
                environment: environment,
                environmentFullName: environmentFullName.trim(),
                buildId: buildId,
                releaseDefinitionId: releaseDefinitionId,
                releaseId: releaseId,
                releaseText: releaseText.trim(),
                releaseTextComplete: releaseTextComplete,
                releaseNumber: releaseNumber.trim(),
                status: deploymentStatus,
                uri: uri,
                uriReleasePipeline: uriReleasePipeline,
                uriReleaseLink: uriReleaseLink,
                statusIconClass: statusIconClass,
                statusTextClass: statusTextClass,
                statusText: statusText,
                sortColumn: sortContent,
                reason: reason,
                deployDate: deployDate,
                reasonColor: reason === "manual" ? "text-muted" : "text-info",
                workItems: [],
                contentFilter: appItem.title.trim().toLowerCase() + "_" +
                               responseDefinitionName.trim().toLowerCase() + "_" +
                               releaseTextComplete.trim().toLowerCase() + "_" + 
                               envGroup.trim().toLowerCase() + "_" +
                               environmentFullName.trim().toLowerCase() + "_" +
                               statusText.trim().toLowerCase()
            };
            
            self.notifyCardAdded(responseDefinitionId, envGroup, content, callbackCardAdded);
        }
    }

    self.getWorkItemsFromBuildNumber = function(appId, definitionId, definitionName, environment, buildId){
        // TODO: we must create a method to return the URI bellow
        const uri = `https://dev.azure.com/MediaHub/MediaHub/_apis/build/builds/${buildId}/workitems?api-version=5.0`;
        const httpClient = new HttpClient({token: self.SECURITY_TOKEN});
        httpClient.get(uri, { params: { data: {
            // extra payload
            extra: {
                appId: appId,
                definitionId: definitionId,
                definitionName: definitionName,
                environment: environment,
                buildId: buildId
            }            
        }}}).then(function(response){
            const respAppId = response.config.params.data.extra.appId;
            const respDefinitionId = response.config.params.data.extra.definitionId;
            const respDefinitionName = response.config.params.data.extra.definitionName;
            const respEnvironment = response.config.params.data.extra.environment;
            const respBuildId = response.config.params.data.extra.buildId;
            response.data.value.forEach(item => {
                const url = item.url;
                const workItem = item.id;
                const workItemHasBeenRequested = self.RequestedWorkItems.indexOf(workItem) >= 0;
                // avoid getting more than one request to the same workitem
                if (workItemHasBeenRequested === false) {
                    self.RequestedWorkItems.push(workItem);
                    // after getting the work itens, add them to the build item (into the property workItems)
                    const callbackWorkItem = function(wit) {
                        const card = self.getCard(definitionId);
                        if (card !== null) {
                            const envGroup = wit.environment.replace("1","").replace("2", "");
                            const items = card.content[envGroup];
                            if (items !== null) {
                                const builds = items.filter(it => it.buildId === wit.buildId);
                                if (builds !== null && builds.length > 0) {
                                    const build = builds[0];
                                    build.workItems.push(wit);
                                }
                            }
                        }
                    }
                    self.getWorkItemDefinition(url, respAppId, respDefinitionId, respDefinitionName, respEnvironment, respBuildId, workItem, callbackWorkItem);
                }
            });
        });
    }
    
    self.getWorkItemDefinition = function(url, appId, definitionId, definitionName, environment, buildId, workItem, callback){
        const httpClient = new HttpClient({token: self.SECURITY_TOKEN});
        httpClient.get(url, { params: { data: {
            // extra payload
            extra: {
                appId: appId,
                definitionId: definitionId,
                definitionName: definitionName,
                environment: environment,
                buildId: buildId,
                workItem: workItem
            }            
        }}}).then(function(response){
            const respAppId = response.config.params.data.extra.appId;
            const respDefinitionId = response.config.params.data.extra.definitionId;
            const respDefinitionName = response.config.params.data.extra.definitionName;
            const respEnvironment = response.config.params.data.extra.environment;
            const respBuildId = response.config.params.data.extra.buildId;
            const respWorkItem = response.config.params.data.extra.workItem;
            let responsible = "";
            if (response.data.fields["System.AssignedTo"] !== null && response.data.fields["System.AssignedTo"] !== undefined) {
                responsible = response.data.fields["System.AssignedTo"]["displayName"];
            }
            const content = {
                id: response.data.id,
                appId: respAppId,
                definitionId: respDefinitionId,
                definitionName: respDefinitionName,
                environment: respEnvironment,
                buildId: respBuildId,
                contentFilter: response.data.id.toString() + "_" +
                               buildId.toString().trim().toLowerCase() + "_" +
                               respWorkItem.toString().trim().toLowerCase() + "_" +
                               response.data.fields["System.IterationPath"].toString().trim().toLowerCase() + "_" +
                               response.data.fields["System.WorkItemType"].toString().trim().toLowerCase() + "_" +
                               response.data.fields["System.Title"].toString().trim().toLowerCase() + "_" +
                               responsible.trim().toLocaleLowerCase(),
                workItem: {
                    id: respWorkItem,
                    iterationPath: response.data.fields["System.IterationPath"],
                    type: response.data.fields["System.WorkItemType"],
                    state: response.data.fields["System.State"],
                    assignedTo: responsible,
                    title: response.data.fields["System.Title"],
                    url: response.data.url,
                    editURL: self.getWorkItemEditUri(response.data.id)
                }
            };
            self.WorkItems.push(content);
    
            if (callback !== null) {
                callback.call(this, content);
            }
        });
    }    
    
    // returns the class instance
    return self;
}