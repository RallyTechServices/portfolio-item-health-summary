/* global Ext CArABU _ com Rally TsConstants TsMetricsMgr TsMetricsUtils TsSvgIcons */
Ext.define("com.ca.TechnicalServices.PortfolioItemHealthSummary", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items: [{
            xtype: 'form',
            itemId: 'controlsArea',
            padding: '0 0 10 0',
            bodyPadding: 5,
        },
        {
            xtype: 'container',
            itemId: 'gridArea'
        },
    ],

    integrationHeaders: {
        name: "com.ca.TechnicalServices.PortfolioItemHealthSummary"
    },

    selectedObjectId: undefined,
    showDonePis: true,

    config: {
        defaultSettings: {
            PERIOD_LENGTH: 30,
            INCLUDED_PROJECT_TEAM_TYPES: 'Agile', // The rallyfieldvaluecombobox saves settings as comma separated string
            PER_TEAM_WIP_MAX: 4
        }
    },

    launch: function() {
        this.metricsMgr = new TsMetricsMgr();
        this.down('#controlsArea').add({
            xtype: 'rallysearchcombobox',
            storeConfig: {
                model: TsConstants.SELECTABLE_PORTFOLIO_ITEM_TYPE,
                autoLoad: true,
            },
            fieldLabel: TsConstants.SELECTABLE_PORTFOLIO_ITEM_TYPE_LABEL,
            listeners: {
                scope: this,
                change: function(control, newValue) {
                    //this.metricsMgr.onPortfolioItemChange(control.getRecord());
                    this.selectedObjectId = control.getRecord().get('ObjectID');
                    this.addGrid();
                }
            }
        });
        this.down('#controlsArea').add({
            xtype: 'rallycheckboxfield',
            fieldLabel: TsConstants.LABELS.SHOW_DONE_PIS,
            value: this.showDonePis,
            listeners: {
                scope: this,
                change: function(checkbox, newValue, oldValue) {
                    if (newValue != oldValue) {
                        this.showDonePis = newValue;
                        this.addGrid()
                    }
                }
            }
        });
    },

    addGrid: function() {
        var periodDays = Rally.getApp().getSetting(TsConstants.SETTINGS.PERIOD_LENGTH);
        var childFilters;
        var topLevelFilters = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Parent.ObjectID',
            value: this.selectedObjectId
        });

        if (this.showDonePis == false) {
            // Don't show DONE items below themes
            var childQueries = [{
                property: 'ActualEndDate',
                value: 'null',
            }];
            _.forEach(TsConstants.SETTINGS.PI_TYPES_ALWAYS_SHOWN, function(type) {
                childQueries.push({
                    property: 'PortfolioItemType.TypePath',
                    operator: '!=',
                    value: type
                });
            });
            childFilters = Rally.data.wsapi.Filter.and(childQueries);
        }

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: ['PortfolioItem/Theme'],
            autoLoad: true,
            enableHierarchy: true,
            filters: topLevelFilters,
            childFilters: childFilters, // See Overrides.js
            listeners: {
                scope: this,
                load: function(store, node, records) {
                    this.metricsMgr.buildMetrics(records)
                }
            },
        }).then({
            scope: this,
            success: function(store) {
                // TODO (tj) use rallygridboard to get filtering plugins
                var gridArea = this.down('#gridArea');
                gridArea.removeAll();
                gridArea.add({
                    xtype: 'rallytreegrid',
                    store: store,
                    enableBulkEdit: false,
                    enableRanking: false,
                    enableEditing: false,
                    enableScheduleStateClickable: false,
                    enabledValidationUi: false,
                    shouldShowRowActionsColumn: false,
                    columnCfgs: [{
                            text: 'Name',
                            dataIndex: 'Name',
                        },
                        {
                            text: '% Complete by Story Points',
                            dataIndex: 'PercentDoneByStoryPlanEstimate',
                        },
                        {
                            text: '% Complete by Story Count',
                            dataIndex: 'PercentDoneByStoryCount'
                        },
                        {
                            text: 'Cycle Time - Overall Median (Days)',
                            xtype: 'templatecolumn',
                            tpl: new Ext.XTemplate(''),
                            scope: this,
                            renderer: function(value, meta, record) {
                                return this.nanRenderer(record, 'CycleTimeMedian');
                            }
                        },
                        {
                            text: 'Cycle Time - Last ' + periodDays + ' Days',
                            xtype: 'templatecolumn',
                            tpl: new Ext.XTemplate(''),
                            scope: this,
                            renderer: function(value, meta, record) {
                                return this.nanRenderer(record, 'CycleTimeCurrentPeriod');
                            }
                        },
                        {
                            text: 'Cycle Time - ' + periodDays + ' Day Trend',
                            tpl: '{CycleTimeTrend}',
                            xtype: 'templatecolumn',
                            scope: this,
                            renderer: function(value, meta, record) {
                                return this.cycleTimeTrendRenderer(record, 'CycleTimeTrend');
                            }
                        },
                        {
                            text: 'Throughput - Last ' + periodDays + ' Days',
                            xtype: 'templatecolumn',
                            tpl: new Ext.XTemplate(''),
                            scope: this,
                            renderer: function(value, meta, record) {
                                return this.nanRenderer(record, 'ThroughputMedian');
                            }

                        },
                        {
                            text: 'Throughput - ' + periodDays + ' Day Trend',
                            tpl: '{ThroughputTrend}',
                            xtype: 'templatecolumn',
                            scope: this,
                            renderer: function(value, meta, record) {
                                return this.throughputTrendRenderer(record, 'ThroughputTrend');
                            }
                        },
                        {
                            text: TsConstants.LABELS.WIP,
                            xtype: 'templatecolumn',
                            tpl: new Ext.XTemplate(''),
                            scope: this,
                            renderer: function(value, meta, record) {
                                return this.wipRenderer(record);
                            }
                        }
                    ]
                });
            }
        });
    },

    wipRenderer: function(record) {
        var value = record.get('FeatureWipAverage');
        var result = value;

        if (TsMetricsUtils.showMetrics(record) == false) {
            result = '--'
        }
        else {
            if (value === undefined) {
                result = 'Loading...';
            }
            else if (isNaN(value)) {
                result = '--'
            }
            else if (value == Infinity) {
                result = 0;
            }
            else if (value > 0 && value < 1) {
                result = 1;
            }
            else {
                result = Math.round(value);
                if (result >= this.getSetting(TsConstants.SETTINGS.PER_TEAM_WIP_MAX)) {
                    result = '<div class="colorcell caution">' + result + '</div>';
                }
            }
        }
        return result;
    },

    nanRenderer: function(record, dataIndex) {
        var value = record.get(dataIndex);
        var result = value;

        if (TsMetricsUtils.showMetrics(record) == false) {
            result = '--'
        }
        else {
            if (value === undefined) {
                result = 'Loading...';
            }
            else if (isNaN(value)) {
                result = '--'
            }
        }
        return result;
    },

    cycleTimeTrendRenderer: function(record, dataIndex) {
        var value = record.get(dataIndex);
        var result = value;

        if (TsMetricsUtils.showMetrics(record) == false) {
            result = '--'
        }
        else {
            if (value === undefined) {
                result = 'Loading...';
            }
            else if (value > 0) {
                result = this.getEmojiDiv('worse') + value + ' days longer'
            }
            else if (value < 0) {
                result = this.getEmojiDiv('better') + Math.abs(value) + ' days shorter'
            }
            else if (value == 0) {
                result = this.getEmojiDiv('neutral') + 'Unchanged'
            }
            else {
                result = '--'
            }
        }
        return result;
    },

    getEmojiDiv: function(name) {
        return '<div class="emojicell ' + name + '">' + TsSvgIcons[name] + '</div>'
    },

    throughputTrendRenderer: function(record, dataIndex) {
        var value = record.get(dataIndex);
        var result = value;

        if (TsMetricsUtils.showMetrics(record) == false) {
            result = '--'
        }
        else {
            if (value === undefined) {
                result = 'Loading...';
            }
            else if (value > 0) {
                result = this.getEmojiDiv('better') + value + ' more Features'
            }
            else if (value < 0) {
                result = this.getEmojiDiv('worse') + Math.abs(value) + ' fewer Features'
            }
            else if (value == 0) {
                result = this.getEmojiDiv('neutral') + 'Unchanged'
            }
            else {
                result = '--'
            }
        }
        return result;
    },

    getSettingsFields: function() {
        return [{
                name: TsConstants.SETTINGS.PERIOD_LENGTH,
                xtype: 'rallynumberfield',
                allowBlank: false,
                allowDecimals: false,
                allowOnlyWhitespace: false,
                minValue: 1,
                label: 'Trend Time Period (Days)',
                labelWidth: 300
            },
            {
                name: TsConstants.SETTINGS.INCLUDED_PROJECT_TEAM_TYPES,
                xtype: 'rallyfieldvaluecombobox',
                itemId: TsConstants.SETTINGS.INCLUDED_PROJECT_TEAM_TYPES,
                model: 'Project',
                field: 'c_TeamType',
                allowBlank: false,
                allowNoEntry: true,
                editable: false,
                multiSelect: true,
                delimiter: ',',
                listeners: {
                    ready: function(combobox) {
                        var store = combobox.getStore();
                        store.on('load', function(store, records, success) {
                            if (records.length) {
                                var currentSetting = Rally.getApp().getSetting(TsConstants.SETTINGS.INCLUDED_PROJECT_TEAM_TYPES).split(',');
                                combobox.setValue(currentSetting);
                            }
                        });
                    }
                },
                readyEvent: 'ready',
                label: 'Project Team Types to include in "' + TsConstants.LABELS.WIP + '" calculation.',
                labelWidth: 300
            },
            {
                name: TsConstants.SETTINGS.PER_TEAM_WIP_MAX,
                xtype: 'rallynumberfield',
                allowBlank: false,
                allowDecimals: false,
                allowOnlyWhitespace: false,
                minValue: 1,
                label: 'Max "' + TsConstants.LABELS.WIP + '"',
                labelWidth: 300
            },
        ];
    },
});
