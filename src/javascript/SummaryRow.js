/* global Ext */
Ext.define('TsSummaryRow', {
    extend: 'Ext.data.Model',
    fields: [
        { name: 'CycleTimeMedian', type: 'int', defaultValue: NaN },
        { name: 'CycleTimeCurrentPeriod', type: 'int', defaultValue: NaN },
        { name: 'CycleTimeTrend', type: 'string', defaultValue: "Loading" },
        { name: 'ThroughputMedian', type: 'float', defaultValue: NaN },
        { name: 'ThroughputTrend', type: 'string', defaultValue: "Loading" },
        { name: 'FeatureWipAverage', type: 'float', defaultValue: NaN },
        { name: 'ActiveFeatures', type: 'int', defaultValue: NaN },
        { name: 'TeamCount', type: 'int', defaultValue: NaN }
    ]
});
