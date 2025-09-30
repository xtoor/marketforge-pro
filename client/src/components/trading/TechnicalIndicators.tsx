import { Button } from "@/components/ui/button";
import { Plus, Eye, EyeOff, X } from "lucide-react";
import { useIndicatorStore } from "@/stores/indicatorStore";
import { useState } from "react";
import AddIndicatorDialog from "./AddIndicatorDialog";

export default function TechnicalIndicators() {
  const { activeIndicators, removeIndicator, toggleIndicatorVisibility } = useIndicatorStore();
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide">Active Indicators</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary/80" 
          onClick={() => setShowAddDialog(true)}
          data-testid="button-add-indicator"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {activeIndicators.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>No active indicators</p>
          <p className="text-xs mt-1">Click + to add an indicator</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeIndicators.map((indicator) => (
            <div 
              key={indicator.id} 
              className="bg-card rounded-lg p-3 border border-border hover:border-primary/50 transition-colors"
              data-testid={`indicator-item-${indicator.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: indicator.color }}
                    />
                    <span className="text-sm font-medium">{indicator.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Object.entries(indicator.parameters).map(([key, value]) => (
                      <span key={key} className="mr-2">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleIndicatorVisibility(indicator.id)}
                    data-testid={`button-toggle-indicator-${indicator.id}`}
                  >
                    {indicator.visible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeIndicator(indicator.id)}
                    data-testid={`button-remove-indicator-${indicator.id}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddIndicatorDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}
