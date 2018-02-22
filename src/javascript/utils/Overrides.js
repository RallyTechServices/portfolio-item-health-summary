/* global Ext Rally com _ TsSummaryRow */
Ext.override(Rally.data.wsapi.TreeStore, {

    _getChildNodeFilters: function(node) {
        var parentType = node.self.typePath,
            childTypes = this._getChildTypePaths([parentType]),
            parentFieldNames = this._getParentFieldNames(childTypes, parentType);

        if (parentFieldNames.length) {
            var filters = Rally.data.wsapi.Filter.or(_.map(parentFieldNames, function(parentFieldName) {
                return {
                    property: parentFieldName,
                    operator: '=',
                    value: node.get('_ref')
                };
            }));
            if (this.childFilters) {
                return [filters.and(this.childFilters)];
            }
            return [filters];
        }
        return [];
    },
    filterChildren: function(childFilterObjects) {
        //need to make sure that the fields are on the types
        this.childFilters = childFilterObjects;
        this.load();
    }
});
