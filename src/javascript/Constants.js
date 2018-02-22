/* global Ext Deft _ com TsMetricsUtils Rally */
// TODO (tj) make level configurable
// TODO (tj) if at theme level are metric still a Feature Level?
Ext.define("TsConstants", {

    statics: {
        SETTINGS: {
            PERIOD_LENGTH: 'PERIOD_LENGTH',
            INCLUDED_PROJECT_TEAM_TYPES: 'INCLUDED_PROJECT_TEAM_TYPES',
            PER_TEAM_WIP_MAX: 'PER_TEAM_WIP_MAX',
            PI_TYPES_ALWAYS_SHOWN: ['PortfolioItem/Group', 'PortfolioItem/Theme'],
        },

        LABELS: {
            WIP: 'Active Features Per-Team (Average)',
            SHOW_DONE_PIS: 'Show Done Items',
        },

        SELECTABLE_PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Group',
        SELECTABLE_PORTFOLIO_ITEM_TYPE_LABEL: 'Affiliate',
        ROW_METRICS_PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Feature',
    }

});
