/* global Ext _ com tsMetricsUtils */
Ext.define("com.ca.TechnicalServices.Stores", function(Stores) {
    var selectedPortfolioItem;

    return {
        require: [
            'tsMetricsUtils'
        ],
        statics: {
            PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Feature',
            PORTFOLIO_ITEM_STORE_ID: 'PORTFOLIO_ITEM_STORE_ID',
            GRID_STORE_ID: 'GRID_STORE_ID',
            PER_PROJECT_WIP_LIMIT: 3,
            CYCLE_TIME_TREND_DAYS: 30
        },
        init: init,
        onPortfolioItemChange: onPortfolioItemChange
    }

    /***
     * Private methods
     ***/
    function loadPortfolioItemStore() {
        if (selectedPortfolioItem) {
            Ext.data.StoreManager.lookup(Stores.PORTFOLIO_ITEM_STORE_ID).load({
                filters: [{
                    property: 'Parent.Parent',
                    value: selectedPortfolioItem
                }]
            });
        }
    }

    function onPortfolioItemStoreLoad(store, records, successful) {
        var data = _.map(store.getGroups(), function(group) {
            var metrics = reduceGroup(group);
            var allCycleTimesMedianDays = tsMetricsUtils.getMedian(metrics.allCycleTimes);
            var priorPeriodCycleTimesMedianDays = tsMetricsUtils.getMedian(metrics.priorPeriodCycleTimes);
            var currentPeriodCycleTimesMedianDays = tsMetricsUtils.getMedian(metrics.currentPeriodCycleTimes);
            var cycleTimesTrend = (currentPeriodCycleTimesMedianDays - priorPeriodCycleTimesMedianDays).toFixed(0);
            var throughputTrend = (1 / currentPeriodCycleTimesMedianDays - 1 / priorPeriodCycleTimesMedianDays).toFixed(4);

            var uniqueProjectCount = _.unique(metrics.projects, '_ref').length;

            return Ext.create('com.ca.TechnicalServices.SummaryRow', {
                FormattedID: group.name.FormattedID,
                Name: group.name.Name,
                PercentCompleteByStoryPoints: metrics.acceptedLeafStoryPlanEstimateTotal / (metrics.leafStoryPlanEstimateTotal || 1) * 100,
                PercentCompleteByStoryCount: metrics.acceptedLeafStoryCount / (metrics.leafStoryCount || 1) * 100,
                RedYellowGreen: getRedYellowGreen(group),
                CycleTimeMedian: allCycleTimesMedianDays,
                CycleTimeTrend: cycleTimesTrend,
                ThroughputMedian: (1 / allCycleTimesMedianDays).toFixed(4),
                ThroughputTrend: throughputTrend,
                WipRatio: (metrics.workInProgress / (uniqueProjectCount * Stores.PER_PROJECT_WIP_LIMIT)).toFixed(2)
            });
        });
        Ext.data.StoreManager.lookup(Stores.GRID_STORE_ID).loadData(data);
    }

    function reduceGroup(group) {
        var today = new Date();
        var priorPeriodStart = Ext.Date.subtract(today, Ext.Date.DAY, Stores.CYCLE_TIME_TREND_DAYS * 2);
        var currentPeriodStart = Ext.Date.subtract(today, Ext.Date.DAY, Stores.CYCLE_TIME_TREND_DAYS);
        var priorPeriodEnd = Ext.Date.subtract(currentPeriodStart, Ext.Date.DAY, 1);
        var currentPeriodEnd = Ext.Date.subtract(today, Ext.Date.DAY, 1);
        var result = _.reduce(group.children, function(accumulator, value) {

            // Percent complete by story points
            accumulator.acceptedLeafStoryPlanEstimateTotal += value.get('AcceptedLeafStoryPlanEstimateTotal') || 0;
            accumulator.leafStoryPlanEstimateTotal += value.get('LeafStoryPlanEstimateTotal') || 0;

            // Percent complete by story count
            accumulator.acceptedLeafStoryCount += value.get('AcceptedLeafStoryCount') || 0;
            accumulator.leafStoryCount += value.get('LeafStoryCount') || 0;

            // Cycle time and trends
            var actualStartDate = value.get('ActualStartDate');
            var actualEndDate = value.get('ActualEndDate');
            if (actualStartDate && actualEndDate) {
                var days = tsMetricsUtils.getDaysElapsed(actualStartDate, actualEndDate);
                accumulator.allCycleTimes.push(days);

                if (Ext.Date.between(actualEndDate, priorPeriodStart, priorPeriodEnd)) {
                    accumulator.priorPeriodCycleTimes.push(days);
                }
                else if (Ext.Date.between(actualEndDate, currentPeriodStart, currentPeriodEnd)) {
                    accumulator.currentPeriodCycleTimes.push(days);
                }
            }

            // WIP
            if (actualStartDate && !actualEndDate) {
                accumulator.workInProgress++;
            }

            accumulator.projects.push(value.get('Project'))

            return accumulator;
        }, {
            acceptedLeafStoryPlanEstimateTotal: 0,
            leafStoryPlanEstimateTotal: 0,
            acceptedLeafStoryCount: 0,
            leafStoryCount: 0,
            allCycleTimes: [],
            priorPeriodCycleTimes: [],
            currentPeriodCycleTimes: [],
            workInProgress: 0,
            projects: [],
        });
        return result;
    }


    function getRedYellowGreen(group) {
        // TODO (tj) See https://help.rallydev.com/track-portfolio-items#coloralg
        return "TODO"
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
                'Project'
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

    function onPortfolioItemChange(newValue) {
        selectedPortfolioItem = newValue;
        loadPortfolioItemStore();
    }
});
