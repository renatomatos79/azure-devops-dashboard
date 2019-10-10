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

        // catch to the app only the itens with start by the app's prefix
        // using SF we have many principal itens
        let principalList = sortByKeyAsc(releaseList.filter(f => f.isPrincipal === true), 'definitionName');
        appItem.isReleaseListLoaded = true;
        appItem.releaseList = principalList;

        releaseList.forEach((releaseItem, index) => {
            let cssId = formatCssId(releaseItem.definitionName);
            addCardDefinition(appItem, releaseItem, cssId, color);
            getCardDefinition(appItem, releaseItem);
        });

    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('getReleaseDefinitions() response status: ' + jqXHR.status + ', textStatus: ' + textStatus + ', errorThrown: ' + errorThrown);
        console.log(jqXHR);
    });
}

function getEnvironment(env) {
    let envName = env.trim().toLowerCase();
    let dev = DEVELOPMENT.trim().toLowerCase();
    let qa = QUALITY.trim().toLowerCase();
    let stg = STAGING.trim().toLowerCase();    
    let prd = PRODUCTION.trim().toLowerCase();

    if (envName.includes(dev)) {
        return DEVELOPMENT;
    } else if (envName.includes(qa)) {
        return QUALITY;
    } else if (envName.includes(stg)) {
        return STAGING;
    } if (envName.includes(prd)) {
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
function getCardDefinition(appItem, releaseItem) {
    let definitionId = releaseItem.definitionId;
    let definitionName = releaseItem.definitionName;
    let uri = getURI("_apis/release/definitions/" + definitionId);

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

        let developmentDefinitionEnvironmentId = 0;
        let qualityDefinitionEnvironmentId = 0;
        let stagingDefinitionEnvironmentId = 0;
        let productionDefinitionEnvironmentId = 0;
        data.environments.forEach((value, index) => {
            let env = getEnvironment(value.name);
            
            if (env === DEVELOPMENT) {
                developmentDefinitionEnvironmentId = value.id;
            } else if (env === QUALITY) {
                qualityDefinitionEnvironmentId = value.id;
            } else if (env === STAGING) {
                stagingDefinitionEnvironmentId = value.id;
            } if (env === PRODUCTION) {
                productionDefinitionEnvironmentId = value.id;
            }
        });

        // getting information data...
        let cssId = formatCssId(definitionName);
        getLastSucceededDeploymentInfo(appItem, definitionName, cssId, ENVIRONMENT_DEV1, developmentDefinitionEnvironmentId);
        getLastSucceededDeploymentInfo(appItem, definitionName, cssId, ENVIRONMENT_QA1, qualityDefinitionEnvironmentId);
        getLastSucceededDeploymentInfo(appItem, definitionName, cssId, ENVIRONMENT_STG1, stagingDefinitionEnvironmentId);
        getLastSucceededDeploymentInfo(appItem, definitionName, cssId, ENVIRONMENT_PRD1, productionDefinitionEnvironmentId);

    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('getCardDefinition() response status: ' + jqXHR.status + ', textStatus: ' + textStatus + ', errorThrown: ' + errorThrown);
        console.log(jqXHR);
    });
}

/**
 * Get's all the releases for the Non Service Fabric releases.
 * @param {any} cssId The html css id.
 * @param {any} searchText The release name search text to search for.
 * @param {any} path The release path to look for. It is important to locate the actual releases.
 */
function getReleases(cssId, searchContent, path) {
    let uri = getURI("_apis/release/releases");

    $.ajax({
        type: "GET",
        url: uri,
        data: {
            "api-version": "5.0",
            searchText: searchContent
        },
        beforeSend: function (xhr) {
            addHeader(xhr);
        },
        dataType: 'json'
    }).done(function (data, textStatus, jqXHR) {
        let releaseListIds = [];
        data.value.forEach( (value, index) => {
            if (value.releaseDefinition.path === path) {
                releaseListIds.push(value.id);
            }
        });

        getReleaseById(cssId, releaseListIds);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('getReleases() response status: ' + jqXHR.status + ', textStatus: ' + textStatus + ', errorThrown: ' + errorThrown);
        console.log(jqXHR);
    });
}

/**
 * Search the release information.
 * @param {any} cssId The html css id.
 * @param {any} releaseListIds The list os release ids.
 */
