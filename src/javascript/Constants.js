/* global Ext Deft _ com TsMetricsUtils Rally */
// TODO (tj) make level configurable
// TODO (tj) if at theme level are metric still a Feature Level?
Ext.define("TsConstants", {

    statics: {
        PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Feature',
        PORTFOLIO_ITEM_STORE_ID: 'PORTFOLIO_ITEM_STORE_ID',
        GRID_STORE_ID: 'GRID_STORE_ID',
        PER_PROJECT_WIP_LIMIT: 3,
        PERIOD_LENGTH_SETTING: 'PERIOD_LENGTH_SETTING',
        PERIOD_LENGTH_DEFAULT: 30,
        MGMT_PROJECT_NAMES_SETTING: 'MGMT_PROJECT_NAMES_SETTING',
        SELECTABLE_PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Group',
        SELECTABLE_PORTFOLIO_ITEM_TYPE_LABEL: 'Affiliate',
        ROW_PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Epic',
        ROW_METRICS_PORTFOLIO_ITEM_TYPE: 'PortfolioItem/Feature',
        WIP_LABEL: 'Active Features Per-Dev Team (Average)',

        INCLUDED_PROJECT_TEAM_TYPES_SETTING: 'INCLUDED_PROJECT_TEAM_TYPES_SETTING',
        PER_TEAM_WIP_MAX_SETTING: 'PER_TEAM_WIP_MAX_SETTING',
    }

});
