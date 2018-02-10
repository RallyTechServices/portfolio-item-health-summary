/* global Ext _ com */
Ext.define("com.ca.TechnicalServices.Stores", function(Stores) {
    var selectedRelease;
    var selectedPortfolioItem;

    return {
        statics: {
            PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Feature',
            PORTFOLIO_ITEM_STORE_ID: 'PORTFOLIO_ITEM_STORE_ID',
            GRID_STORE_ID: 'GRID_STORE_ID',
        },
        init: init,
        onReleaseChange: onReleaseChange,
        onPortfolioItemChange: onPortfolioItemChange
    }

    /***
     * Private methods
     ***/
    function loadPortfolioItemStore() {
        if (selectedRelease && selectedPortfolioItem) {
            Ext.data.StoreManager.lookup(Stores.PORTFOLIO_ITEM_STORE_ID).load({
                filters: [{
                        property: 'Parent.Parent',
                        value: selectedPortfolioItem
                    },
                    {
                        property: 'Release',
                        value: selectedRelease
                    }
                ]
            });
        }
    }

    function onPortfolioItemStoreLoad(store, records, successful) {
        var data = _.map(store.getGroups(), function(group) {
            return Ext.create('com.ca.TechnicalServices.SummaryRow', {
                FormattedID: group.name.FormattedID,
                Name: group.name.Name,
                PercentCompleteByStoryPoints: getPercentCompleteByStoryPoints(group),
                PercentCompleteByStoryCount: getPercentCompleteByStoryCount(group),
                RedYellowGreen: getRedYellowGreen(group),
                CycleTimeMedian: getCycleTimeMedian(group),
                CycleTimeTrend: getCycleTimeTrend(group),
                ThroughputMedian: getThroughputMedian(group),
                ThroughputTrend: getThroughputTrend(group),
                WipRatio: getWipRatio(group)
            });
        });
        Ext.data.StoreManager.lookup(Stores.GRID_STORE_ID).loadData(data);
    }

    function getPercentCompleteByStoryPoints(group) {
        var totals = _.reduce(group.children, function(accumulator, value) {
            accumulator.acceptedLeafStoryPlanEstimateTotal += value.get('AcceptedLeafStoryPlanEstimateTotal') || 0;
            accumulator.leafStoryPlanEstimateTotal += value.get('LeafStoryPlanEstimateTotal') || 0;
            return accumulator;
        }, {
            acceptedLeafStoryPlanEstimateTotal: 0,
            leafStoryPlanEstimateTotal: 0
        });
        return totals.acceptedLeafStoryPlanEstimateTotal / (totals.leafStoryPlanEstimateTotal || 1) * 100;
    }

    function getPercentCompleteByStoryCount(group) {
        var totals = _.reduce(group.children, function(accumulator, value) {
            accumulator.acceptedLeafStoryCount += value.get('AcceptedLeafStoryCount') || 0;
            accumulator.leafStoryCount += value.get('LeafStoryCount') || 0;
            return accumulator;
        }, {
            acceptedLeafStoryCount: 0,
            leafStoryCount: 0
        });
        return totals.acceptedLeafStoryCount / (totals.leafStoryCount || 1) * 100;
    }

    function getRedYellowGreen(group) {
        // TODO (tj) See https://help.rallydev.com/track-portfolio-items#coloralg
        return "TODO"
    }

    function getCycleTimeMedian(group) {
        var totals = _.reduce(group.children, function(accumulator, value) {
            var actualStartDate = value.get('ActualStartDate');
            var actualEndDate = value.get('ActualEndDate');
            if (actualStartDate && actualEndDate) {
                var days = getDaysElapsed(actualStartDate, actualEndDate);
                accumulator.push(days);
            }
            return accumulator;
        }, []);
        return getMedian(totals);
    }

    function getMedian(values) {
        var sorted = Ext.Array.sort(values);
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

    function getCycleTimeTrend(group) {
        return "TODO";
    }

    function getThroughputMedian(group) {
        return -1;
    }

    function getThroughputTrend(group) {
        return "TODO";
    }

    function getWipRatio(group) {
        return -1;
    }


    /***
     * Public methods
     ***/
    function init() {
        // Store to load portfolio item data
        Ext.create('Rally.data.wsapi.Store', {
            storeId: Stores.PORTFOLIO_ITEM_STORE_ID,
            model: Stores.PORTFOLIO_ITEM_TYPE,
            listeners: {
                scope: this
            },
            fetch: [
                'FormattedID',
                'Name',
                'Parent',
                'LeafStoryCount',
                'AcceptedLeafStoryCount',
                'LeafStoryPlanEstimateTotal',
                'AcceptedLeafStoryPlanEstimateTotal',
                'PercentCompleteByStoryCount',
                'PercentCompleteByStoryPlanEstimate',
                'ActualStartDate',
                'ActualEndDate',
            ],
            groupField: 'Parent',
            listeners: {
                scope: this,
                load: onPortfolioItemStoreLoad
            }
        });

        // Store to contain row data computed from portfolio items
        Ext.create('Rally.data.custom.Store', {
            storeId: Stores.GRID_STORE_ID,
            model: 'com.ca.TechnicalServices.SummaryRow'
        });
    }

    function onReleaseChange(newValue) {
        selectedRelease = newValue;
        loadPortfolioItemStore();
    }

    function onPortfolioItemChange(newValue) {
        selectedPortfolioItem = newValue;
        loadPortfolioItemStore();
    }
});
