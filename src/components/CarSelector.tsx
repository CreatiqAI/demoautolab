import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Car } from 'lucide-react';

interface CarMake {
  id: string;
  name: string;
  country: string;
  is_popular: boolean;
}

interface CarModel {
  id: string;
  make_id: string;
  name: string;
  year_start: number;
  year_end: number;
  body_type: string;
}

interface CarSelectorProps {
  selectedMakeId: string;
  selectedModelId: string;
  onMakeChange: (makeId: string, makeName: string) => void;
  onModelChange: (modelId: string, modelName: string) => void;
  disabled?: boolean;
  required?: boolean;
  showLabels?: boolean;
  className?: string;
}

export default function CarSelector({
  selectedMakeId,
  selectedModelId,
  onMakeChange,
  onModelChange,
  disabled = false,
  required = false,
  showLabels = true,
  className = ''
}: CarSelectorProps) {
  const [makes, setMakes] = useState<CarMake[]>([]);
  const [models, setModels] = useState<CarModel[]>([]);
  const [loadingMakes, setLoadingMakes] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch car makes on mount
  useEffect(() => {
    fetchMakes();
  }, []);

  // Fetch models when make changes
  useEffect(() => {
    if (selectedMakeId) {
      fetchModels(selectedMakeId);
    } else {
      setModels([]);
    }
  }, [selectedMakeId]);

  const fetchMakes = async () => {
    console.log('[CarSelector] Fetching car makes...');
    try {
      setLoadingMakes(true);
      const { data, error } = await supabase
        .from('car_makes')
        .select('*')
        .order('sort_order', { ascending: true });

      console.log('[CarSelector] car_makes response:', { data, error, count: data?.length });

      if (error) {
        console.error('[CarSelector] Error fetching car makes:', error);
        // Set empty array on error - user can skip vehicle selection
        setMakes([]);
        return;
      }
      setMakes(data || []);
      console.log('[CarSelector] Makes set:', data?.length, 'items');
    } catch (error) {
      console.error('[CarSelector] Exception fetching car makes:', error);
      setMakes([]);
    } finally {
      setLoadingMakes(false);
    }
  };

  const fetchModels = async (makeId: string) => {
    try {
      setLoadingModels(true);
      const { data, error } = await supabase
        .from('car_models')
        .select('*')
        .eq('make_id', makeId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching car models:', error);
        setModels([]);
        return;
      }
      setModels(data || []);
    } catch (error) {
      console.error('Error fetching car models:', error);
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleMakeChange = (makeId: string) => {
    console.log('[CarSelector] handleMakeChange called with:', makeId);
    const make = makes.find(m => m.id === makeId);
    console.log('[CarSelector] Found make:', make);
    onMakeChange(makeId, make?.name || '');
    // Reset model when make changes
    onModelChange('', '');
  };

  const handleModelChange = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    onModelChange(modelId, model?.name || '');
  };

  // Group makes by popular vs others
  const popularMakes = makes.filter(m => m.is_popular);
  const otherMakes = makes.filter(m => !m.is_popular);

  // If no makes available after loading, show a message
  if (!loadingMakes && makes.length === 0) {
    return (
      <div className={`text-sm text-gray-500 italic ${className}`}>
        Vehicle selection temporarily unavailable. You can add this later in your profile.
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {/* Car Brand Select */}
      <div className="space-y-2">
        {showLabels && (
          <Label className="flex items-center gap-1">
            <Car className="h-4 w-4" />
            Car Brand {required && <span className="text-red-500">*</span>}
          </Label>
        )}
        <Select
          value={selectedMakeId}
          onValueChange={handleMakeChange}
          disabled={disabled || loadingMakes}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingMakes ? "Loading..." : "Select brand"} />
          </SelectTrigger>
          <SelectContent>
            {/* Popular brands */}
            {popularMakes.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Popular Brands
                </div>
                {popularMakes.map((make) => (
                  <SelectItem key={make.id} value={make.id}>
                    {make.name}
                  </SelectItem>
                ))}
              </>
            )}

            {/* Other brands */}
            {otherMakes.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                  Other Brands
                </div>
                {otherMakes.map((make) => (
                  <SelectItem key={make.id} value={make.id}>
                    {make.name}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Car Model Select */}
      <div className="space-y-2">
        {showLabels && (
          <Label>
            Car Model {required && <span className="text-red-500">*</span>}
          </Label>
        )}
        <Select
          value={selectedModelId}
          onValueChange={handleModelChange}
          disabled={disabled || !selectedMakeId || loadingModels}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                !selectedMakeId
                  ? "Select brand first"
                  : loadingModels
                  ? "Loading..."
                  : "Select model"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
                {model.body_type && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({model.body_type})
                  </span>
                )}
              </SelectItem>
            ))}
            {models.length === 0 && selectedMakeId && !loadingModels && (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No models found for this brand
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
