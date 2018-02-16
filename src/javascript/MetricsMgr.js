/* global Ext Deft _ com TsMetricsUtils Rally TsConstants TsSummaryRow*/
// TODO (tj) make level configurable
// TODO (tj) if at theme level are metric still a Feature Level?
Ext.define("TsMetricsMgr", function(Stores) {
    var selectedPortfolioItem;
    var metrics = {};

    return {
        buildMetrics: buildMetrics
    }

    /***
     * Public methods
     ***/
    function buildMetrics(records) {
        _.forEach(records, function(record) {
            if (record.get('_type').startsWith('portfolioitem')) {
                // Get features for this PI
                getDescendentsFromPis([record], [TsConstants.ROW_METRICS_PORTFOLIO_ITEM_TYPE])
                    .then(function(features) {
                        return Ext.create('TsFeatureGroup', {
                            PortfolioItem: record,
                            Features: features
                        });
                    })
                    .then(function(featureGroup) {
                        return onGroupsLoaded([featureGroup]);
                    })
                    .then(function(summaryRows) {
                        if (summaryRows.length > 1) {
                            console.error("Unexpected number of summary rows for a portfolio item");
                        }
                        return updateRecord(record, summaryRows[0]);
                    })
            }
        });
    }

    /***
     * Private methods
     ***/

    function updateRecord(record, summaryRow) {
        var summaryFields = TsSummaryRow.getFields();
        _.forEach(summaryFields, function(summaryField) {
            record.set(summaryField.name, summaryRow.get(summaryField.name));
        });
        return record;
    }

    function onGroupsLoaded(featureGroups) {

        var summaryRows = _.map(featureGroups, function(group) {

            var portfolioItem = group.get("PortfolioItem");

            var metrics = getMetrics(group);

            // Cycle times
            var allCycleTimesMedianDays = TsMetricsUtils.getMedian(metrics.allCycleTimes);
            var priorPeriodCycleTimesMedianDays = TsMetricsUtils.getMedian(metrics.priorPeriodCycleTimes);
            var currentPeriodCycleTimesMedianDays = TsMetricsUtils.getMedian(metrics.currentPeriodCycleTimes);
            var cycleTimesTrend = (currentPeriodCycleTimesMedianDays - priorPeriodCycleTimesMedianDays).toFixed(0);

            // WIP Ratio
            var uniqueProjectCount = _.unique(metrics.projects, '_ref').length;

            return Ext.create('TsSummaryRow', {
                FormattedID: portfolioItem.get('FormattedID'),
                Name: portfolioItem.get('Name'),
                CycleTimeMedian: allCycleTimesMedianDays,
                CycleTimeCurrentPeriod: currentPeriodCycleTimesMedianDays,
                CycleTimeTrend: cycleTimesTrend,
                ThroughputMedian: metrics.currentPeriodThroughput,
                ThroughputTrend: metrics.currentPeriodThroughput - metrics.priorPeriodThroughput,
                WipRatio: (metrics.workInProgress / (uniqueProjectCount * TsConstants.PER_PROJECT_WIP_LIMIT)).toFixed(2)
            });
        });
        return summaryRows;
    }

    function getMetrics(group) {
        var periodDays = Rally.getApp().getSetting(TsConstants.PERIOD_LENGTH_SETTING) || TsConstants.PERIOD_LENGTH_DEFAULT;
        var today = new Date();
        var priorPeriodStart = Ext.Date.subtract(today, Ext.Date.DAY, periodDays * 2);
        var currentPeriodStart = Ext.Date.subtract(today, Ext.Date.DAY, periodDays);
        var priorPeriodEnd = Ext.Date.subtract(currentPeriodStart, Ext.Date.DAY, 1);
        var currentPeriodEnd = Ext.Date.subtract(today, Ext.Date.DAY, 1);
        var result = _.reduce(group.get("Features"), function(accumulator, value) {

            // Cycle time and trends
            var actualStartDate = value.raw.ActualStartDate ? Ext.Date.parse(value.raw.ActualStartDate, 'c') : null;
            var actualEndDate = value.raw.ActualEndDate ? Ext.Date.parse(value.raw.ActualEndDate, 'c') : null;

            if (actualStartDate && actualEndDate) {
                var days = TsMetricsUtils.getDaysElapsed(actualStartDate, actualEndDate);
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