function getReleaseById(cssId, releaseListIds) {
    let releaseId = releaseListIds[0];
    if (releaseId) {
        let uri = getURI("_apis/release/releases/" + releaseId);

        $.ajax({
            type: "GET",
            url: uri,
            beforeSend: function (xhr) {
                addHeader(xhr);
            },
            dataType: 'json'
        }).done(function (data, textStatus, jqXHR) {
            let releaseName = data.name;
            let definitionId = data.releaseDefinition.id;
            let notDeployedForDev = false;
            let notDeployedForQa = false;
            let notDeployedForStg = false;
            let notDeployedForPrd = false;
            data.environments.reverse().forEach( (value, index) => {
                if ((notDeployedForDev && value.status === REJECTED) || (notDeployedForDev === false && (value.name === 'Development' || value.name.startsWith('Dev-Phase'/*Dev-Phase because of BIZ*/) || value.name.startsWith('DEV '/*Dev-Phase because of PLAYER*/)) && (value.status === SUCCEEDED || value.status === PARTIALLY_SUCCEEDED || value.status === FAILED || value.status === NOT_DEPLOYED))) {
                    setDashboardValues(cssId, ENVIRONMENT_DEV1, releaseName, value.status, definitionId, releaseId, value.definitionEnvironmentId);
                } else if ((notDeployedForQa && value.status === REJECTED) || (notDeployedForQa === false && (value.name === 'Quality' || value.name.startsWith('Quality-Phase') || value.name.startsWith('QA '/*Dev-Phase because of PLAYER*/)) && (value.status === SUCCEEDED || value.status === PARTIALLY_SUCCEEDED || value.status === FAILED || value.status === NOT_DEPLOYED))) {
                    setDashboardValues(cssId, ENVIRONMENT_QA1, releaseName, value.status, definitionId, releaseId, value.definitionEnvironmentId);
                } else if ((notDeployedForStg && value.status === REJECTED) || (notDeployedForStg === false && (value.name.startsWith('Staging') || value.name.startsWith('STG '/*Dev-Phase because of PLAYER*/)) && (value.status === SUCCEEDED || value.status === PARTIALLY_SUCCEEDED || value.status === FAILED || value.status === NOT_DEPLOYED))) {
                    setDashboardValues(cssId, ENVIRONMENT_STG1, releaseName, value.status, definitionId, releaseId, value.definitionEnvironmentId);
                } else if ((notDeployedForPrd && value.status === REJECTED) || (notDeployedForPrd === false && (value.name.startsWith('Production') || value.name.startsWith('PRD '/*Dev-Phase because of PLAYER*/)) && (value.status === SUCCEEDED || value.status === PARTIALLY_SUCCEEDED || value.status === FAILED || value.status === NOT_DEPLOYED))) {
                    setDashboardValues(cssId, ENVIRONMENT_PRD1, releaseName, value.status, definitionId, releaseId, value.definitionEnvironmentId);
                } else if (value.status === 'notStarted') {
                    if (value.name === 'Development' || value.name.startsWith('Dev-Phase ') || value.name.startsWith('DEV ')) {
                        notDeployedForDev = true;
                    } else if (value.name === 'Quality' || value.name.startsWith('Quality-Phase') || value.name.startsWith('QA ')) {
                        notDeployedForQa = true;
                    } else if (value.name.startsWith('Staging') || value.name.startsWith('STG ')) {
                        notDeployedForStg = true;
                    } else if (value.name.startsWith('Production') || value.name.startsWith('PRD ')) {
                        notDeployedForPrd = true;
                    }
                }
            });

            let nameValueDev = $('#' + cssId + '-' + ENVIRONMENT_DEV1)[0].innerText;
            let nameValueQa = $('#' + cssId + '-' + ENVIRONMENT_QA1)[0].innerText;
            let nameValueStg = $('#' + cssId + '-' + ENVIRONMENT_STG1)[0].innerText;
            let nameValuePrd = $('#' + cssId + '-' + ENVIRONMENT_PRD1)[0].innerText;
            // check's if all release dashboards are completed and stops the iteration.
            if (nameValueDev === '' || nameValueQa === '' || nameValueStg === '' || nameValuePrd === '') {
                releaseListIds.shift();
                getReleaseById(cssId, releaseListIds);
            }
        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.log('getReleaseById() response status: ' + jqXHR.status + ', textStatus: ' + textStatus + ', errorThrown: ' + errorThrown);
            console.log(jqXHR);
        });
    }
}

/**
 * Set the dashboard information for the Non Service Fabric releases.
 * @param {any} cssId The html css id.
 * @param {any} environment The environment id.
 * @param {any} releaseName The release description.
 * @param {any} status The release status description.
 * @param {any} definitionId The release definition id.
 * @param {any} releaseId The release id.
 * @param {any} definitionEnvironmentId The release environment id.
 */
