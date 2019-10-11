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
function getReleaseDefinitions(appItem) {
    let searchPath = appItem.path;
    let searchContent = appItem.searchContent;
    let prefix = appItem.prefix.toLowerCase();
    let color = appItem.color;
    let hasSufix = appItem.sufix !== "";
    let uri = getURI("_apis/release/definitions");

    $.ajax({
        type: "GET",
        url: uri,
        data: {
            "api-version": "5.0",
            isDeleted: false,
            searchText: searchContent
        },
        beforeSend: function (xhr) {
            addHeader(xhr);
        },
        dataType: 'json'
    }).done(function (data, textStatus, jqXHR) {
        let releaseList = [];
        data.value.forEach( (value, index) => {            
            if (value.path.toLowerCase() === searchPath.toLowerCase()) {
                let isPrincipal = value.name.toLowerCase().startsWith(prefix);
                let isReleaseMemberItem = isPrincipal || hasSufix;
                if (isReleaseMemberItem) {
                    releaseList.push({
                        definitionId: value.id,
                        definitionName: value.name,
                        isPrincipal: isPrincipal
                    });
                }               
            }
        });

        // catch to the app only itens which start by the app's prefix
        // using SF we have only principal itens
        let principalList = releaseList.filter(f => f.isPrincipal === true);
        appItem.isReleaseListLoaded = true;
        appItem.releaseList = sortByKeyAsc(principalList, 'definitionName');

        if (principalList.length > 0) {
            // cards will be created only for items from principal list
            principalList.forEach((releaseItem, index) => {
                let cssId = formatCssId(releaseItem.definitionName);
                addCardDefinition(appItem, releaseItem, cssId, color);
                getCardDefinition(appItem, releaseItem, releaseItem);
            });

            let complementList = takeElementsInComplementListOrderByDesc(releaseList, 4);
            if (complementList.length > 0) {
                let principalItem = principalList[0];
                complementList.forEach((releaseItem, index) => {
                    getCardDefinition(appItem, releaseItem, principalItem);
                });       
            }            
        }

    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('getReleaseDefinitions() response status: ' + jqXHR.status + ', textStatus: ' + textStatus + ', errorThrown: ' + errorThrown);
        console.log(jqXHR);
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
function getCardDefinition(appItem, releaseItem, persistItem) {
    let definitionId = releaseItem.definitionId;
    let definitionName = releaseItem.definitionName;
    let uri = getURI("_apis/release/definitions/" + definitionId);
    let cssId = formatCssId(persistItem.definitionName);

    $.ajax({
        type: "GET",
        url: uri,
        data: {
            "api-version": "5.0",
        },
        beforeSend: function (xhr) {
            addHeader(xhr);
        },
        dataType: 'json'
    }).done(function (data, textStatus, jqXHR) {
        data.environments.forEach((value, index) => {
            let env = getEnvironment(value.name);
            if (env === DEVELOPMENT) {
                getLastSucceededDeploymentInfo(appItem, definitionName, cssId, ENVIRONMENT_DEV1, value.name, value.id);
            } else if (env === QUALITY) {
                getLastSucceededDeploymentInfo(appItem, definitionName, cssId, ENVIRONMENT_QA1, value.name, value.id);
            } else if (env === STAGING) {
                getLastSucceededDeploymentInfo(appItem, definitionName, cssId, ENVIRONMENT_STG1, value.name, value.id);
            } else if (env === PRODUCTION) {
                getLastSucceededDeploymentInfo(appItem, definitionName, cssId, ENVIRONMENT_PRD1, value.name, value.id);
            } else {
                console.log("Environment not found! " + value.name);
            }
        });
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('getCardDefinition() response status: ' + jqXHR.status + ', textStatus: ' + textStatus + ', errorThrown: ' + errorThrown);
        console.log(jqXHR);
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

/**
 * Gets de last succeeded deployment information.
 * @param {any} definitionName the release name, e.g: vNext - DEV OTT Deployment with DSC
 * @param {any} cssId The html css id.
 * @param {any} environment The environment id.
 * @param {any} definitionEnvironmentId The enviornment id for Development, Quality, Staging and Production.
 */
function getLastSucceededDeploymentInfo(appItem, definitionName, cssId, environment, environmentFullName, definitionEnvironmentId) {
    if (definitionEnvironmentId && definitionEnvironmentId > 0) {
        let uri = getURI("_apis/release/deployments");
        let truncateBuildNumber = appItem.truncateBuildNumber;

        $.ajax({
            type: "GET",
            url: uri,
            data: {
                "api-version": "5.0",
                definitionEnvironmentId: definitionEnvironmentId
            },
            beforeSend: function (xhr) {
                addHeader(xhr);
            },
            dataType: 'json'
        }).done(function (data, textStatus, jqXHR) {
            data.value.forEach((value, index) => {
                const releaseName = removeLastVersionControlNumber(value.release.name, truncateBuildNumber);
                const releaseId = value.release.id;              
                const definitionId = value.releaseDefinition.id;
                let status = undefined;                
                
                if (value.deploymentStatus === FAILED) {
                    status = false;
                } else if (value.deploymentStatus === NOT_DEPLOYED) {
                    status = undefined;
                } else { 
                    // for partiallySucceeded and Succeeded
                    status = true;
                }
                
                let allowRelease = (value.deploymentStatus === SUCCEEDED || value.deploymentStatus === PARTIALLY_SUCCEEDED) ||
                                   (value.deploymentStatus === FAILED || (value.deploymentStatus === NOT_DEPLOYED && value.operationStatus === PENDING));

                if (allowRelease) {
                    const buildId = value.release.artifacts[0].definitionReference.version.id;
                    // if (environmentFullName === "Production-Phase1.0"){
                    //     if (releaseName.includes("2.63.0.8")) {
                    //         debugger;
                    //     }                        
                    // }

                    setReleaseProperties(appItem, definitionName, cssId, environment, environmentFullName, buildId, releaseName, definitionId, releaseId, status);
                } else {
                    console.log('env: ', environment, ' status: ', value.deploymentStatus, ' operation: ', value.operationStatus, ' release: ', );
                }
                
            });
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.log('getLastSucceededDeploymentInfo() response status: ' + jqXHR.status + ', textStatus: ' + textStatus + ', errorThrown: ' + errorThrown);
            console.log(jqXHR);
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

function createGUID() {
    function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
    }
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
}

/**
 * Builds dynamically all dashboards for each release.
 * @param {any} appItem 
 * @param {any} releaseItem
 * @param {any} releaseId The release name id.
 * @param {any} color The badge background color (defaults to 'badge-info').
 */
function addCardDefinition(appItem, releaseItem, releaseId, color) {
    // TODO:
    // try to use 
    // dev: { items: [], full: [], showMore: false }
    
    let card = 
    {
        id: createGUID(),
        app: appItem,
        release: releaseItem,
        releaseId: releaseId,
        definitionId: releaseItem.definitionId,
        releaseTitle: releaseItem.definitionName,
        badgeClassName: "badge badge-" + color + " badge-card-title",
        devCardId: releaseId + '-dev-card',
        qaCardId: releaseId + '-qa-card',
        stgCardId: releaseId + '-stg-card',
        prdCardId: releaseId + '-prd-card',
        content: {
            dev: [], 
            devFull: [],
            devShowMore: false,
            qa: [], 
            qaFull: [], 
            qaShowMore: false,
            stg: [], 
            stgFull: [], 
            stgShowMore: false,
            prd: [], 
            prdFull: [],
            prdShowMore: false
        }
    };
    
    
    app.cards.push(card);
}

function sortReleaseListAndTakeElements(items, count) {
        
    const max = count === 0 ? items.length : count - 1;

    function compareReleases(a, b) {
        if (a === b) {
            return 0;
        } else {
            let list = [a, b].sort();
            let max = list[1];
            if (max === a) {
                return -1;
            } else {
                return +1;
            }
        }
    }

    function orderbyDesc( a, b ) {
      return compareReleases(a.sortColumn, b.sortColumn);
    }

    const sortedList = items.sort(orderbyDesc);

    if (count == 0) {
        return sortedList;
    }

    let succeeded = sortedList.filter(f => f.statusText !== undefined && f.statusText.trim().toLowerCase().includes("succeeded"));
    let pending = sortedList.filter(f => f.statusText !== undefined && f.statusText.trim().toLowerCase().includes("pending"));
    let failed  = sortedList.filter(f => f.statusText !== undefined && f.statusText.trim().toLowerCase().includes("failed"));
    let result = [];

    if (succeeded.length > 0) {
        result.push(succeeded[0]);
    }

    if (pending.length > 0 && failed.length === 0) {
        result.push(pending[0]);
    }

    if (pending.length === 0 && failed.length > 0) {
        result.push(failed[0]);
    }

    if (pending.length > 0 && failed.length > 0) {
        let compare = compareReleases(pending[0].sortColumn, failed[0].sortColumn);
        if (compare === -1) {
            result.push(pending[0]);
        } else {
            result.push(failed[0]);
        }
    }

    return result;
}

function addReleaseItem(list, item) {
    //let hasSome = list.some(s => s.releaseText.trim().toLowerCase() === item.releaseText.trim().toLowerCase());
    //if (!hasSome) {
        list.push(item);
    //}
    return list;
}

function setContent(releaseId, environment, content) {
    let filter = app.cards.filter(f => f.releaseId === releaseId);
    if (filter.length === 1) {
        let list = filter[0].content[environment];
        let fullList = filter[0].content[environment+'Full'];
        list = addReleaseItem(list, content);
        fullList = addReleaseItem(fullList, content);
        filter[0].content[environment] = sortReleaseListAndTakeElements(list, 2);
        filter[0].content[environment+'Full'] = sortReleaseListAndTakeElements(fullList, 0);
    }
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
function setReleaseProperties(appItem, definitionName, releaseNameId, environment, environmentFullName, buildId, releaseText, definitionId, releaseId, status) {
    if (releaseText) {
        // gets the uri dynamically.
        let uri = VSS.getWebContext().account.uri + "/" + VSS.getWebContext().account.name + "/";   // https://mediahub.visualstudio.com/MediaHub
        let uriReleasePipeline = "#";
        let uriReleaseLink = "#";
        let statusIconClass = "pending-status-icon";
        let statusTextClass = "pending-status";
        let statusText = "Pending Approval";
        let envGroup = environment.replace("1","").replace("2", "");

        if (releaseId && releaseId > 0) {
            uriReleasePipeline = uri + "_releaseProgress?_a=release-pipeline-progress&releaseId=" + releaseId;
        }

        if (definitionId && definitionId > 0) {
            uriReleaseLink = uri + "_release?view=all&definitionId=" + definitionId;
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
            app: appItem,
            title: definitionName, 
            envGroup: envGroup,
            environment: environment,
            environmentFullName: environmentFullName.trim(),
            buildId: buildId,
            definitionId: definitionId,
            releaseId: releaseId,
            releaseText: releaseText.trim(),
            status: status,
            uri: uri,
            uriReleasePipeline: uriReleasePipeline,
            uriReleaseLink: uriReleaseLink,
            hasContent: true,
            statusIconClass: statusIconClass,
            statusTextClass: statusTextClass,
            statusText: statusText,
            sortColumn: releaseText.trim() + "_" + environmentFullName.trim(),
            contentFilter: definitionName.trim().toLowerCase() + "_" +
                           releaseText.trim().toLowerCase() + "_" + 
                           statusText.trim().toLowerCase()
        };
        
        // set a content for a specific column
        setContent(releaseNameId, envGroup, content);
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
