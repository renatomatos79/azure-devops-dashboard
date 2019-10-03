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
const DEVELOPMENT = 'Development';
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
// SEACH CRITERIA
const SEACH_PATH = '\\3-SF';
const SEACH_PREFIX = 'SF ';
// DASHBOARD RELEASES to show
//const OTT_CSS_ID = "ott";
//const BIZ_CSS_ID = "biz";
//const BOM_CSS_ID = "bom";
//const OVX_CSS_ID = "ovx";
//const PLAYER_CSS_ID = "player";

// Initialize
VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true,
    usePlatformScripts: true
});

/** Gets all release definitions for Service Fabric in the path '\3-SF'. */
function getReleaseDefinitions() {
    let uri = ENDPOINT + PROJECT_NAME + PROJECT_NAME + "_apis/release/definitions";
    var encodedData = btoa(":" + SECURITY_TOKEN);
    encodedData = "Basic " + encodedData;

    $.ajax({
        type: "GET",
        url: uri,
        data: {
            "api-version": "5.0",
            //"$top":1000,
            isDeleted: false,
            searchText: SEACH_PREFIX
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', encodedData);
            xhr.setRequestHeader('Content-Type', 'application/json');
        },
        dataType: 'json'
    }).done(function (data, textStatus, jqXHR) {
        let releaseList = [];
        $.each(data.value, function (index, value) {
            if (value.path === SEACH_PATH && value.name.startsWith(SEACH_PREFIX)) {
                releaseList.push({
                    definitionId: value.id,
                    definitionName: value.name
                });
            }
        });

        releaseList = sortByKeyAsc(releaseList, 'definitionName');
        app.isReleaseListLoaded = true;
        app.releaseList = releaseList.map(function(el){ 
            return { 
                definitionId: el.definitionId, 
                definitionName: el.definitionName, 
                isChecked: true
            };
        });

        $.each(releaseList, function (index, value) {
            // build the dashboard
            let cssId = value.definitionName.replace(' ', '-').toLowerCase();
            addNewReleaseTableRow(value.definitionId, value.definitionName, cssId, 'badge-info');

            //console.log(definitionName + ', definitionId: ' + definitionId);
            //if (definitionName === 'SF UniversalCatalog') {
            getReleaseDefinition(value.definitionId, value.definitionName);
            //}
        });
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('getReleaseDefinitions() response status: ' + jqXHR.status + ', textStatus: ' + textStatus + ', errorThrown: ' + errorThrown);
        console.log(jqXHR);
    });
}

/**
 * Gets the definition environments ids for Development, Quality, Staging and Production,
 * and gets the release information to draw the dashboard.
 * @param {any} definitionId The definition id.
 * @param {any} definitionName The definition description.
 */
function getReleaseDefinition(definitionId, definitionName) {
    let uri = ENDPOINT + PROJECT_NAME + PROJECT_NAME + "_apis/release/definitions/" + definitionId;
    var encodedData = btoa(":" + SECURITY_TOKEN);
    encodedData = "Basic " + encodedData;

    $.ajax({
        type: "GET",
        url: uri,
        data: {
            "api-version": "5.0",
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', encodedData);
            xhr.setRequestHeader('Content-Type', 'application/json');
        },
        dataType: 'json'
    }).done(function (data, textStatus, jqXHR) {

        let developmentDefinitionEnvironmentId = 0;
        let qualityDefinitionEnvironmentId = 0;
        let stagingDefinitionEnvironmentId = 0;
        let productionDefinitionEnvironmentId = 0;
        $.each(data.environments, function (index, value) {
            if (value.name === DEVELOPMENT) {
                developmentDefinitionEnvironmentId = value.id;
            } else if (value.name === QUALITY) {
                qualityDefinitionEnvironmentId = value.id;
            } else if (value.name === STAGING) {
                stagingDefinitionEnvironmentId = value.id;
            } if (value.name === PRODUCTION) {
                productionDefinitionEnvironmentId = value.id;
            }
        });

        // getting information data...
        let cssId = definitionName.replace(' ', '-').toLowerCase();
        getLastSucceededDeploymentInfo(cssId, ENVIRONMENT_DEV1, developmentDefinitionEnvironmentId);
        getLastSucceededDeploymentInfo(cssId, ENVIRONMENT_QA1, qualityDefinitionEnvironmentId);
        getLastSucceededDeploymentInfo(cssId, ENVIRONMENT_STG1, stagingDefinitionEnvironmentId);
        getLastSucceededDeploymentInfo(cssId, ENVIRONMENT_PRD1, productionDefinitionEnvironmentId);

    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('getReleaseDefinition() response status: ' + jqXHR.status + ', textStatus: ' + textStatus + ', errorThrown: ' + errorThrown);
        console.log(jqXHR);
    });
}

