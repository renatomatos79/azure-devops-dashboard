function Util(){ }

Util.createGUID = function() {
    function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
    }
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
}

Util.sortByKeyAsc = function(array, key) {
    return array.sort(function (a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

Util.sortByKeyDesc = function(array, key) {
    return array.sort(function (a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? +1 : ((x > y) ? -1 : 0));
    });
}

Util.CopyToClipboard = function(el) {    
    var body = document.body, range, sel;
    if (document.createRange && window.getSelection) {
        range = document.createRange();
        sel = window.getSelection();
        sel.removeAllRanges();
        try {
            range.selectNodeContents(el);
            sel.addRange(range);
        } catch (e) {
            range.selectNode(el);
            sel.addRange(range);
        }
    } else if (body.createTextRange) {
        range = body.createTextRange();
        range.moveToElementText(el);
        range.select();
    }
    document.execCommand("Copy")
}

Util.removeLastVersionControlNumber = function(version, truncateBuildNumber) {
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

Util.versionParts = function(releaseName) {
    let groups = releaseName.split(' ');
    let versionIndex = groups.length-1;
    let version = groups[versionIndex];
    return version.split('.').length;
}

/* 
        Compare versions
        Example for release "MH OTT 2.66.0.16"
        The version number is "2.66.0.16"
        The formated version number is 000000002.000000066.000000000.000000017

        MH OTT 2.66.0.9_Development 
*/
Util.getVersion = function(release) {
    let parts0 = release.split('_');
    let considerOnly = parts0[0];
    let parts1 = considerOnly.split(' ');
    let max = parts1.length - 1;
    let last = parts1[max];
    let parts2 = last.split('_');
    return (parts2.length > 0) ? parts2[0] : last;
}

Util.completeWithZero = function(content, count) {
    while (content.length < count) {
        content = '0' + content ;
    }
    return content;
}

Util.prepareToCompare = function(version, blockSize) {
    result = [];
    version.split(Util.GROUP_SYMBOL).forEach(p => {
        p = Util.completeWithZero(p, blockSize);
        result.push(p);
    });
    return result.join(Util.GROUP_SYMBOL) ;
}

Util.makeVersionComparable = function(version, groups, blockSize) {
    while (version.split(Util.GROUP_SYMBOL).length < groups) {
        version = version + '.0';
    }
    return Util.prepareToCompare(version, blockSize);
}

Util.converToComparableVersion = function(releaseText) {
    let _version = Util.getVersion(releaseText);
    let _prepare = Util.prepareToCompare(_version, Util.GROUP_LENGTH);
    let _compVersion = Util.makeVersionComparable(_prepare, Util.GROUP_SYMBOL_MAX_SIZE, Util.GROUP_LENGTH);
    return _compVersion;
}

Util.maxVersion = function(v1, v2) {
    return (v1 >= v2) ? v1 : v2;
}

Util.ENABLE_OUTPUT_LOG = "OUTPUT_LOG";
Util.AUTO_REFRESH = "AUTO_REFRESH";
Util.CHECKED_RELEASES = "CHECKED_RELEASES";
Util.FILTERED_CONTENT = "FILTERED_CONTENT";
Util.REFRESH_INTERVAL = "REFRESH_INTERVAL";
Util.DASHBOARD_TYPE = "DASHBOARD_TYPE";
// compare versions
Util.GROUP_SYMBOL = '.';
Util.GROUP_LENGTH = 9;
Util.GROUP_SYMBOL_MAX_SIZE = 6;
// comparable values to DESCENDING list
Util.MAX_DESCENDING_SORTED_VALUE = -1;
Util.EQUAL_SORTED_VALUE = 0;
Util.MIN_DESCENDING_SORTED_VALUE = +1;
