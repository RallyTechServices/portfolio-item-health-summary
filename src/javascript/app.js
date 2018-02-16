/* global Ext CArABU _ com Rally TsConstants */
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
                autoLoad: true
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
                this.down('#gridArea').add({
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
                            //dataIndex: 'CycleTimeMedian',
                            tpl: '{CycleTimeMedian}',
                            xtype: 'templatecolumn',
                            //renderer: this.nanRenderer
                        },
                        {
                            text: 'Cycle Time - Last ' + periodDays + ' Days',
                            tpl: '{CycleTimeCurrentPeriod}',
                            xtype: 'templatecolumn',
                            //renderer: this.nanRenderer
                        },
                        {
                            text: 'Cycle Time - ' + periodDays + ' Day Trend',
                            tpl: '{CycleTimeTrend}',
                            xtype: 'templatecolumn',
                            //renderer: this.cycleTimeTrendRenderer
                        },
                        {
                            text: 'Throughput - Last ' + periodDays + ' Days',
                            tpl: '{ThroughputMedian}',
                            xtype: 'templatecolumn',
                            //renderer: this.nanRenderer
                        },
                        {
                            text: 'Throughput - ' + periodDays + ' Day Trend',
                            tpl: '{ThroughputTrend}',
                            xtype: 'templatecolumn',
                            //renderer: this.throughputTrendRenderer
                        },
                        {
                            text: 'WIP Ratio',
                            tpl: '{WipRatio}',
                            xtype: 'templatecolumn',
                            //renderer: this.nanRenderer
                        }
                    ]
                });
            }
        });
    },

    nanRenderer: function(value) {
        return isNaN(value) ? "--" : value;
    },

    cycleTimeTrendRenderer: function(value) {
        if (value > 0) {
            return 'Worse'
        }
        else if (value < 0) {
            return 'Better'
        }
        else if (value == 0) {
            return 'Same'
        }
        else {
            return '--'
        }
    },

    throughputTrendRenderer: function(value) {
        if (value > 0) {
            return 'Better'
        }
        else if (value < 0) {
            return 'Worse'
        }
        else if (value == 0) {
            return 'Same'
        }
        else {
            return '--'
        }
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
                name: TsConstants.MGMT_PROJECT_NAMES_SETTING,
                xtype: 'textarea',
                fieldLabel: 'Management Projects to Exclude',
            },
            {
                name: TsConstants.PERIOD_LENGTH_SETTING,
                xtype: 'numberfield',
                fieldLabel: 'Trend Time Period (Days)'
            }
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
