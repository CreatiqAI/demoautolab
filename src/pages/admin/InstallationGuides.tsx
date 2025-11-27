import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Edit,
  Trash2,
  Plus,
  Save,
  Eye,
  EyeOff,
  Video
} from 'lucide-react';

interface InstallationGuide {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: string;
  car_brand: string;
  car_model: string;
  video_url: string;
  thumbnail_url: string;
  is_published: boolean;
  created_at: string;
}

const CATEGORIES = [
  'Head Unit',
  'Camera',
  'Dashcam',
  'Audio',
  'Sensors',
  'Lighting',
  'Security',
  'Performance',
  'Other'
];

const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];

const CAR_BRANDS = [
  'Toyota', 'Honda', 'Proton', 'Perodua', 'Nissan', 'Mazda',
  'Mitsubishi', 'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Other'
];

export default function InstallationGuides() {
  const { toast } = useToast();
  const [guides, setGuides] = useState<InstallationGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<InstallationGuide | null>(null);
  const [formData, setFormData] = useState<Partial<InstallationGuide>>({
    title: '',
    description: '',
    category: 'Head Unit',
    difficulty_level: 'Medium',
    car_brand: '',
    car_model: '',
    video_url: '',
    thumbnail_url: '',
    is_published: false
  });

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('installation_guides')
        .select('id, title, description, category, difficulty_level, car_brand, car_model, video_url, thumbnail_url, is_published, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuides(data || []);
    } catch (error: any) {
      console.error('Error fetching guides:', error);
      toast({
        title: 'Error',
        description: 'Failed to load installation guides',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingGuide(null);
    setFormData({
      title: '',
      description: '',
      category: 'Head Unit',
      difficulty_level: 'Medium',
      car_brand: '',
      car_model: '',
      video_url: '',
      thumbnail_url: '',
      is_published: false
    });
    setIsEditModalOpen(true);
  };

  const handleEdit = (guide: InstallationGuide) => {
    setEditingGuide(guide);
    setFormData(guide);
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.video_url) {
        toast({
          title: 'Validation Error',
          description: 'Title and video URL are required',
          variant: 'destructive'
        });
        return;
      }

      const guideData = {
        title: formData.title,
        description: formData.description || '',
        category: formData.category || 'Other',
        difficulty_level: formData.difficulty_level || 'Medium',
        car_brand: formData.car_brand || '',
        car_model: formData.car_model || '',
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || '',
        is_published: formData.is_published || false
      };

      if (editingGuide) {
        const { error } = await supabase
          .from('installation_guides')
          .update(guideData)
          .eq('id', editingGuide.id);

        if (error) throw error;

        toast({
          title: 'Guide Updated',
          description: `${formData.title} has been updated successfully`
        });
      } else {
        const { error } = await supabase
          .from('installation_guides')
          .insert([guideData]);

        if (error) throw error;

        toast({
          title: 'Guide Created',
          description: `${formData.title} has been created successfully`
        });
      }

      setIsEditModalOpen(false);
      fetchGuides();
    } catch (error: any) {
      console.error('Error saving guide:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save guide',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (guide: InstallationGuide) => {
    if (!confirm(`Are you sure you want to delete "${guide.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('installation_guides')
        .delete()
        .eq('id', guide.id);

      if (error) throw error;

      toast({
        title: 'Guide Deleted',
        description: `${guide.title} has been deleted`
      });
      fetchGuides();
    } catch (error: any) {
      console.error('Error deleting guide:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete guide',
        variant: 'destructive'
      });
    }
  };

  const togglePublish = async (guide: InstallationGuide) => {
    try {
      const { error } = await supabase
        .from('installation_guides')
        .update({ is_published: !guide.is_published })
        .eq('id', guide.id);

      if (error) throw error;

      toast({
        title: guide.is_published ? 'Guide Unpublished' : 'Guide Published',
        description: `${guide.title} is now ${guide.is_published ? 'hidden from' : 'visible to'} enterprise merchants`
      });
      fetchGuides();
    } catch (error: any) {
      console.error('Error toggling publish:', error);
      toast({
        title: 'Error',
        description: 'Failed to update guide status',
        variant: 'destructive'
      });
    }
  };

  const getDifficultyBadge = (level: string) => {
    const colors: Record<string, string> = {
      'Easy': 'bg-green-100 text-green-800 border-green-200',
      'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Hard': 'bg-red-100 text-red-800 border-red-200'
    };
    return <Badge className={`${colors[level] || 'bg-gray-100 text-gray-800'} border`}>{level}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Installation Guides</h2>
          <p className="text-muted-foreground">
            Manage video installation guides for enterprise merchants
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Guide
        </Button>
      </div>

      {/* Guides Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Guides</CardTitle>
          <CardDescription>
            {guides.length} guide(s) • {guides.filter(g => g.is_published).length} published
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : guides.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No installation guides yet. Click "Add New Guide" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guide Info</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Car Model</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guides.map((guide) => (
                  <TableRow key={guide.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        {guide.thumbnail_url && (
                          <img
                            src={guide.thumbnail_url}
                            alt={guide.title}
                            className="w-20 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            {guide.title}
                          </div>
                          {guide.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {guide.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{guide.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {guide.car_brand && guide.car_model ? (
                          <>
                            <div className="font-medium">{guide.car_brand}</div>
                            <div className="text-muted-foreground">{guide.car_model}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Not specified</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getDifficultyBadge(guide.difficulty_level)}</TableCell>
                    <TableCell>
                      <Badge variant={guide.is_published ? 'default' : 'secondary'}>
                        {guide.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(guide)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePublish(guide)}
                          title={guide.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {guide.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => handleDelete(guide)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGuide ? 'Edit Guide' : 'Add New Guide'}</DialogTitle>
            <DialogDescription>
              {editingGuide ? 'Update installation guide details' : 'Create a new installation guide'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Android Head Unit Installation - Proton X50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Brief description of what this guide covers..."
              />
            </div>

            {/* Category & Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Difficulty</label>
                <Select
                  value={formData.difficulty_level}
                  onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Car Brand & Model */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Car Brand</label>
                <Select
                  value={formData.car_brand}
                  onValueChange={(value) => setFormData({ ...formData, car_brand: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAR_BRANDS.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Car Model</label>
                <Input
                  value={formData.car_model}
                  onChange={(e) => setFormData({ ...formData, car_model: e.target.value })}
                  placeholder="e.g., X50, City, Myvi"
                />
              </div>
            </div>

            {/* Video URL */}
            <div>
              <label className="text-sm font-medium mb-1 block">Video URL *</label>
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            {/* Thumbnail URL */}
            <div>
              <label className="text-sm font-medium mb-1 block">Thumbnail Image URL</label>
              <Input
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
              />
              {formData.thumbnail_url && (
                <img
                  src={formData.thumbnail_url}
                  alt="Preview"
                  className="mt-2 w-40 h-24 object-cover rounded border"
                />
              )}
            </div>

            {/* Published Status */}
            <div className="flex items-center justify-between border-t pt-4">
              <label className="text-sm font-medium">Published (visible to enterprise merchants)</label>
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              {editingGuide ? 'Update Guide' : 'Create Guide'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
