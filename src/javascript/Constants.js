/* global Ext Deft _ com TsMetricsUtils Rally */
// TODO (tj) make level configurable
// TODO (tj) if at theme level are metric still a Feature Level?
Ext.define("TsConstants", {

    statics: {
        ID: {
            PORTFOLIO_ITEM_TYPE_STATE: 'PORTFOLIO_ITEM_TYPE_STATE'
        },
        SETTINGS: {
            PERIOD_LENGTH: 'PERIOD_LENGTH',
            INCLUDED_PROJECT_TEAM_TYPES: 'INCLUDED_PROJECT_TEAM_TYPES',
            PER_TEAM_WIP_MAX: 'PER_TEAM_WIP_MAX',
            PI_TYPES_ALWAYS_SHOWN: ['PortfolioItem/Group', 'PortfolioItem/Theme'],
            SHOW_WIP_RAW_DATA: 'SHOW_WIP_RAW_DATA',
            SHOW_TREND_RAW_DATA: 'SHOW_TREND_RAW_DATA'
        },

        LABELS: {
            WIP: 'Active Features Per-Team (Average)',
            SHOW_WIP_RAW_DATA: 'Show Active Features and Team counts',
            SHOW_TREND_RAW_DATA: 'Show Trend Values',
            SHOW_DONE_PIS: 'Show Done Items',
            SELECTABLE_PORTFOLIO_ITEM_TYPE: 'Affiliate',
        },

        SELECTABLE_PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Group',
        ROW_METRICS_PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Feature',
    }

});
