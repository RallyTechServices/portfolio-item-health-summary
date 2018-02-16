/* global Ext _ */
Ext.define('TsMetricsUtils', function(MetricsUtils) {
    return {
        statics: {
            getMedian: getMedian,
            getDaysElapsed: getDaysElapsed,
            startsWith: startsWith,
            //toPercentString: toPercentString
        }
    }

    function startsWith(string) {
        String.prototype.startsWith = function(search, pos) {
                return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
            };
    }

    function getMedian(values) {
        var sorted = _.unique(_.sortBy(values));
        var count = sorted.length;
        var result = undefined;
        if (count > 0) {
            if ((count % 2) == 0) {
                // Even number of items, return the average of the middle two values
                result = (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
            }
            else {
                result = sorted[Math.floor(count / 2)];
            }
        }

        return Math.ceil(result); // round up to whole days
    }

    function getDaysElapsed(startDateStr, endDateStr) {
        var startDate = Ext.Date.parse(startDateStr, 'c', true);
        var endDate = Ext.Date.parse(endDateStr, 'c', true);

        // TODO (tj) Assuming doesn't take 1 year or more to complete
        var result = undefined;
        var startDay = Ext.Date.getDayOfYear(startDate);
        var endDay = Ext.Date.getDayOfYear(endDate);
        if (endDay >= startDay) {
            // The simple case, completed in the same year
            result = endDay - startDay;
        }
        else {
            // Crossed a year boundary
            var daysInStartYear = Ext.Date.isLeapYear(startDate) ? 365 : 364;
            result = endDay + daysInStartYear - startDay;
        }
        return result;
    }

    /*
    function toPercentString(value) {
        if (isNaN(value)) {
            value = "Unknown"
        }
        else {
            value = ((value - 1) * 100).toFixed(0)
        }

        if (value > 0) {
            value = "+" + value;
        }

        return value + "%"
    }
    */
});
