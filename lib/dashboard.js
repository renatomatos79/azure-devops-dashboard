// EXTENSION CONFIGURATION
const ENDPOINT = "https://vsrm.dev.azure.com/";
const PROJECT_NAME = "MediaHub/";
const SECURITY_TOKEN = "jjmbdpiw2vunzfbpumkfxpwzy5lgthlvjfvdke2fco7ohtsogiha";
// RELEASE STATUS
const SUCCEEDED = 'succeeded';
const PARTIALLY_SUCCEEDED = 'partiallySucceeded';
const NOT_DEPLOYED = 'notDeployed';
const FAILED = 'failed';
const REJECTED = 'rejected';
const PENDING = 'Pending';
const IN_PROGRESS = 'inProgress';
const PHASE_IN_PROGRESS = "PhaseInProgress";
const CANCELED = "Canceled";
// ENVIRONMENTS
const DEVELOPMENT = 'Dev';
const QUALITY = 'Quality';
const STAGING = 'Staging';
const PRODUCTION = 'Production';
// DASHBOARD ENVIRONMENTS
const ENVIRONMENT_DEV1 = "dev1";
const ENVIRONMENT_DEV2 = "dev2";
const ENVIRONMENT_QA1 = "qa1";
const ENVIRONMENT_QA2 = "qa2";
const ENVIRONMENT_STG1 = "stg1";
const ENVIRONMENT_STG2 = "stg2";
const ENVIRONMENT_PRD1 = "prd1";
const ENVIRONMENT_PRD2 = "prd2";
// compare versions
const GROUP_SYMBOL = '.';
const GROUP_LENGTH = 9;
const GROUP_SYMBOL_MAX_SIZE = 6;
// comparable values to DESCENDING list
const MAX_DESCENDING_SORTED_VALUE = -1;
const EQUAL_SORTED_VALUE = 0;
const MIN_DESCENDING_SORTED_VALUE = +1;        

// keep this instance to persist the objects
// const azureDB = new AzureDashBoardDB();

// keep all deployments in memory
var Deployments = [];
var WorkItems = [];
var RequestedWorkItems = [];

// Initialize
VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true,
    usePlatformScripts: true
});

function initDashboard() {
    Deployments = [];
    WorkItems = [];
    RequestedWorkItems = [];
}

function getURI(uri) {
    return ENDPOINT + PROJECT_NAME + PROJECT_NAME + uri;
}

function getWorkItemEditUri(workItem) {
    return `https://mediahub.visualstudio.com/MediaHub/_workitems/edit/${workItem}`;
}