/**
 * Get's all the releases for the Non Service Fabric releases.
 * @param {any} cssId The html css id.
 * @param {any} searchText The release name search text to search for.
 * @param {any} path The release path to look for. It is important to locate the actual releases.
 */
function getReleases(cssId, searchText, path) {
    let uri = ENDPOINT + PROJECT_NAME + PROJECT_NAME + "_apis/release/releases";
    var encodedData = btoa(":" + SECURITY_TOKEN);
    encodedData = "Basic " + encodedData;

    $.ajax({
        type: "GET",
        url: uri,
        data: {
            "api-version": "5.0",
            //"$top":100,
            searchText: searchText
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', encodedData);
            xhr.setRequestHeader('Content-Type', 'application/json');
        },
        dataType: 'json'
    }).done(function (data, textStatus, jqXHR) {
        let releaseListIds = [];
        $.each(data.value, function (index, value) {
            if (value.releaseDefinition.path === path) {
                //console.log('Id: ' + value.id + ', Name: ' + value.name + ', releaseDefinitionName: ' + value.releaseDefinition.name + ', url: ' + value.url);
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
        let uri = ENDPOINT + PROJECT_NAME + PROJECT_NAME + "_apis/release/releases/" + releaseId;
        var encodedData = btoa(":" + SECURITY_TOKEN);
        encodedData = "Basic " + encodedData;

        $.ajax({
            type: "GET",
            url: uri,
            //data: {
            //    "api-version": "5.0",
            //    //"$top":1,
            //    searchText: searchText
            //},
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', encodedData);
                xhr.setRequestHeader('Content-Type', 'application/json');
            },
            dataType: 'json'
        }).done(function (data, textStatus, jqXHR) {
            let releaseName = data.name;
            let definitionId = data.releaseDefinition.id;
            let notDeployedForDev = false;
            let notDeployedForQa = false;
            let notDeployedForStg = false;
            let notDeployedForPrd = false;
            $.each(data.environments.reverse(), function (index, value) {
                //console.log('releaseId: ' + releaseId + ', releaseName: ' + releaseName + ', Stage: ' + value.name + ', status: ' + value.status);

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
        //console.log('###### releaseId: ' + releaseId + ', releaseName: ' + releaseName + ', Stage: ' + environment + ', status: ' + status);
        setReleaseProperties(cssId, environment, 0, releaseName, definitionId, releaseId, true /*status*/);
    } else if (nameValue === '' && nameValue2 === '' && (status === FAILED || status === REJECTED)) {
        // ... preenche Environment2 e continuar à procura da ultima release succeeded
        //console.log('###### releaseId: ' + releaseId + ', releaseName: ' + releaseName + ', Stage: ' + environment2 + ', status: ' + status);
        setReleaseProperties(cssId, environment2, 0, releaseName, definitionId, releaseId, false /*status*/);
    } else if (nameValue === '' && nameValue2 === '' && status === NOT_DEPLOYED) {
        // call to get the operationStatus and check if it's Pendind:
        console.log('$$$$$ NOT DEPLOYED, BUT NEED TO CHECK IF ITs PENDING');
        console.log('###### releaseId: ' + releaseId + ', releaseName: ' + releaseName + ', Stage: ' + environment2 + ', status: ' + status);
        setReleaseProperties(cssId, environment2, 0, releaseName, definitionId, releaseId);
        // 'https://vsrm.dev.azure.com/mediahub/mediahub/_apis/release/deployments?api-version=5.0&$top=1&definitionEnvironmentId=' + definitionEnvironmentId
    }
}

function  removeLastVersionControlNumber(version) {
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
 * @param {any} cssId The html css id.
 * @param {any} environment The environment id.
 * @param {any} definitionEnvironmentId The enviornment id for Development, Quality, Staging and Production.
 */
function getLastSucceededDeploymentInfo(cssId, environment, definitionEnvironmentId) {
    if (definitionEnvironmentId && definitionEnvironmentId > 0) {
        let uri = ENDPOINT + PROJECT_NAME + PROJECT_NAME + "_apis/release/deployments";
        var encodedData = btoa(":" + SECURITY_TOKEN);
        encodedData = "Basic " + encodedData;

        $.ajax({
            type: "GET",
            url: uri,
            data: {
                "api-version": "5.0",
                //"$top":1,
                //deploymentStatus: deploymentStatus,
                definitionEnvironmentId: definitionEnvironmentId
            },
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', encodedData);
                xhr.setRequestHeader('Content-Type', 'application/json');
            },
            dataType: 'json'
        }).done(function (data, textStatus, jqXHR) {
            let hasSucceededInfo = false;
            let hasFailedInfo = false;
            $.each(data.value, function (index, value) {
                const releaseName = removeLastVersionControlNumber(value.release.name);
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
                    //console.log(releaseName + " - buildId: " + buildId);
                    setReleaseProperties(cssId, environment, buildId, releaseName, definitionId, releaseId, status);
                    hasSucceededInfo = true;
                    if (hasFailedInfo === false) {
                        return false; // break iteration because if the first release is succeeded then there is no need to get failed ones.
                    }
                } else if (hasFailedInfo === false && (value.deploymentStatus === FAILED || (value.deploymentStatus === NOT_DEPLOYED && value.operationStatus === PENDING))) {
                    const buildId = value.release.artifacts[0].definitionReference.version.id;
                    //console.log(releaseName + " - buildId: " + buildId);
                    const environment2 = environment.slice(0, -1) + "2";
                    setReleaseProperties(cssId, environment2, buildId, releaseName, definitionId, releaseId, status);
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
 * @param {any} releaseTitle The dashboard release title name.
 * @param {any} releaseId The release name id.
 * @param {any} badgeTitleColor The badge background color (defaults to 'badge-info').
 */
function addNewReleaseTableRow(definitionId, releaseTitle, releaseId, badgeTitleColor) {
    let card = 
    { 
        rowId: releaseId + "-row",
        rowName: definitionId + "-row",

        badgeClassName: "badge " + badgeTitleColor + " badge-card-title",
        badgeTitleColor: 'badge-info',

        releaseTitle: releaseTitle,

        devCardId: releaseId + '-dev-card',
        qaCardId: releaseId + '-qa-card',
        stgCardId: releaseId + '-stg-card',
        prdCardId: releaseId + '-prd-card',

        devReleaseLinkId: releaseId + "-dev-release-link",
        qaReleaseLinkId: releaseId + "-qa-release-link",
        stgReleaseLinkId: releaseId + "-stg-release-link",
        prdReleaseLinkId: releaseId + "-prd-release-link",

        devModalReleaseLinkId1: releaseId + ENVIRONMENT_DEV1 + "-link",
        devModalReleaseLinkId2: releaseId + ENVIRONMENT_DEV2 + "-link",
        qaModalReleaseLinkId1: releaseId + ENVIRONMENT_QA1 + "-link",
        qaModalReleaseLinkId2: releaseId + ENVIRONMENT_QA2 + "-link",
        stgModalReleaseLinkId1: releaseId + ENVIRONMENT_STG1 + "-link",
        stgModalReleaseLinkId2: releaseId + ENVIRONMENT_STG2 + "-link",
        prdModalReleaseLinkId1: releaseId + ENVIRONMENT_PRD1 + "-link",
        prdModalReleaseLinkId2: releaseId + ENVIRONMENT_PRD2 + "-link",

        devReleaseDivId1: releaseId + "-" + ENVIRONMENT_DEV1 + "-div",
        devReleaseDivId2: releaseId + "-" + ENVIRONMENT_DEV2 + "-div",
        qaReleaseDivId1: releaseId + "-" + ENVIRONMENT_QA1 + "-div",
        qaReleaseDivId2: releaseId + "-" + ENVIRONMENT_QA2 + "-div",
        stgReleaseDivId1: releaseId + "-" + ENVIRONMENT_STG1 + "-div",
        stgReleaseDivId2: releaseId + "-" + ENVIRONMENT_STG2 + "-div",
        prdReleaseDivId1: releaseId + "-" + ENVIRONMENT_PRD1 + "-div",
        prdReleaseDivId2: releaseId + "-" + ENVIRONMENT_PRD2 + "-div",

        devStatusIconId1: releaseId + "-" + ENVIRONMENT_DEV1 + "-status-icon",
        devStatusIconId2: releaseId + "-" + ENVIRONMENT_DEV2 + "-status-icon",
        qaStatusIconId1: releaseId + "-" + ENVIRONMENT_QA1 + "-status-icon",
        qaStatusIconId2: releaseId + "-" + ENVIRONMENT_QA2 + "-status-icon",
        stgStatusIconId1: releaseId + "-" + ENVIRONMENT_STG1 + "-status-icon",
        stgStatusIconId2: releaseId + "-" + ENVIRONMENT_STG2 + "-status-icon",
        prdStatusIconId1: releaseId + "-" + ENVIRONMENT_PRD1 + "-status-icon",
        prdStatusIconId2: releaseId + "-" + ENVIRONMENT_PRD2 + "-status-icon",

        devStatusTextId1: releaseId + "-" + ENVIRONMENT_DEV1 + "-status-text",
        devStatusTextId2: releaseId + "-" + ENVIRONMENT_DEV2 + "-status-text",
        qaStatusTextId1: releaseId + "-" + ENVIRONMENT_QA1 + "-status-text",
        qaStatusTextId2: releaseId + "-" + ENVIRONMENT_QA2 + "-status-text",
        stgStatusTextId1: releaseId + "-" + ENVIRONMENT_STG1 + "-status-text",
        stgStatusTextId2: releaseId + "-" + ENVIRONMENT_STG2 + "-status-text",
        prdStatusTextId1: releaseId + "-" + ENVIRONMENT_PRD1 + "-status-text",
        prdStatusTextId2: releaseId + "-" + ENVIRONMENT_PRD2 + "-status-text",

        devDashboardReleaseId1: releaseId + "-" + ENVIRONMENT_DEV1,
        devDashboardReleaseId2: releaseId + "-" + ENVIRONMENT_DEV2,
        qaDashboardReleaseId1: releaseId + "-" + ENVIRONMENT_QA1,
        qaDashboardReleaseId2: releaseId + "-" + ENVIRONMENT_QA2,
        stgDashboardReleaseId1: releaseId + "-" + ENVIRONMENT_STG1,
        stgDashboardReleaseId2: releaseId + "-" + ENVIRONMENT_STG2,
        prdDashboardReleaseId1: releaseId + "-" + ENVIRONMENT_PRD1,
        prdDashboardReleaseId2: releaseId + "-" + ENVIRONMENT_PRD2
    };
    
    
    if (!badgeTitleColor) {
        card.badgeTitleColor = 'badge-info';
    }

    app.cards.push(card);

    // $("#table-cards").append(`
    //     <tr id="` + releaseId + `-row" name="`+definitionId+`-row">
    //         <th scope="row">
    //             <div id="` + releaseId + `-dev-card" class="card">
    //                 <div class="card-body2">
    //                     <div><a href="#" target="_blank" class="card-title" id="` + releaseId + `-dev-release-link"><span class="badge ` + badgeTitleColor + ` badge-card-title">` + releaseTitle + `</span></a></div>
    //                     <div id="` + releaseId + `-` + ENVIRONMENT_DEV1 + `-div" class="card-text margin-bottom"><a class="dashboard-release" id="` + releaseId + `-` + ENVIRONMENT_DEV1 + `" href="#" target="_blank"></a> <div class="align-top"><i id="` + releaseId + `-` + ENVIRONMENT_DEV1 + `-status-icon" class="fas"></i><span id="` + releaseId + `-` + ENVIRONMENT_DEV1 + `-status-text"></span></div><a id="` + releaseId + `-` + ENVIRONMENT_DEV1 + `-link" class="far align-top fa-clipboard dashboard-card-icon"></a></div>
    //                     <div id="` + releaseId + `-` + ENVIRONMENT_DEV2 + `-div" class="card-text"><a class="dashboard-release" id="` + releaseId + `-` + ENVIRONMENT_DEV2 + `" href="#" target="_blank"></a> <div class="align-top"> <i id="` + releaseId + `-` + ENVIRONMENT_DEV2 + `-status-icon" class="fas"></i><span id="` + releaseId + `-` + ENVIRONMENT_DEV2 + `-status-text"></span></div><a id="` + releaseId + `-` + ENVIRONMENT_DEV2 + `-link" class="far align-top fa-clipboard dashboard-card-icon"></a></div>
    //                 </div>
    //             </div>
    //         </th>
    //         <td>
    //             <div id="` + releaseId + `-qa-card" class="card">
    //                 <div class="card-body2">
    //                     <div><a href="#" target="_blank" class="card-title" id="` + releaseId + `-qa-release-link"><span class="badge ` + badgeTitleColor + ` badge-card-title">` + releaseTitle + `</span></a></div>
    //                     <div id="` + releaseId + `-` + ENVIRONMENT_QA1 + `-div" class="card-text margin-bottom"><a class="dashboard-release" id="` + releaseId + `-` + ENVIRONMENT_QA1 + `" href="#" target="_blank"></a> <div class="align-top"><i id="` + releaseId + `-` + ENVIRONMENT_QA1 + `-status-icon" class="fas"></i><span id="` + releaseId + `-` + ENVIRONMENT_QA1 + `-status-text"></span></div><a id="` + releaseId + `-` + ENVIRONMENT_QA1 + `-link" class="far align-top fa-clipboard dashboard-card-icon"></a></div>
    //                     <div id="` + releaseId + `-` + ENVIRONMENT_QA2 + `-div" class="card-text"><a class="dashboard-release" id="` + releaseId + `-` + ENVIRONMENT_QA2 + `" href="#" target="_blank"></a> <div class="align-top"><i id="` + releaseId + `-` + ENVIRONMENT_QA2 + `-status-icon" class="fas"></i><span id="` + releaseId + `-` + ENVIRONMENT_QA2 + `-status-text"></span></div><a id="` + releaseId + `-` + ENVIRONMENT_QA2 + `-link" class="far align-top fa-clipboard dashboard-card-icon"></a></div>
    //                 </div>
    //             </div>
    //         </td>
    //         <td>
    //             <div id="` + releaseId + `-stg-card" class="card">
    //                 <div class="card-body2">
    //                     <div><a href="#" target="_blank" class="card-title" id="` + releaseId + `-stg-release-link"><span class="badge ` + badgeTitleColor + ` badge-card-title">` + releaseTitle + `</span></a></div>
    //                     <div id="` + releaseId + `-` + ENVIRONMENT_STG1 + `-div" class="card-text margin-bottom"><a class="dashboard-release" id="` + releaseId + `-` + ENVIRONMENT_STG1 + `" href="#" target="_blank"></a> <div class="align-top"><i id="` + releaseId + `-` + ENVIRONMENT_STG1 + `-status-icon" class="fas"></i><span id="` + releaseId + `-` + ENVIRONMENT_STG1 + `-status-text"></span></div><a id="` + releaseId + `-` + ENVIRONMENT_STG1 + `-link" class="far align-top fa-clipboard dashboard-card-icon"></a></div>
    //                     <div id="` + releaseId + `-` + ENVIRONMENT_STG2 + `-div" class="card-text"><a class="dashboard-release" id="` + releaseId + `-` + ENVIRONMENT_STG2 + `" href="#" target="_blank"></a> <div class="align-top"><i id="` + releaseId + `-` + ENVIRONMENT_STG2 + `-status-icon" class="fas"></i><span id="` + releaseId + `-` + ENVIRONMENT_STG2 + `-status-text"></span></div><a id="` + releaseId + `-` + ENVIRONMENT_STG2 + `-link" class="far align-top fa-clipboard dashboard-card-icon"></a></div>
    //                 </div>
    //             </div>
    //         </td>
    //         <td>
    //             <div id="` + releaseId + `-prd-card" class="card">
    //                 <div class="card-body2">
    //                     <div><a href="#" target="_blank" class="card-title" id="` + releaseId + `-prd-release-link"><span class="badge ` + badgeTitleColor + ` badge-card-title">` + releaseTitle + `</span></a></div>
    //                     <div id="` + releaseId + `-` + ENVIRONMENT_PRD1 + `-div" class="card-text margin-bottom"><a class="dashboard-release" id="` + releaseId + `-` + ENVIRONMENT_PRD1 + `" href="#" target="_blank"></a> <div class="align-top"><i id="` + releaseId + `-` + ENVIRONMENT_PRD1 + `-status-icon" class="fas"></i><span id="` + releaseId + `-` + ENVIRONMENT_PRD1 + `-status-text"></span></div><a id="` + releaseId + `-` + ENVIRONMENT_PRD1 + `-link" class="far align-top fa-clipboard dashboard-card-icon"></a></div>
    //                     <div id="` + releaseId + `-` + ENVIRONMENT_PRD2 + `-div" class="card-text"><a class="dashboard-release" id="` + releaseId + `-` + ENVIRONMENT_PRD2 + `" href="#" target="_blank"></a> <div class="align-top"><i id="` + releaseId + `-` + ENVIRONMENT_PRD2 + `-status-icon" class="fas"></i><span id="` + releaseId + `-` + ENVIRONMENT_PRD2 + `-status-text"></span></div><a id="` + releaseId + `-` + ENVIRONMENT_PRD2 + `-link" class="far align-top fa-clipboard dashboard-card-icon"></a></div>
    //                 </div>
    //             </div>
    //         </td>
    //     </tr>`);
    
    $('#' + releaseId + '-dev-card').hide();
    $('#' + releaseId + '-qa-card').hide();
    $('#' + releaseId + '-stg-card').hide();
    $('#' + releaseId + '-prd-card').hide();
    $('#' + releaseId + '-row').hide();
    $('#' + releaseId + '-' + ENVIRONMENT_DEV1 + '-div').hide();
    $('#' + releaseId + '-' + ENVIRONMENT_DEV2 + '-div').hide();
    $('#' + releaseId + '-' + ENVIRONMENT_QA1 + '-div').hide();
    $('#' + releaseId + '-' + ENVIRONMENT_QA2 + '-div').hide();
    $('#' + releaseId + '-' + ENVIRONMENT_STG1 + '-div').hide();
    $('#' + releaseId + '-' + ENVIRONMENT_STG2 + '-div').hide();
    $('#' + releaseId + '-' + ENVIRONMENT_PRD1 + '-div').hide();
    $('#' + releaseId + '-' + ENVIRONMENT_PRD2 + '-div').hide();  

    
}

/**
 * Fills all the properties of the release.
 * @param {any} releaseNameId The release name id.
 * @param {any} environment The environment name id.
 * @param {any} buildId The build id.
 * @param {any} releaseText The release description.
 * @param {any} definitionId The definitionId value to show the release status on each environment.
 * @param {any} releaseId The releaseId value of show the release pipeline.
 * @param {any} status The release status.
 */
function setReleaseProperties(releaseNameId, environment, buildId, releaseText, definitionId, releaseId, status) {
    let controlName = releaseNameId + "-" + environment;
    if (releaseText) {
        $("#" + controlName).text(releaseText);
        $("#" + controlName + "-div").fadeIn();
        $('#' + releaseNameId + '-row').slideDown();
        let slicedControlName = controlName.slice(0, -1);
        $('#' + slicedControlName + '-card').slideDown();
        setStatusProperties("#" + controlName + "-status", status);
        // gets the uri dynamically.
        let uri = VSS.getWebContext().account.uri + "/" + VSS.getWebContext().account.name + "/";   // https://mediahub.visualstudio.com/MediaHub
        // sets the release name link. 
        if (releaseId && releaseId > 0) {
            $("#" + controlName).attr("href", uri + "_releaseProgress?_a=release-pipeline-progress&releaseId=" + releaseId); //release-pipeline
        } else {
            $("#" + controlName).attr("href", "#");
        }
        // sets the dashboard title link.
        if (definitionId && definitionId > 0) {
            $("#" + slicedControlName + "-release-link").attr("href", uri + "_release?view=all&definitionId=" + definitionId);
        } else {
            $("#" + slicedControlName + "-release-link").attr("href", "#");
        }
        $("#" + controlName + "-link").click(function (e) { showWorkItemsListDialog(slicedControlName, buildId, releaseText); return false; });
    } else {
        $("#" + controlName).text("");
        $("#" + controlName + "-div").fadeOut();
        $("#" + controlName).attr("href", "#");
        $("." + releaseNameId + "-release-link").attr("href", "#");
        $("#" + controlName + "-link").click();
    }
}

/**
 * Shows the works items associated to the release.
 * @param {any} controlName The control name id.
 * @param {any} buildId The build id.
 * @param {any} titleName The release description.
 */
function showWorkItemsListDialog(controlName, buildId, titleName) {
    VSS.getService(VSS.ServiceIds.Dialog).then(function (dialogService) {
        var extensionCtx = VSS.getExtensionContext();
        // Build absolute contribution ID for dialogContent
        var contributionId = extensionCtx.publisherId + "." + extensionCtx.extensionId + ".work-items-list";

        let titleColor = $("#" + controlName + "-release-link span")[0].classList.item(1);

        // Show dialog (https://docs.microsoft.com/en-us/azure/devops/extend/reference/client/api/vss/references/vss_sdk_interfaces/ihostdialogoptions?view=azure-devops)
        var dialogOptions = {
            title: "Work Items List",
            width: 1000,
            height: 400,
            resizable: false,
            modal: true,
            buttons: null,
            urlReplacementObject: { id: buildId, releaseName: titleName, badgeColor: titleColor }
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

//function getNonServiceFabricInformation() {
//    addNewReleaseTableRow('BIZ', BIZ_CSS_ID, 'badge-warning');
//    addNewReleaseTableRow('OTT', OTT_CSS_ID, 'badge-success');
//    addNewReleaseTableRow('BOM', BOM_CSS_ID, 'badge-secondary');
//    addNewReleaseTableRow('OVX', OVX_CSS_ID, 'badge-primary');
//    addNewReleaseTableRow('Player', PLAYER_CSS_ID, 'badge-dark');
//    // NON SERVICE FABRIC RELEASES
//    //getReleases(BIZ_CSS_ID, 'MH BIZ', '\\1-BIZ');
//    //getReleases(OTT_CSS_ID, 'MH OTT', '\\2-OTT');
//    //getReleases(BOM_CSS_ID, 'MH BOM', '\\5-BOM');
//    //getReleases(OVX_CSS_ID, 'MH OVX', '\\7-OVX');
//    //getReleases(PLAYER_CSS_ID, 'MH Player', '\\4-Player');
//}

// Register callback to get called when initial handshake completed
VSS.ready(() => {

    // gets all the release configurations for service fabric.
    getReleaseDefinitions();

    VSS.notifyLoadSucceeded();

}); // end VSS
