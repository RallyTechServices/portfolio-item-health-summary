/* global Ext Rally com _ TsSummaryRow */
Ext.override(Rally.data.wsapi.TreeStore, {
    /*
    _decorateModels: function() {
        var models = this.model;

        if (_.isFunction(models.getArtifactComponentModels)) {
            models = models.getArtifactComponentModels();
        }

        Ext.Array.each(models, function(m) {
            var summaryFields = TsSummaryRow.getFields();
            _.forEach(summaryFields, function(summaryField) {
                // Don't add fields that already exist
                if (!m.getField(summaryField.name)) {
                    //m.addField(summaryField);
                }
            });
        });

        _.each(Ext.Array.from(models), Rally.ui.grid.data.NodeInterface.decorate, Rally.ui.grid.data.NodeInterface);
    }*/

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