// this is a function which sorts a specific "list" and then take the first "count" elements
function takeElementsInComplementListOrderByDesc(list, count) {
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

/** Gets all release definitions for Service Fabric in the path '\3-SF'. */
function getReleaseDefinitionsForAppItem(appItem) {
    let searchContent = appItem.searchContent;
    let uri = getURI("_apis/release/definitions");
    appItem.isRunning = true;

    const httpClient = new HttpClient();
    httpClient.get(uri, { params: { data: {
        "api-version": "5.0",
        isDeleted: false,
        searchText: searchContent,
        // extra payload
        extra: {
            appItemId: appItem.id
        }
    } }}).then(function(response){
        const appItemId = response.config.params.data.extra.appItemId;
        const responseAppItem = app.getAppItem(appItemId);
        const searchPath = responseAppItem.path.toLowerCase();
        const hasSufix = responseAppItem.sufix !== "";
        const prefix = responseAppItem.prefix.toLowerCase();  
        const releaseList = [];     

        const callbackCardUpdated = function(definitionId, environment, content){
            const card = app.getCard(definitionId);
            if (card) {
                const releaseDefinitionName = card.release.definitionName;
                
                Deployments = addItemIfNotExists(Deployments, content);
                const list = Deployments.filter(f => f.definitionName === releaseDefinitionName && f.envGroup === environment);
                card.content[environment] = sortReleaseListAndTakeElements(list, 2);

                // TODO: Performance
                //azureDB.getDeploymentsByDefinitionName(card.release.definitionName, environment, (fullList) => {
                //    card.content[environment] = sortReleaseListAndTakeElements(fullList, 2);
                //});              
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
                    
                    // TODO: Performance
                    // persist on database                    
                    // azureDB.addReleaseDefinition(releaseItem.definitionId, releaseItem.definitionName, releaseItem.path, releaseItem.url, isPrincipal, appItemId);
                    
                    // if the item was identified as principal, create a card for it
                    if (isPrincipal === true) {
                        addCardDefinition(responseAppItem, releaseItem);  
                        // get card definition for each release linked to the app
                        getCardDefinitionWithDeployments(releaseItem, callbackCardUpdated);
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

function getEnvironment(env) {
    let envName = env.trim().toLowerCase();
    let dev = ["dev"];
    let qa = ["qa", QUALITY.trim().toLowerCase()];
    let stg = ["stg", STAGING.trim().toLowerCase()];
    let prd = ["prd", PRODUCTION.trim().toLowerCase()];

    if (dev.some(s => envName.includes(s))) {
        return DEVELOPMENT;
    } else if (qa.some(s => envName.includes(s))) {
        return QUALITY;
    } else if (stg.some(s => envName.includes(s))) {
        return STAGING;
    } if (prd.some(s => envName.includes(s))) {
        return PRODUCTION;
    } else {
        return "";
    }
}

/**
 * Gets the definition environments ids for Development, Quality, Staging and Production,
 * and gets the release information to draw the dashboard.
 * @param {any} releaseItem The release object which contains some attributes like definitionId and definitionName
  */
function getCardDefinitionWithDeployments(releaseItem, callbackCardAdded) {
    const appId = releaseItem.app.id;
    const definitionId = releaseItem.definitionId;
    const definitionName = releaseItem.definitionName;
    const uri = getURI("_apis/release/definitions/" + definitionId);
    const httpClient = new HttpClient();
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
			let env = getEnvironment(value.name);
            if (env === DEVELOPMENT) {
                getLastSucceededDeploymentInfo(responseAppId, responseDefinitionId, responseDefinitionName, ENVIRONMENT_DEV1, value.name, value.id, callbackCardAdded);
            } else if (env === QUALITY) {
                getLastSucceededDeploymentInfo(responseAppId, responseDefinitionId, responseDefinitionName, ENVIRONMENT_QA1, value.name, value.id, callbackCardAdded);
            } else if (env === STAGING) {
                getLastSucceededDeploymentInfo(responseAppId, responseDefinitionId, responseDefinitionName, ENVIRONMENT_STG1, value.name, value.id, callbackCardAdded);
            } else if (env === PRODUCTION) {
                getLastSucceededDeploymentInfo(responseAppId, responseDefinitionId, responseDefinitionName, ENVIRONMENT_PRD1, value.name, value.id, callbackCardAdded);
            } else {
                Log.add("Environment not found! " + value.name);
            }
        });
    });
    
}

function removeLastVersionControlNumber(version, truncateBuildNumber) {
    if (!truncateBuildNumber) return version;
    
    const parts = version.split(' ');
    if (parts.length <= 1) {
        return version;
    } else {
        const versionNumber = parts[parts.length - 1];
        const versionNumberParts = versionNumber.split('.');
        if (versionNumberParts.length <= 3) {
            return version;
        } else {
            versionNumberParts.pop();
            const control = versionNumberParts.join('.');
            parts.pop();
            const name = parts.join(' ');
            return name + " " + control;
        }
    }
}

function versionParts(releaseName) {
    let groups = releaseName.split(' ');
    let versionIndex = groups.length-1;
    let version = groups[versionIndex];
    return version.split('.').length;
}

/**
 * Gets de last succeeded deployment information.
 * @param {any} definitionName the release name, e.g: vNext - DEV OTT Deployment with DSC
 * @param {any} cssId The html css id.
 * @param {any} environment The environment id.
 * @param {any} definitionEnvironmentId The enviornment id for Development, Quality, Staging and Production.
 */
function getLastSucceededDeploymentInfo(appId, definitionId, definitionName, environment, environmentFullName, definitionEnvironmentId, callbackCardAdded) {
    if (definitionEnvironmentId && definitionEnvironmentId > 0) {
        const uri = getURI(`_apis/release/deployments?definitionId=${definitionId}&definitionEnvironmentId=${definitionEnvironmentId}`);
        const httpClient = new HttpClient();
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
            const appItem = app.getAppItem(responseAppId);
            const truncateBuildNumber = appItem.truncateBuildNumber;
            const responseDefinitionId = response.config.params.data.extra.definitionId;
            const responseDefinitionName = response.config.params.data.extra.definitionName;
            const responseEnvironmentFullName = response.config.params.data.extra.environmentFullName;
            const responseEnvironment = response.config.params.data.extra.environment;

            response.data.value.forEach((value, index) => {
                const fullReleaseName = value.release.name;
                const releaseName = removeLastVersionControlNumber(value.release.name, truncateBuildNumber);
                const releaseId = value.release.id;              
                const releaseDefinitionId = value.releaseDefinition.id;
                const reason = value.reason;
                const deployDate = value.completedOn;
                // using versionParts we can ignore releases sound like "SF UniversalCatalog 4"                
                const vParts = versionParts(releaseName);
                let deploymentStatus = undefined;                
                
                if (value.deploymentStatus === FAILED) {
                    deploymentStatus = false;
                } else if (value.deploymentStatus === SUCCEEDED) {
                    deploymentStatus = true;
                }
               
                let allowRelease = (value.operationStatus !== CANCELED) && (vParts > 1);
                if (allowRelease) {
                    const buildId = value.release.artifacts[0].definitionReference.version.id;
                    setReleaseProperties(responseAppId, responseDefinitionId, responseDefinitionName, responseEnvironment, responseEnvironmentFullName, buildId, releaseName, fullReleaseName, releaseDefinitionId, releaseId, deploymentStatus, reason, deployDate, callbackCardAdded);
                    getWorkItemsFromBuildNumber(responseAppId, responseDefinitionId, responseDefinitionName, responseEnvironment, buildId);
                }
            });
        });
    }
}

/**
 * Set the status icon and description of the release.
 * @param {any} id The control name id.
 * @param {any} isSuccess The status of the release (true for Succeeded, false for Failed and undefined for Pending Approval).
 */
function setStatusProperties(id, isSuccess) {
    let iconControl = $(id + "-icon");
    let textControl = $(id + "-text");
    iconControl.removeClass("pending-status-icon");
    textControl.removeClass("pending-status");
    iconControl.removeClass("succeeded-status-icon");
    textControl.removeClass("succeeded-status");
    iconControl.removeClass("failed-status-icon");
    textControl.removeClass("failed-status");
    if (isSuccess === undefined) {
        iconControl.addClass("pending-status-icon");
        textControl.addClass("pending-status");
        textControl.text(" Pending Approval");
    } else if (isSuccess) {
        iconControl.addClass("succeeded-status-icon");
        textControl.addClass("succeeded-status");
        textControl.text(" Succeeded");
    } else if (!isSuccess) {
        iconControl.addClass("failed-status-icon");
        textControl.addClass("failed-status");
        textControl.text(" Failed");
    }
}



/**
 * Builds dynamically all dashboards for each release.
 * @param {any} appItem 
 * @param {any} releaseItem
 * @param {any} releaseId The release name id.
 * @param {any} color The badge background color (defaults to 'badge-info').
 */
function addCardDefinition(appItem, releaseItem) {
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
    
    app.cards.push(card);

    return card;
}

/* 
  Compare versions
  Example for release "MH OTT 2.66.0.16"
  The version number is "2.66.0.16"
  The formated version number is 000000002.000000066.000000000.000000017
*/

// MH OTT 2.66.0.9_Development 
function getVersion(release) {
    let parts0 = release.split('_');
    let considerOnly = parts0[0];
    let parts1 = considerOnly.split(' ');
    let max = parts1.length - 1;
    let last = parts1[max];
    let parts2 = last.split('_');
    return (parts2.length > 0) ? parts2[0] : last;
  }
  
  function completeWithZero(content, count) {
    while (content.length < count) {
      content = '0' + content ;
    }
    return content;
  }
  
  function prepareToCompare(version, blockSize) {
    result = [];
    version.split(GROUP_SYMBOL).forEach(p => {
      p = completeWithZero(p, blockSize);
      result.push(p);
    });
    return result.join(GROUP_SYMBOL) ;
  }
  
  function makeVersionComparable(version, groups, blockSize) {
    while (version.split(GROUP_SYMBOL).length < groups) {
      version = version + '.0';
    }
    return prepareToCompare(version, blockSize);
  }
  
  function converToComparableVersion(releaseText) {
    let _version = getVersion(releaseText);
    let _prepare = prepareToCompare(_version, GROUP_LENGTH);
    let _compVersion = makeVersionComparable(_prepare, GROUP_SYMBOL_MAX_SIZE, GROUP_LENGTH);
    return _compVersion;
  }

  function maxVersion(v1, v2) {
    return (v1 >= v2) ? v1 : v2;
  }

// end of compare versions

function sortReleaseListAndTakeElements(items, count) {
        
    // Note! We consider -1 is a "high value" because the list is being descending sorted
    // -1: a is higher than b
    //  0: a is equal to b
    // +1: b is higher than a
    function compareReleases(a, b) {
        const itemA = { phase: a.sortColumn.split("|")[1], release: a.releaseNumber };
        const itemB = { phase: b.sortColumn.split("|")[1], release: b.releaseNumber };
        let mv = maxVersion(itemA.release, itemB.release);

        if (itemA.release === itemB.release) {
            if (itemA.phase > itemB.phase) {
                return MAX_DESCENDING_SORTED_VALUE;
            } else if (itemA.phase < itemB.phase) {
                return MIN_DESCENDING_SORTED_VALUE;
            } else {
                return EQUAL_SORTED_VALUE;
            }
        } else {
            if (mv === itemA.release) {
                return MAX_DESCENDING_SORTED_VALUE;
            } else {
                return MIN_DESCENDING_SORTED_VALUE;
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
                    if (compare === MIN_DESCENDING_SORTED_VALUE) {
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
        if (compare === MAX_DESCENDING_SORTED_VALUE) {
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
        if (compare === MIN_DESCENDING_SORTED_VALUE) {
            result.push(lastComparableObject);
        }
    } 

    return result;
}

function addItemIfNotExists(list, item) {
    let any = list.some(s => s.sortColumn === item.sortColumn);
    if (!any) {
        list.push(item);
    }
    return list;
}

// TODO
function notifyCardAdded(responseDefinitionId, environment, content, callbackCardAdded) {
    if (callbackCardAdded) {
        callbackCardAdded.call(this, responseDefinitionId, environment, content);
    }    
}

/**
 * Fills all the properties of the release.
 * @param {any} appId the app responsible for triggering the process, e.g: "biz"
 * @param {any} responseDefinitionId the releaseId linked to the app, e.g: 184
 * @param {any} responseDefinitionName the releaseName linked to the app, e.g: "vNext - DEV BIZ Deployment with DSC" 
 * 
 * @param {any} environment The environment name id, e:g: dev1, dev2, qa1, qa2, stg1, stg2, prod1 and prod2.
 * @param {any} environmentFullName The environment full name, e.g: Development
 * @param {any} buildId The build id.
 * @param {any} releaseText The release description.
 * 
 * @param {any} releaseDefinitionId
 * @param {any} releaseId The release name id. e.g: 184
 * @param {any} deploymentStatus e.g: true or false
 * 
 */
 function setReleaseProperties(appId, responseDefinitionId, responseDefinitionName, environment, environmentFullName, buildId, releaseText, releaseTextComplete, releaseDefinitionId, releaseId, deploymentStatus, reason, deployDate, callbackCardAdded) {
    if (releaseText) {
        // gets the uri dynamically.
        let uri = VSS.getWebContext().account.uri + "/" + VSS.getWebContext().account.name + "/";   // https://mediahub.visualstudio.com/MediaHub
        let uriReleasePipeline = "#";
        let uriReleaseLink = "#";
        let statusIconClass = "pending-status-icon";
        let statusTextClass = "pending-status";
        let statusText = "Pending Approval";
        let envGroup = environment.replace("1","").replace("2", "");
        let releaseNumber = converToComparableVersion(releaseText);
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

        const appItem = app.getAppItem(appId);
        
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
        
        // TODO: Performance
        //azureDB.addDeployment(content);

        notifyCardAdded(responseDefinitionId, envGroup, content, callbackCardAdded);
    }
}

function getWorkItemsFromBuildNumber(appId, definitionId, definitionName, environment, buildId){
    const uri = `https://dev.azure.com/MediaHub/MediaHub/_apis/build/builds/${buildId}/workitems?api-version=5.0`;
    const httpClient = new HttpClient();
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
            const workItemHasBeenRequested = RequestedWorkItems.indexOf(workItem) >= 0;
            // avoid getting more than one request to the same workitem
            if (workItemHasBeenRequested === false) {
                RequestedWorkItems.push(workItem);
                // after getting the work itens, add them to the build item (into the property workItems)
                const callbackWorkItem = function(wit) {
                    const card = app.getCard(definitionId);
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
                getWorkItemDefinition(url, respAppId, respDefinitionId, respDefinitionName, respEnvironment, respBuildId, workItem, callbackWorkItem);
            }
        });
    });
}

function getWorkItemDefinition(url, appId, definitionId, definitionName, environment, buildId, workItem, callback){
    const httpClient = new HttpClient();
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
            contentFilter: buildId.toString().trim().toLowerCase() + "_" +
                           respWorkItem.toString().trim().toLowerCase() + "_" +
                           response.data.fields["System.IterationPath"].toString().trim().toLowerCase() + "_" +
                           response.data.fields["System.WorkItemType"].toString().trim().toLowerCase() + "_" +
                           response.data.fields["System.Title"].toString().trim().toLowerCase(),
            workItem: {
                id: respWorkItem,
                iterationPath: response.data.fields["System.IterationPath"],
                type: response.data.fields["System.WorkItemType"],
                state: response.data.fields["System.State"],
                assignedTo: responsible,
                title: response.data.fields["System.Title"],
                url: response.data.url,
                editURL: getWorkItemEditUri(response.data.id)
            }
        };
        WorkItems.push(content);

        if (callback !== null) {
            callback.call(this, content);
        }
    });
}

/**
 * Shows the works items associated to the release.
 * @param {any} buildId The build id.
 * @param {any} titleName The release description.
 * @param {any} badgeColor The release description.
 */
function showWorkItemsListDialog(buildId, titleName, badgeColor) {
    VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService) {
        var extensionCtx = VSS.getExtensionContext();
        // Build absolute contribution ID for dialogContent
        var contributionId = extensionCtx.publisherId + "." + extensionCtx.extensionId + ".work-items-list";

        // Show dialog (https://docs.microsoft.com/en-us/azure/devops/extend/reference/client/api/vss/references/vss_sdk_interfaces/ihostdialogoptions?view=azure-devops)
        var dialogOptions = {
            title: "Work Items List",
            width: 1000,
            height: 400,
            resizable: false,
            modal: true,
            buttons: null,
            urlReplacementObject: { id: buildId, releaseName: titleName, badgeColor: badgeColor }
        };

        dialogService.openDialog(contributionId, dialogOptions);
    });
}

// Register callback to get called when initial handshake completed
VSS.ready(() => {
    app.init();
    VSS.notifyLoadSucceeded();
}); // end VSS
