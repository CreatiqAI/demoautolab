import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ui/image-upload';
import { Plus, Edit, Trash2, Package, Tag, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ComponentLibraryItem {
  id: string;
  name: string;
  description: string;
  component_type: string;
  component_value: string;
  is_active: boolean;
  default_image_url?: string;
  usage_count?: number;
  products_count?: number;
  total_stock?: number;
  avg_price?: number;
  created_at: string;
}

const COMPONENT_TYPES = [
  { value: 'color', label: 'Color', icon: '🎨' },
  { value: 'size', label: 'Size', icon: '📏' },
  { value: 'storage', label: 'Storage', icon: '💾' },
  { value: 'component', label: 'Component', icon: '🔧' },
  { value: 'compatibility', label: 'Compatibility', icon: '✅' },
  { value: 'bundle', label: 'Bundle', icon: '📦' },
  { value: 'material', label: 'Material', icon: '🏗️' },
  { value: 'brand', label: 'Brand', icon: '🏷️' },
  { value: 'other', label: 'Other', icon: '📋' }
];

export default function ComponentLibrary() {
  const [components, setComponents] = useState<ComponentLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    component_type: '',
    component_value: '',
    default_image_url: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      setLoading(true);
      // Using a fallback approach since the view may not exist
      try {
        const { data, error } = await supabase
          .rpc('get_component_library_with_usage');
        
        if (error) throw error;
        setComponents(data || []);
      } catch (rpcError) {
        console.log('Using fallback approach for component library');
        // Fallback to basic component library table
        const { data, error } = await supabase
          .from('categories') // Using existing table as fallback
          .select('*')
          .limit(0); // Return empty for now
        
        setComponents([]);
      }
    } catch (error: any) {
      console.error('Error fetching components:', error);
      toast({
        title: "Error",
        description: "Failed to load component library",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing) {
        // Fallback - component library operations disabled for now
        console.log('Component library update disabled - needs proper database setup');
        
        toast({
          title: "Feature Unavailable",
          description: "Component library editing requires database setup",
          variant: "destructive"
        });
        return;
      } else {
        // Fallback - component library operations disabled for now
        console.log('Component library creation disabled - needs proper database setup');
        
        toast({
          title: "Feature Unavailable",
          description: "Component library creation requires database setup",
          variant: "destructive"
        });
        return;
      }

      setDialogOpen(false);
      resetForm();
      fetchComponents();
    } catch (error: any) {
      console.error('Error saving component:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save component",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (component: ComponentLibraryItem) => {
    setFormData({
      id: component.id,
      name: component.name,
      description: component.description,
      component_type: component.component_type,
      component_value: component.component_value,
      default_image_url: component.default_image_url || ''
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    toast({
      title: "Feature Unavailable",
      description: "Component library deletion requires database setup",
      variant: "destructive"
    });
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      component_type: '',
      component_value: '',
      default_image_url: ''
    });
    setIsEditing(false);
  };

  const getTypeInfo = (type: string) => {
    return COMPONENT_TYPES.find(t => t.value === type) || { value: type, label: type, icon: '📋' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Component Library</h1>
          <p className="text-muted-foreground">Manage reusable components for your products</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Component
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Component' : 'Create Component'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Update the component details below.' : 'Add a new reusable component to your library.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Component Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Black Color, Large Size"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="component_type">Component Type</Label>
                <Select 
                  value={formData.component_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, component_type: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select component type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="component_value">Component Value</Label>
                <Input
                  id="component_value"
                  value={formData.component_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, component_value: e.target.value }))}
                  placeholder="e.g., black, large, 128gb"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this component..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Component Image</Label>
                <ImageUpload
                  value={formData.default_image_url}
                  onChange={(url) => setFormData(prev => ({ ...prev, default_image_url: url }))}
                  placeholder="Upload component image..."
                />
                <p className="text-xs text-muted-foreground">
                  This image will be used when adding this component to products
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {isEditing ? 'Update Component' : 'Create Component'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setDialogOpen(false); resetForm(); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading components...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {components.map((component) => {
            const typeInfo = getTypeInfo(component.component_type);
            return (
              <Card key={component.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{typeInfo.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{component.name}</CardTitle>
                        <CardDescription>{component.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(component)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(component.id, component.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Badge variant="secondary">{typeInfo.label}</Badge>
                      {component.component_value && (
                        <Badge variant="outline">{component.component_value}</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Products:</span>
                        <span className="font-medium">{component.products_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Variants:</span>
                        <span className="font-medium">{component.usage_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Stock:</span>
                        <span className="font-medium">{component.total_stock || 0}</span>
                      </div>
                      {component.avg_price && component.avg_price > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Avg Price:</span>
                          <span className="font-medium">${component.avg_price.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && components.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Components Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create reusable components that can be shared across multiple products.
            </p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Component
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}