/* global Ext */
Ext.define('TsSummaryRow', {
    extend: 'Ext.data.Model',
    fields: [
        { name: 'FormattedID', type: 'string' },
        { name: 'Name', type: 'string' },
        { name: 'CycleTimeMedian', type: 'int' },
        { name: 'CycleTimeCurrentPeriod', type: 'int' },
        { name: 'CycleTimeTrend', type: 'string' },
        { name: 'ThroughputMedian', type: 'float' },
        { name: 'ThroughputTrend', type: 'string' },
        { name: 'WipRatio', type: 'float' }
    ]
});
