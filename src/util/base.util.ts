import * as _ from 'lodash';

export function removeNullAndUndefined(obj: any) {
    return _.omitBy(obj, function(v) { return _.isUndefined(v) || _.isNull(v) });
}