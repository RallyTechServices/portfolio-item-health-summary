/* global Ext Deft _ com tsMetricsUtils Rally */
// TODO (tj) make level configurable
// TODO (tj) if at theme level are metric still a Feature Level?
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
            CYCLE_TIME_TREND_DAYS: 30,
            MGMT_PROJECT_NAMES_SETTING: 'MGMT_PROJECT_NAMES_SETTING',
            ROW_PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Epic',
            ROW_METRICS_PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Feature',
        },
        init: init,
        onPortfolioItemChange: onPortfolioItemChange
    }

    /***
     * Private methods
     ***/
    /*
    function loadPortfolioItemStore() {
        if (selectedPortfolioItem) {

            var filters = Rally.data.wsapi.Filter.and([{
                    property: 'Parent',
                    operator: '!=',
                    value: null
                },
                {
                    property: 'Parent.Parent',
                    value: selectedPortfolioItem
                }
            ]);

            var mgmtProjectNamesSetting = Rally.getApp().getSetting(Stores.MGMT_PROJECT_NAMES_SETTING);
            if (mgmtProjectNamesSetting) {
                var projectNameQueries = mgmtProjectNamesSetting.split('\n').map(function(value) {
                    return {
                        property: 'Project.Name',
                        operator: '!=',
                        value: value
                    }
                });
                if (projectNameQueries.length) {
                    var projectNameFilters = Rally.data.wsapi.Filter.or(projectNameQueries);
                    filters.and(projectNameFilters)
                }
            }

            Ext.data.StoreManager.lookup(Stores.PORTFOLIO_ITEM_STORE_ID).load({
                filters: filters
            });
        }
    }
    */

    function onGroupsLoaded(featureGroups) {

        var data = _.map(featureGroups, function(group) {

            var portfolioItem = group.get("PortfolioItem");

            var metrics = getMetrics(group);

            // Cycle times
            var allCycleTimesMedianDays = tsMetricsUtils.getMedian(metrics.allCycleTimes);
            var priorPeriodCycleTimesMedianDays = tsMetricsUtils.getMedian(metrics.priorPeriodCycleTimes);
            var currentPeriodCycleTimesMedianDays = tsMetricsUtils.getMedian(metrics.currentPeriodCycleTimes);
            var cycleTimesTrend = (currentPeriodCycleTimesMedianDays - priorPeriodCycleTimesMedianDays).toFixed(0);

            // WIP Ratio
            var uniqueProjectCount = _.unique(metrics.projects, '_ref').length;

            return Ext.create('com.ca.TechnicalServices.SummaryRow', {
                FormattedID: portfolioItem.get('FormattedID'),
                Name: portfolioItem.get('Name'),
                PercentCompleteByStoryPoints: metrics.acceptedLeafStoryPlanEstimateTotal / (metrics.leafStoryPlanEstimateTotal || 1) * 100,
                PercentCompleteByStoryCount: metrics.acceptedLeafStoryCount / (metrics.leafStoryCount || 1) * 100,
                RedYellowGreen: getRedYellowGreen(group),
                CycleTimeMedian: allCycleTimesMedianDays,
                CycleTimeCurrentPeriod: currentPeriodCycleTimesMedianDays,
                CycleTimeTrend: cycleTimesTrend,
                ThroughputMedian: metrics.currentPeriodThroughput,
                ThroughputTrend: metrics.currentPeriodThroughput - metrics.priorPeriodThroughput,
                WipRatio: (metrics.workInProgress / (uniqueProjectCount * Stores.PER_PROJECT_WIP_LIMIT)).toFixed(2)
            });
        });
        Ext.data.StoreManager.lookup(Stores.GRID_STORE_ID).loadData(data);
    }

    function getMetrics(group) {
        var today = new Date();
        var priorPeriodStart = Ext.Date.subtract(today, Ext.Date.DAY, Stores.CYCLE_TIME_TREND_DAYS * 2);
        var currentPeriodStart = Ext.Date.subtract(today, Ext.Date.DAY, Stores.CYCLE_TIME_TREND_DAYS);
        var priorPeriodEnd = Ext.Date.subtract(currentPeriodStart, Ext.Date.DAY, 1);
        var currentPeriodEnd = Ext.Date.subtract(today, Ext.Date.DAY, 1);
        var result = _.reduce(group.get("Features"), function(accumulator, value) {

            // Percent complete by story points
            accumulator.acceptedLeafStoryPlanEstimateTotal += value.get('AcceptedLeafStoryPlanEstimateTotal') || 0;
            accumulator.leafStoryPlanEstimateTotal += value.get('LeafStoryPlanEstimateTotal') || 0;

            // Percent complete by story count
            accumulator.acceptedLeafStoryCount += value.get('AcceptedLeafStoryCount') || 0;
            accumulator.leafStoryCount += value.get('LeafStoryCount') || 0;

            // Cycle time and trends
            var actualStartDate = value.raw.ActualStartDate ? Ext.Date.parse(value.raw.ActualStartDate, 'c') : null;
            var actualEndDate = value.raw.ActualEndDate ? Ext.Date.parse(value.raw.ActualEndDate, 'c') : null;

            if (actualStartDate && actualEndDate) {
                var days = tsMetricsUtils.getDaysElapsed(actualStartDate, actualEndDate);
                accumulator.allCycleTimes.push(days);

                if (Ext.Date.between(actualEndDate, priorPeriodStart, priorPeriodEnd)) {
                    accumulator.priorPeriodCycleTimes.push(days);
                    accumulator.priorPeriodThroughput++;
                }
                else if (Ext.Date.between(actualEndDate, currentPeriodStart, currentPeriodEnd)) {
                    accumulator.currentPeriodCycleTimes.push(days);
                    accumulator.currentPeriodThroughput++;
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
            priorPeriodThroughput: 0,
            currentPeriodThroughput: 0,
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
        // Store to contain row data computed from portfolio items
        Ext.create('Rally.data.custom.Store', {
            storeId: Stores.GRID_STORE_ID,
            model: 'com.ca.TechnicalServices.SummaryRow'
        });
    }

    function onPortfolioItemChange(newValue) {
        selectedPortfolioItem = newValue;
        return getDescendentsFromPis([selectedPortfolioItem], [Stores.ROW_PORTFOLIO_ITEM_TYPE])
            .then(function(rows) {
                var promises = _.map(rows, function(row) {
                    return getDescendentsFromPis([row], [Stores.ROW_METRICS_PORTFOLIO_ITEM_TYPE])
                        .then(function(features) {
                            return Ext.create('com.ca.TechnicalServices.FeatureGroup', {
                                PortfolioItem: row,
                                Features: features
                            });
                        });
                });
                return Deft.promise.Promise.all(promises).then(onGroupsLoaded)
            });
    }

    function getDescendentsFromPis(portfolioItems, descendentTypes) {
        var deferred = Ext.create('Deft.Deferred');
        var portfolioOids = _.map(portfolioItems, function(item) {
            return item.get('ObjectID');
        });

        if (portfolioOids.length < 1) {
            deferred.reject("No portfolio items set");
        }
        else {
            // User has selected individual portfolio items. Filter out features
            // not in those PIs
            var filters = [{
                    property: '_TypeHierarchy',
                    operator: 'in',
                    value: descendentTypes
                },
                {
                    property: '__At',
                    value: 'current'
                },
                {
                    property: '_ItemHierarchy',
                    operator: 'in',
                    value: portfolioOids
                }
                // TODO (tj) Filter "mgmt" projects
            ];

            Ext.create('Rally.data.lookback.SnapshotStore', {
                autoLoad: true,
                limit: Infinity,
                filters: filters,
                fetch: [
                    'FormattedID',
                    'Name',
                    'LeafStoryCount',
                    'AcceptedLeafStoryCount',
                    'LeafStoryPlanEstimateTotal',
                    'AcceptedLeafStoryPlanEstimateTotal',
                    'PercentCompleteByStoryCount',
                    'PercentCompleteByStoryPlanEstimate',
                    'ActualStartDate',
                    'ActualEndDate',
                    'Project',
                    'PortfolioItemType',
                    'PortfolioItemTypeName'
                ],
                listeners: {
                    load: function(store, data, success) {
                        if (!success) {
                            deferred.reject("Unable to load PortfolioItem IDs " + portfolioOids);
                        }
                        else {
                            deferred.resolve(data);
                        }
                    }
                }
            });
        }
        return deferred.getPromise();
    }

});
