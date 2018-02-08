/* global Ext */
Ext.define('com.ca.TechnicalServices.SummaryRow', {
    extend: 'Ext.data.Model',
    fields: [
        { name: 'FormattedID', type: 'string' },
        { name: 'Name', type: 'string' },
        { name: 'PercentCompleteByStoryPoints', type: 'int' },
        { name: 'PercentCompleteByStoryCount', type: 'int' },
        { name: 'RedYelloGreen', type: 'string' },
        { name: 'CycleTimeMedian', type: 'int' },
        { name: 'CycleTimeTrend', type: 'string' },
        { name: 'ThroughputMedian', type: 'int' },
        { name: 'ThroughputTrend', type: 'string' },
        { name: 'WipRatio', type: 'float' }
    ]
});
