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
            xtype: 'rallyreleasecombobox',
            fieldLabel: "Release",
            listeners: {
                scope: this,
                change: function(control, newValue, oldValue) {
                    this.stores.onReleaseChange(newValue);
                }
            }
        });
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
                    this.stores.onPortfolioItemChange(newValue);
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
                    text: '% Complete (Points)',
                    dataIndex: 'PercentCompleteByStoryPoints'
                },
                {
                    text: '% Complete (Count)',
                    dataIndex: 'PercentCompleteByStoryCount'
                },
                {
                    text: 'RYG',
                    dataIndex: 'RedYellowGreen'
                },
                {
                    text: 'Cycle Time (Median)',
                    dataIndex: 'CycleTimeMedian'
                },
                {
                    text: 'Cycle Time (Trend)',
                    dataIndex: 'CycleTimeTrend'
                },
                {
                    text: 'Throughput (Median)',
                    dataIndex: 'ThroughputMedian'
                },
                {
                    text: 'Throughput (Trend)',
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

        }];
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
