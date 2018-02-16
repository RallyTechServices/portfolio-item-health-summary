/* global Ext Rally com _ */
Ext.override(Rally.data.wsapi.TreeStore, {
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
                    m.addField(summaryField);
                }
            });
        });

        _.each(Ext.Array.from(models), Rally.ui.grid.data.NodeInterface.decorate, Rally.ui.grid.data.NodeInterface);
    }
});
