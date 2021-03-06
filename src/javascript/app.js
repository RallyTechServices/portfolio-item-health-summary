/* global Ext CArABU _ com Rally TsConstants TsMetricsMgr TsMetricsUtils TsSvgIcons */
Ext.define("com.ca.TechnicalServices.PortfolioItemHealthSummary", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    items: [{
            xtype: 'container',
            itemId: 'controlsArea',
            layout: {
                type: 'hbox',
            },
            items: [{
                    xtype: 'container',
                    itemId: 'selectorArea',
                },
                {
                    xtype: 'container',
                    itemId: 'padding1',
                    flex: 1
                }, {
                    xtype: 'container',
                    itemId: 'showDoneArea',
                }
            ],
            padding: '0 0 10 0',
            bodyPadding: 5,
        },
        {
            xtype: 'container',
            itemId: 'gridArea',
            layout: {
                type: 'fit'
            },
            flex: 1
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
            PER_TEAM_WIP_MAX: 4,
            SHOW_WIP_RAW_DATA: false,
            SHOW_TREND_RAW_DATA: false
        }
    },

    launch: function() {
        this.metricsMgr = new TsMetricsMgr();
        var selectorArea = this.down('#selectorArea');
        var app = Rally.getApp();
        var context = app.getContext();
        selectorArea.add({
            xtype: 'rallysearchcombobox',
            storeConfig: {
                model: TsConstants.SELECTABLE_PORTFOLIO_ITEM_TYPE,
                autoLoad: true,
            },
            stateful: true,
            stateId: context.getScopedStateId(TsConstants.ID.PORTFOLIO_ITEM_TYPE_STATE),
            fieldLabel: TsConstants.LABELS.SELECTABLE_PORTFOLIO_ITEM_TYPE,
            margin: '3 9 3 0',
            labelWidth: 50,
            allowBlank: true,
            allowNoEntry: true,
            allowClear: false,
            //value: app.rawValue,
            listeners: {
                scope: this,
                change: function(control, newValue, oldValue) {
                    app.selectedObjectId = control.getRecord().get('ObjectID');
                    app.addGrid();
                }
            }
        });

        this.down('#showDoneArea').add({
            xtype: 'rallycheckboxfield',
            fieldLabel: TsConstants.LABELS.SHOW_DONE_PIS,
            value: app.showDonePis,
            listeners: {
                scope: this,
                change: function(checkbox, newValue, oldValue) {
                    if (newValue != oldValue) {
                        app.showDonePis = newValue;
                        app.addGrid();
                    }
                }
            }
        })
        //this.addGrid();
    },

    addGrid: function() {
        var filters = [{
            property: 'Parent.ObjectID',
            value: this.selectedObjectId
        }];
        var timeboxScope = this.getContext().getTimeboxScope();
        if (timeboxScope) {
            filters.push(timeboxScope.getQueryFilter());
        }

        var childFilters;
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
            models: TsConstants.DISPLAYED_PORTFOLIO_ITEM_TYPES,
            autoLoad: false,
            enableHierarchy: true,
            filters: filters,
            childFilters: childFilters, // See Overrides.js
            fetch: ['Project', 'Name', 'c_TeamType', 'Children'],
            listeners: {
                scope: this,
                load: function(store, node, records) {
                    this.metricsMgr.buildMetrics(records)
                }
            },
        }).then({
            scope: this,
            success: function(store) {
                var gridArea = this.down('#gridArea');
                gridArea.removeAll();
                gridArea.add({
                    xtype: 'rallygridboard',
                    context: this.getContext(),
                    modelNames: TsConstants.DISPLAYED_PORTFOLIO_ITEM_TYPES,
                    toggleState: 'grid',
                    listeners: {
                        scope: this,
                        viewchange: this.viewChange,
                    },
                    plugins: [{
                            ptype: 'rallygridboardsharedviewcontrol',
                            headerPosition: 'right',
                            sharedViewConfig: {
                                fieldLabel: 'View:',
                                labelWidth: 40,
                                stateful: true,
                                stateId: this.getContext().getScopedStateId('release-planning-shared-view'),
                            }
                        }, {
                            ptype: 'rallygridboardfieldpicker',
                            headerPosition: 'right',
                        },
                        {
                            ptype: 'rallygridboardinlinefiltercontrol',
                            headerPosition: 'right',
                            inlineFilterButtonConfig: {
                                margin: '3 9 3 0',
                                stateful: true,
                                stateId: this.getContext().getScopedStateId('filters'),
                                modelNames: TsConstants.DISPLAYED_PORTFOLIO_ITEM_TYPES,
                                filterChildren: true,
                                inlineFilterPanelConfig: {
                                    quickFilterPanelConfig: {
                                        fieldNames: ['Owner', 'ScheduleState'],
                                        initialFilters: filters
                                    }
                                }
                            }
                        },
                    ],
                    gridConfig: {
                        store: store,
                        storeConfig: {
                            filters: filters
                        },
                        enableBulkEdit: false,
                        enableRanking: false,
                        enableEditing: false,
                        enableScheduleStateClickable: false,
                        enabledValidationUi: false,
                        enableColumnHide: true,
                        shouldShowRowActionsColumn: false,
                        columnCfgs: this.getColumnCfgs(),
                        derivedColumnCfgs: this.getDerivedColumnCfgs()
                    },
                });
            }
        });
    },

    viewChange: function() {
        this.addGrid();
    },

    getColumnCfgs: function() {
        // Currently mostly derived columns. The column picker will add other standard columns
        return TsConstants.DEFAULT_COLUMNS.concat(this.getDerivedColumnCfgs());
    },

    getDerivedColumnCfgs: function() {
        var periodDays = Rally.getApp().getSetting(TsConstants.SETTINGS.PERIOD_LENGTH);
        return [{
            text: 'Feature Cycle Time - Overall Median (Days)',
            xtype: 'templatecolumn',
            tpl: new Ext.XTemplate(''),
            scope: this,
            renderer: function(value, meta, record) {
                return this.nanRenderer(record, 'CycleTimeMedian');
            }
        }, {
            text: 'Feature Cycle Time - Last ' + Ext.util.Format.plural(periodDays, 'Day', 'Days'),
            xtype: 'templatecolumn',
            tpl: new Ext.XTemplate(''),
            scope: this,
            renderer: function(value, meta, record) {
                return this.nanRenderer(record, 'CycleTimeCurrentPeriod');
            }
        }, {
            text: 'Feature Cycle Time - ' + periodDays + ' Day Trend',
            tpl: '{CycleTimeTrend}',
            xtype: 'templatecolumn',
            scope: this,
            renderer: function(value, meta, record) {
                return this.cycleTimeTrendRenderer(record, 'CycleTimeTrend');
            }
        }, {
            text: 'Feature Throughput - Last ' + Ext.util.Format.plural(periodDays, 'Day', 'Days'),
            xtype: 'templatecolumn',
            tpl: new Ext.XTemplate(''),
            scope: this,
            renderer: function(value, meta, record) {
                return this.nanRenderer(record, 'ThroughputMedian');
            }

        }, {
            text: 'Feature Throughput - ' + periodDays + ' Day Trend',
            tpl: '{ThroughputTrend}',
            xtype: 'templatecolumn',
            scope: this,
            renderer: function(value, meta, record) {
                return this.throughputTrendRenderer(record, 'ThroughputTrend');
            }
        }, {
            text: TsConstants.LABELS.WIP,
            xtype: 'templatecolumn',
            tpl: new Ext.XTemplate(''),
            scope: this,
            renderer: function(value, meta, record) {
                return this.wipRenderer(record);
            }
        }];
    },

    featuresPerTeam: function(record) {
        var featureCount = Ext.util.Format.plural(record.get('ActiveFeatures'), 'Feature', 'Features');
        var teamCount = Ext.util.Format.plural(record.get('TeamCount'), 'Team', 'Teams');
        return featureCount + ' ' + teamCount;
    },

    wipRenderer: function(record) {
        var value = record.get('FeatureWipAverage');
        var result = value;

        if (TsMetricsUtils.showMetrics(record) == false) {
            result = TsConstants.LABELS.NOT_APPLICABLE;
        }
        else {
            if (value === undefined) {
                result = 'Loading...';
            }
            else {
                if (isNaN(value)) {
                    result = TsConstants.LABELS.NO_VALUE;
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
                if (this.getSetting(TsConstants.SETTINGS.SHOW_WIP_RAW_DATA)) {
                    result += '<div>' + this.featuresPerTeam(record) + '</div>'
                }
            }
        }
        return result;
    },

    nanRenderer: function(record, dataIndex) {
        var value = record.get(dataIndex);
        var result = value;

        if (TsMetricsUtils.showMetrics(record) == false) {
            result = TsConstants.LABELS.NOT_APPLICABLE;
        }
        else {
            if (value === undefined) {
                result = 'Loading...';
            }
            else if (isNaN(value)) {
                result = TsConstants.LABELS.NO_VALUE;
            }
        }
        return result;
    },

    cycleTimeTrendRenderer: function(record, dataIndex) {
        var value = record.get(dataIndex);
        var result = value;

        if (TsMetricsUtils.showMetrics(record) == false) {
            result = TsConstants.LABELS.NOT_APPLICABLE;
        }
        else {
            if (value === undefined) {
                result = 'Loading...';
            }
            else {
                if (value > 0) {
                    result = this.getEmojiDiv('worse');
                    if (this.getSetting(TsConstants.SETTINGS.SHOW_TREND_RAW_DATA)) {
                        result += Ext.util.Format.plural(Math.abs(value), 'day', 'days') + ' longer';
                    }
                }
                else if (value < 0) {
                    result = this.getEmojiDiv('better');
                    if (this.getSetting(TsConstants.SETTINGS.SHOW_TREND_RAW_DATA)) {
                        result += Ext.util.Format.plural(Math.abs(value), 'day', 'days') + ' shorter';
                    }
                }
                else if (value == 0) {
                    result = this.getEmojiDiv('neutral');
                    if (this.getSetting(TsConstants.SETTINGS.SHOW_TREND_RAW_DATA)) {
                        result += 'Unchanged';
                    }
                }
                else {
                    result = TsConstants.LABELS.NO_VALUE;
                }
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
            result = TsConstants.LABELS.NOT_APPLICABLE;
        }
        else {
            if (value === undefined) {
                result = 'Loading...';
            }
            else if (value > 0) {
                result = this.getEmojiDiv('better');
                if (this.getSetting(TsConstants.SETTINGS.SHOW_TREND_RAW_DATA)) {
                    result += Ext.util.Format.plural(value, 'more Feature', 'more Features');
                }
            }
            else if (value < 0) {
                result = this.getEmojiDiv('worse');
                if (this.getSetting(TsConstants.SETTINGS.SHOW_TREND_RAW_DATA)) {
                    result += Ext.util.Format.plural(Math.abs(value), 'fewer Feature', 'fewer Features');
                }
            }
            else if (value == 0) {
                result = this.getEmojiDiv('neutral');
                if (this.getSetting(TsConstants.SETTINGS.SHOW_TREND_RAW_DATA)) {
                    result += 'Unchanged';
                }
            }
            else {
                result = TsConstants.LABELS.NO_VALUE;
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
                name: TsConstants.SETTINGS.SHOW_TREND_RAW_DATA,
                xtype: 'rallycheckboxfield',
                label: TsConstants.LABELS.SHOW_TREND_RAW_DATA,
                labelWidth: 300,
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
            {
                name: TsConstants.SETTINGS.SHOW_WIP_RAW_DATA,
                xtype: 'rallycheckboxfield',
                label: TsConstants.LABELS.SHOW_WIP_RAW_DATA,
                labelWidth: 300,
            }
        ];
    },
});
