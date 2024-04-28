import path from "node:path";

function findValueInMap<T, U>(map: Map<T, U>, searchIndex: T) {
    for (const [key, value] of map) {
        // @ts-ignore
        const keyMatches = Object.keys(searchIndex).every((prop) => key[prop] === searchIndex[prop]);

        if (keyMatches) {
            return value;
        }
    }
    return null;
}

function findAndRemoveValueInMap<T, U>(map: Map<T, U>, searchIndex: T) {
    for (const [key, value] of map) {
        // @ts-ignore
        const keyMatches = Object.keys(searchIndex).every((prop) => key[prop] === searchIndex[prop]);

        if (keyMatches) {
            map.delete(key);
            return value;
        }
    }
    return null;
}

function matchSpecialRoute(routePattern: string, requestUrl: string): boolean {
    const routeSegments = routePattern.split('/');
    const urlSegments = requestUrl.split('/');

    if (routeSegments.length !== urlSegments.length) {
        return false;
    }

    for (let i = 0; i < routeSegments.length; i++) {
        const routeSegment = routeSegments[i];
        const urlSegment = urlSegments[i];

        if (routeSegment.startsWith(':')) {
            // It's a parameter, so continue to the next segment
            continue;
        }

        if (routeSegment !== urlSegment) {
            // The segments don't match
            return false;
        }
    }

    return true;
}

function isSubPath(mainPath: string, subPath: string) {
    // Normalize the paths to handle different formats and separators
    mainPath = path.normalize(mainPath);
    subPath = path.normalize(subPath);

    // Check if the subPath starts with the mainPath
    return subPath.startsWith(mainPath);
}

export {
    findValueInMap,
    findAndRemoveValueInMap,
    matchSpecialRoute,
    isSubPath
}