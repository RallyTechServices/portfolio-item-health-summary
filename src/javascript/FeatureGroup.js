/* global Ext */
Ext.define('TsFeatureGroup', {
    extend: 'Ext.data.Model',
    fields: [
        { name: 'PortfolioItem' }, // The PI to compute metrics
        { name: 'Features' }, // The features with this PI as an ancestor
        { name: 'LeafProjectsHash' }, // The leaf projects under the PI project
    ]
});
