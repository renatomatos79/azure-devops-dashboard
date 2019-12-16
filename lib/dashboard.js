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


// Initialize
VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true,
    usePlatformScripts: true
});

function addHeader(xhr) {
    var encodedData = btoa(":" + SECURITY_TOKEN);
    encodedData = "Basic " + encodedData;

    xhr.setRequestHeader('Authorization', encodedData);
    xhr.setRequestHeader('Content-Type', 'application/json');
}

function getURI(uri) {
    return ENDPOINT + PROJECT_NAME + PROJECT_NAME + uri;
}

function formatCssId(value) {
    // convert to lowercase
    // remove blank spaces and hyphens
    // join using -
    // Example: BIZ - Dev 1012 2536, result in biz-dev-1012-2536
    //return truncateBuildNumber ? value.toLowerCase().split(' ').filter(f => f.trim() !== '' && f.trim() !== '-').join('-') : value;
    return value.toLowerCase().split(' ').filter(f => f.trim() !== '' && f.trim() !== '-').join('-');
}

// this is a function which: descending sort a specific "list" and then take the first "count" elements
function takeElementsInComplementListOrderByDesc(list, count) {
    let max = count - 1;
    let items = list.filter(f => f.isPrincipal === false);
    let myMap = function(item, idx) {
        return { index: idx, content: item };
    };
    const sortedList = items.reverse().map( (m, i) => myMap(m, i) )
               // .sort( function(a, b){return b.index - a.index } )
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
        appItemId: appItem.id
    } }}).then(function(response){
        let releaseList = [];

        const db = new AzureDashBoardDB();
        const appItemId = response.config.params.data.appItemId;
        const responseAppItem = app.getAppItem(appItemId);
        const searchPath = responseAppItem.path.toLowerCase();
        const hasSufix = responseAppItem.sufix !== "";
        const prefix = responseAppItem.prefix.toLowerCase();        

        // to avoid mistakes during the filter, only consider data which contains the same path property content
        response.data.value.forEach( (value, index) => {
			if (value.path.toLowerCase() === searchPath.toLowerCase()) {
                let isPrincipal = value.name.toLowerCase().startsWith(prefix);
                let isReleaseMemberItem = isPrincipal || hasSufix;
                if (isReleaseMemberItem) {
                    db.addReleaseDefinition(value.id, value.name, value.path, value.url, isPrincipal, appItemId);
                    
                    releaseList.push({
                        app: responseAppItem,
                        definitionId: value.id,
                        definitionName: value.name,
                        isPrincipal: isPrincipal,
                        cards: []
                    });
                }
            }
        });

        // only itens which start by the app's prefix will be caught to the app
        // Attention! when we are using SF * we have only principal itens
        let principalList = releaseList.filter(f => f.isPrincipal === true);

        if (principalList.length > 0) {
            // cards will be created only for items from principal list
            principalList.forEach((releaseItem, index) => {
                // let cssId = formatCssId(releaseItem.definitionName);
                let card = addCardDefinition(responseAppItem, releaseItem);
                
                let callbackCardAdded = function(card, environment, content){
                    let fullList = card.content[environment+'Full'];
                    fullList = addItemIfNotExists(fullList, content);
                    card.content[environment] = sortReleaseListAndTakeElements(fullList, 2);
                    card.content[environment+'Full'] = sortReleaseListAndTakeElements(fullList, 0);
                }

                // getCardDefinition(appItem, releaseItem, releaseItem);
                getCardDefinition(releaseItem, callbackCardAdded);
            });

            // let complementList = takeElementsInComplementListOrderByDesc(releaseList, 4);
            // if (complementList.length > 0) {
            //     let principalItem = principalList[0];
            //     complementList.forEach((releaseItem, index) => {
            //         getCardDefinition(appItem, releaseItem, principalItem);
            //     });       
            // }
        }        

        responseAppItem.isReleaseListLoaded = true;
        responseAppItem.releaseList = sortByKeyAsc(principalList, 'definitionName');        
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
 * @param {any} releaseItem The release id, e.g: 185
 * @param {any} truncateBuildNumber this is a boolean that means if the build Name linked to the release will be truncated or not
 */
function getCardDefinition(releaseItem, callbackCardAdded) {
    const appId = releaseItem.app.id;
    const definitionId = releaseItem.definitionId;
    const definitionName = releaseItem.definitionName;
    const uri = getURI("_apis/release/definitions/" + definitionId);

    const httpClient = new HttpClient();
    httpClient.get(uri, { params: { data: {
        "api-version": "5.0",
        // extra payload
        appId: appId,
        definitionId: definitionId,
        definitionName: definitionName
    } }}).then(function(response){
        
        const responseAppId = response.config.params.data.appId;
        const responseDefinitionId = response.config.params.data.definitionId;
        const responseDefinitionName = response.config.params.data.definitionName;

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
                console.log("Environment not found! " + value.name);
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
        const uri = getURI("_apis/release/deployments");
        const appItem = app.getAppItem(appId);
        const truncateBuildNumber = appItem.truncateBuildNumber;

        const httpClient = new HttpClient();
        httpClient.get(uri, { params: { data: {
            "api-version": "5.0",
            definitionEnvironmentId: definitionEnvironmentId,
            // extra payload
            appId: appId,
            definitionId: definitionId,
            definitionName: definitionName,
            truncateBuildNumber: truncateBuildNumber,
            environmentFullName: environmentFullName,
            environment: environment
        } }}).then(function(response){
            
            const responseAppId = response.config.params.data.appId;
            const responseDefinitionId = response.config.params.data.definitionId;
            const responseDefinitionName = response.config.params.data.definitionName;
            const responseTruncateBuildNumber = response.config.params.data.truncateBuildNumber;
            const responseEnvironmentFullName = response.config.params.data.environmentFullName;
            const responseEnvironment = response.config.params.data.environment;
            
            response.data.value.forEach((value, index) => {
                
                const releaseName = removeLastVersionControlNumber(value.release.name, responseTruncateBuildNumber);
                const releaseId = value.release.id;              
                const releaseDefinitionId = value.releaseDefinition.id;
                const reason = value.reason;
                let status = undefined;
                // using versionParts we can ignore releases sound like "SF UniversalCatalog 4"
                let vParts = versionParts(releaseName);
                
                if (value.deploymentStatus === FAILED) {
                    status = false;
                } else if (value.deploymentStatus === SUCCEEDED) {
                    status = true;
                }

                // console.log(' environmentFullName: ', environmentFullName, 
                //         ' deploymentStatus: ', value.deploymentStatus, 
                //         ' operationStatus: ', value.operationStatus, 
                //         ' releaseName: ', releaseName);
                
                // console.log("DeployStatus: ", value.deploymentStatus, "OperationStatus: ", value.operationStatus, "Release: ", releaseName, "Env: ", environmentFullName, "Value: ", value);
                
                let allowRelease = (value.operationStatus !== CANCELED) && (vParts > 1);
                if (allowRelease) {
                    const buildId = value.release.artifacts[0].definitionReference.version.id;
                    setReleaseProperties(responseAppId, responseDefinitionId, responseDefinitionName, responseEnvironment, responseEnvironmentFullName, buildId, releaseName, releaseDefinitionId, releaseId, status, reason, callbackCardAdded);
                } 
                // else {
                //     console.log('env: ', environment, ' status: ', value.deploymentStatus, ' operation: ', value.operationStatus, ' release: ', definitionName);
                // }
                
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
        release: releaseItem,
        content: {
            dev: [], 
            devFull: [],
            qa: [], 
            qaFull: [],
            stg: [], 
            stgFull: [],
            prd: [], 
            prdFull: []
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

    // if (lastSucceeded !== null && lastComparableObject !== null && lastComparableObject.releaseText.includes("2.64.0.19")) {
    //     if (lastSucceeded.sortColumn.split("|")[1].includes("Production-Phase2.3")){
    //         if (lastComparableObject.sortColumn.split("|")[1].includes("Production-Phase3.1")){
    //             debugger; 
    //          }
    //     }        
    // }

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
function notifyCardAdded(card, environment, content, callbackCardAdded) {
/*
    let fullList = card.content[environment+'Full'];
    fullList = addItemIfNotExists(fullList, content);
    card.content[environment] = sortReleaseListAndTakeElements(fullList, 2);
    card.content[environment+'Full'] = sortReleaseListAndTakeElements(fullList, 0);
*/
    callbackCardAdded.call(this, card, environment, content);
}

/**
 * Fills all the properties of the release.
 * @param {any} definitionName the release name, e.g: vNext - DEV OTT Deployment with DSC
 * @param {any} releaseNameId The release name id. e.g: 184
 * @param {any} environment The environment name id.
 * @param {any} buildId The build id.
 * @param {any} releaseText The release description.
 * @param {any} definitionId The definitionId value to show the release status on each environment.
 * @param {any} releaseId The releaseId value of show the release pipeline.
 * @param {any} status The release status.
 */
 function setReleaseProperties(appId, responseDefinitionId, responseDefinitionName, environment, environmentFullName, buildId, releaseText, releaseDefinitionId, releaseId, status, reason, callbackCardAdded) {
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
        
        if (status !== undefined) {
            if (status) {
                statusIconClass = "succeeded-status-icon";
                statusTextClass = "succeeded-status";
                statusText = " Succeeded";
            } else {
                statusIconClass = "failed-status-icon";
                statusTextClass = "failed-status";
                statusText = " Failed";
            }
        }

        const content = {
            app: appId, //card.appItem,
            definitionId: responseDefinitionId,
            definitionName: responseDefinitionName,
            envGroup: envGroup,
            environment: environment,
            environmentFullName: environmentFullName.trim(),
            buildId: buildId,
            releaseDefinitionId: releaseDefinitionId,
            releaseId: releaseId,
            releaseText: releaseText.trim(),
            releaseNumber: releaseNumber.trim(),
            status: status,
            uri: uri,
            uriReleasePipeline: uriReleasePipeline,
            uriReleaseLink: uriReleaseLink,
            hasContent: true,
            statusIconClass: statusIconClass,
            statusTextClass: statusTextClass,
            statusText: statusText,
            sortColumn: sortContent,
            reason: reason,
            reasonColor: reason === "manual" ? "text-muted" : "text-info",
            contentFilter: app.title.trim().toLowerCase() + "_" +
                           responseDefinitionName.trim().toLowerCase() + "_" +
                           releaseText.trim().toLowerCase() + "_" + 
                           statusText.trim().toLowerCase()
        };

        console.log(content);
        
        debugger;

        // setContent(releaseNameId, envGroup, content);
        // console.log(card, " ", envGroup, " ", content);

        // notifyCardAdded(card, envGroup, content, callbackCardAdded);
    }
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

function sortByKeyAsc(array, key) {
    return array.sort(function (a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

// Register callback to get called when initial handshake completed
VSS.ready(() => {
    app.init();
    VSS.notifyLoadSucceeded();
}); // end VSS
