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
            if (TsMetricsUtils.showMetrics(record)) {
                // Get features for this PI
                getLeafProjectsHash(record)
                    .then(function(leafProjectsHash) {
                        var recordOid = record.get('ObjectID');
                        return getDescendents([recordOid], [TsConstants.ROW_METRICS_PORTFOLIO_ITEM_TYPE])
                            .then(function(features) {
                                return Ext.create('TsFeatureGroup', {
                                    PortfolioItem: record,
                                    Features: features,
                                    LeafProjectsHash: leafProjectsHash || {}
                                });
                            })
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
            var featureWipAverage = 0;
            var leafProjectsHash = group.get('LeafProjectsHash');
            if (leafProjectsHash) {
                featureWipAverage = metrics.workInProgress / Object.keys(leafProjectsHash).length;
            }

            return Ext.create('TsSummaryRow', {
                CycleTimeMedian: allCycleTimesMedianDays,
                CycleTimeCurrentPeriod: currentPeriodCycleTimesMedianDays,
                CycleTimeTrend: cycleTimesTrend,
                ThroughputMedian: metrics.currentPeriodThroughput,
                ThroughputTrend: metrics.currentPeriodThroughput - metrics.priorPeriodThroughput,
                FeatureWipAverage: featureWipAverage
            });
        });
        return summaryRows;
    }

    function getMetrics(group) {
        var periodDays = Rally.getApp().getSetting(TsConstants.SETTINGS.PERIOD_LENGTH) || TsConstants.SETTINGS.PERIOD_LENGTH;
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
                //var projectOid = value.get('Project');
                //if (group.get('LeafProjectsHash').hasOwnProperty(projectOid)) {
                accumulator.workInProgress++;
                //}
            }

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

    /***
     * Public methods
     ***/
    function getLeafProjectsHash(record) {
        var result = {};
        var objectId = record.get('Project').ObjectID;
        var deferred = Ext.create('Deft.Deferred');

        if (!record.get('Project').Children || record.get('Project').Children.Count == 0) {
            // This project IS a leaf project, include it as the count
            result[record.get('Project').ObjectID] = record.get('Project').Name;
            deferred.resolve(result);
        }
        else {
            var includedTeamTypes = Rally.getApp().getSetting(TsConstants.SETTINGS.INCLUDED_PROJECT_TEAM_TYPES).split(',');
            var teamTypesFilters = Rally.data.wsapi.Filter.or(_.map(includedTeamTypes, function(teamType) {
                return {
                    property: 'c_TeamType',
                    value: teamType
                }
            }));

            var projectFilters = Rally.data.wsapi.Filter.or(_.map(_.range(1, 10), function(depth) {
                    var parents = [];
                    do {
                        parents.push('Parent');
                    } while (parents.length < depth);

                    return {
                        property: parents.join('.') + '.ObjectID',
                        value: objectId
                    }
                }))
                .and({
                    property: 'Children.ObjectID',
                    value: null
                });

            Ext.create('Rally.data.wsapi.Store', {
                model: 'Project',
                autoLoad: true,
                filters: teamTypesFilters.and(projectFilters),
                fetch: ['Children', 'Name', 'c_TeamType'],
                listeners: {
                    scope: this,
                    load: function(store, data, success) {
                        if (!success) {
                            deferred.reject("Unable to load child projects for Object ID " + objectId);
                        }
                        else {
                            _.forEach(data, function(project) {
                                result[project.get('ObjectID')] = project.get('Name')
                            });
                            deferred.resolve(result);
                        }
                    }
                }
            });
        }
        return deferred.getPromise();
    }

    function getDescendents(objectIds, descendentTypes, extraFilters) {
        var deferred = Ext.create('Deft.Deferred');

        var filters = extraFilters;
        if (!filters) {
            filters = [];
        }
        // User has selected individual portfolio items. Filter out features
        // not in those PIs
        filters.push({
            property: '_TypeHierarchy',
            operator: 'in',
            value: descendentTypes
        });
        filters.push({
            property: '__At',
            value: 'current'
        });
        filters.push({
            property: '_ItemHierarchy',
            operator: 'in',
            value: objectIds
        });

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
                        deferred.reject("Unable to load descendents for Object IDs " + objectIds);
                    }
                    else {
                        deferred.resolve(data);
                    }
                }
            }
        });

        return deferred.getPromise();
    }

});
