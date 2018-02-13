/* global Ext CArABU _ com */
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
        var me = this;
        this.logger.setSaveForLater(this.getSetting('saveLog'));
        this.stores = new com.ca.TechnicalServices.Stores();
        this.stores.init();
        this.down('#controlsArea').add({
            xtype: 'rallysearchcombobox',
            storeConfig: {
                model: 'portfolioitem/initiative',
                autoLoad: true
            },
            fieldLabel: "Initiative",
            listeners: {
                scope: this,
                change: function(control, newValue) {
                    this.stores.onPortfolioItemChange(control.getRecord());
                }
            }
        });
        this.down('#gridArea').add({
            xtype: 'rallygrid',
            store: Ext.data.StoreManager.lookup(com.ca.TechnicalServices.Stores.GRID_STORE_ID),
            columnCfgs: [{
                    text: 'Name',
                    dataIndex: 'Name',
                },
                {
                    text: '% Complete by Story Points',
                    dataIndex: 'PercentCompleteByStoryPoints'
                },
                {
                    text: '% Complete by Story Count',
                    dataIndex: 'PercentCompleteByStoryCount'
                },
                {
                    text: 'RYG',
                    dataIndex: 'RedYellowGreen'
                },
                {
                    text: 'Cycle Time - Overall Median (Days)',
                    dataIndex: 'CycleTimeMedian'
                },
                {
                    text: 'Cycle Time - Last 30 Days',
                    dataIndex: 'CycleTimeCurrentPeriod'
                },
                {
                    text: 'Cycle Time - 30 Day Trend',
                    dataIndex: 'CycleTimeTrend'
                },
                {
                    text: 'Throughput - Last 30 Days',
                    dataIndex: 'ThroughputMedian'
                },
                {
                    text: 'Throughput - 30 Day Trend',
                    dataIndex: 'ThroughputTrend'
                },
                {
                    text: 'WIP Ratio',
                    dataIndex: 'WipRatio'
                }
            ]
        });
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
                name: com.ca.TechnicalServices.Stores.MGMT_PROJECT_NAMES_SETTING,
                xtype: 'textarea',
                fieldLabel: 'Management Projects to Exclude',
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
