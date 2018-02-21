/* global Ext CArABU _ com Rally TsConstants TsMetricsMgr TsMetricsUtils TsSvgIcons */
Ext.define("com.ca.TechnicalServices.PortfolioItemHealthSummary", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new CArABU.technicalservices.Logger(),
    items: [{
            xtype: 'form',
            itemId: 'controlsArea',
        },
        {
            xtype: 'container',
            itemId: 'gridArea'
        },
    ],

    integrationHeaders: {
        name: "com.ca.TechnicalServices.PortfolioItemHealthSummary"
    },

    launch: function() {
        this.logger.setSaveForLater(this.getSetting('saveLog'));
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
                    this.addGrid(control.getRecord());
                }
            }
        });
    },

    addGrid: function(parent) {
        var periodDays = Rally.getApp().getSetting(TsConstants.PERIOD_LENGTH_SETTING) || TsConstants.PERIOD_LENGTH_DEFAULT;
        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: ['PortfolioItem/Theme'],
            autoLoad: true,
            enableHierarchy: true,
            filters: [{
                property: 'Parent.ObjectID',
                value: parent.get('ObjectID')
            }],
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
                            text: TsConstants.WIP_LABEL,
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
                if (result >= 4) {
                    result = '<div class="colorcell caution">' + result + '</div>';
                }
            }
        }
        //console.log(record.get("FormattedID") + ' ' + value + ' => ' + result);
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
                result = this.getEmojiDiv('worse') + value + ' days slower'
            }
            else if (value < 0) {
                result = this.getEmojiDiv('better') + Math.abs(value) + ' days faster'
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
                result = this.getEmojiDiv('worse') + Math.abs(value) + ' less Features'
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
        var check_box_margins = '5 0 5 0';
        return [{
                name: 'saveLog',
                xtype: 'rallycheckboxfield',
                boxLabelAlign: 'after',
                fieldLabel: '',
                margin: check_box_margins,
                boxLabel: 'Save Logging<br/><span style="color:#999999;"><i>Save last 100 lines of log for debugging.</i></span>'

            },
            {
                name: TsConstants.PERIOD_LENGTH_SETTING,
                xtype: 'numberfield',
                fieldLabel: 'Trend Time Period (Days)'
            },
            {
                name: TsConstants.INCLUDED_PROJECT_TEAM_TYPES_SETTING, // TODO: Defaults
                xtype: 'textfield',
                disabled: true,
                value: 'Agile',
                fieldLabel: 'Project Team Types to include in "' + TsConstants.WIP_LABEL + '" calculation',
            },
            {
                name: TsConstants.PER_TEAM_WIP_MAX_SETTING, // TODO Defaults
                xtype: 'textfield',
                disabled: true,
                value: '4',
                fieldLabel: 'Max "' + TsConstants.WIP_LABEL + '"',
            },
        ];
    },

    getOptions: function() {
        var options = [{
            text: 'About...',
            handler: this._launchInfo,
            scope: this
        }];

        return options;
    },

    _launchInfo: function() {
        if (this.about_dialog) { this.about_dialog.destroy(); }

        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink', {
            showLog: this.getSetting('saveLog'),
            logger: this.logger
        });
    }

});