function setDashboardValues(cssId, environment, releaseName, status, definitionId, releaseId, definitionEnvironmentId) {
    let nameValue = $('#' + cssId + '-' + environment)[0].innerText;
    const environment2 = environment.slice(0, -1) + "2";
    let nameValue2 = $('#' + cssId + '-' + environment2)[0].innerText;

    if (nameValue === '' && (status === SUCCEEDED || status === PARTIALLY_SUCCEEDED)) {
        // ... preenche Environment1 e já não é necessário preencher Environment2
        setReleaseProperties(cssId, environment, 0, releaseName, definitionId, releaseId, true /*status*/);
    } else if (nameValue === '' && nameValue2 === '' && (status === FAILED || status === REJECTED)) {
        // ... preenche Environment2 e continuar à procura da ultima release succeeded
        setReleaseProperties(cssId, environment2, 0, releaseName, definitionId, releaseId, false /*status*/);
    } else if (nameValue === '' && nameValue2 === '' && status === NOT_DEPLOYED) {
        // call to get the operationStatus and check if it's Pendind:
        console.log('$$$$$ NOT DEPLOYED, BUT NEED TO CHECK IF ITs PENDING');
        console.log('###### releaseId: ' + releaseId + ', releaseName: ' + releaseName + ', Stage: ' + environment2 + ', status: ' + status);
        setReleaseProperties(cssId, environment2, 0, releaseName, definitionId, releaseId);
        // 'https://vsrm.dev.azure.com/mediahub/mediahub/_apis/release/deployments?api-version=5.0&$top=1&definitionEnvironmentId=' + definitionEnvironmentId
    }
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
function getLastSucceededDeploymentInfo(appItem, definitionName, cssId, environment, definitionEnvironmentId) {
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
            let hasSucceededInfo = false;
            let hasFailedInfo = false;
            data.value.forEach((value, index) => {
                const releaseName = removeLastVersionControlNumber(value.release.name, truncateBuildNumber);
                const releaseId = value.release.id;              

                let status;
                if (value.deploymentStatus === FAILED) {
                    status = false;
                } else if (value.deploymentStatus === NOT_DEPLOYED) {
                    status = undefined;
                } else { // for partiallySucceeded and Succeeded
                    status = true;
                }

                let definitionId = value.releaseDefinition.id;
                if (hasSucceededInfo === false && (value.deploymentStatus === SUCCEEDED || value.deploymentStatus === PARTIALLY_SUCCEEDED)) {
                    const buildId = value.release.artifacts[0].definitionReference.version.id;
                    setReleaseProperties(appItem, definitionName, cssId, environment, buildId, releaseName, definitionId, releaseId, status);
                    hasSucceededInfo = true;
                    if (hasFailedInfo === false) {
                        return false; // break iteration because if the first release is succeeded then there is no need to get failed ones.
                    }
                } else if (hasFailedInfo === false && (value.deploymentStatus === FAILED || (value.deploymentStatus === NOT_DEPLOYED && value.operationStatus === PENDING))) {
                    const buildId = value.release.artifacts[0].definitionReference.version.id;
                    const environment2 = environment.slice(0, -1) + "2";
                    setReleaseProperties(appItem, definitionName, cssId, environment2, buildId, releaseName, definitionId, releaseId, status);
                    hasFailedInfo = true;
                } else if (hasSucceededInfo && hasFailedInfo) {
                    return false; // break iteration
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

/**
 * Builds dynamically all dashboards for each release.
 * @param {any} appItem 
 * @param {any} releaseItem
 * @param {any} releaseId The release name id.
 * @param {any} color The badge background color (defaults to 'badge-info').
 */
function addCardDefinition(appItem, releaseItem, releaseId, color) {
    let card = 
    { 
        app: appItem,
        release: releaseItem,
        releaseId: releaseId,
        definitionId: releaseItem.definitionId,
        releaseTitle: releaseItem.definitionName,
        badgeClassName: "badge badge-" + color + " badge-card-title",        
        slicedControlName: "",
        devCardId: releaseId + '-dev-card',
        qaCardId: releaseId + '-qa-card',
        stgCardId: releaseId + '-stg-card',
        prdCardId: releaseId + '-prd-card',
        content: {
            dev: [], 
            qa: [], 
            stg: [], 
            prd: [] 
        }
    };
    
    
    app.cards.push(card);

    // console.log(card);
}

function setContent(releaseId, environment, content) {
    let filter = app.cards.filter(f => f.releaseId === releaseId);
    if (filter.length === 1) {
        let item = filter[0];
        let list = item.content[environment];
        list.push(content);
        // item.content[environment] = content;
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
function setReleaseProperties(appItem, definitionName, releaseNameId, environment, buildId, releaseText, definitionId, releaseId, status) {
    if (releaseText) {
        // gets the uri dynamically.
        let uri = VSS.getWebContext().account.uri + "/" + VSS.getWebContext().account.name + "/";   // https://mediahub.visualstudio.com/MediaHub
        let uriReleasePipeline = "#";
        let uriReleaseLink = "#";
        let statusIconClass = "pending-status-icon";
        let statusTextClass = "pending-status";
        let statusText = "Pending Approval";

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
            buildId: buildId,
            definitionId: definitionId,
            releaseId: releaseId,
            releaseText: releaseText,
            status: status,
            uri: uri,
            uriReleasePipeline: uriReleasePipeline,
            uriReleaseLink: uriReleaseLink,
            hasContent: true,
            statusIconClass: statusIconClass,
            statusTextClass: statusTextClass,
            statusText: statusText,            
            contentFilter: definitionName.trim().toLowerCase() + "_" +
                           releaseText.trim().toLowerCase() + "_" + 
                           statusText.trim().toLowerCase()
        };
        
        // set a content for a specific column
        let envGroup = environment.replace("1","").replace("2", "");
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
