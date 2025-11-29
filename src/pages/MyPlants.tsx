import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf, ArrowLeft, Droplet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Plant {
  id: string;
  common_name: string;
  scientific_name: string;
  description: string;
  image_url: string;
  watering_frequency_days: number;
  last_watered_at: string;
  created_at: string;
}

const MyPlants = () => {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    try {
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPlants(data || []);
    } catch (error) {
      console.error('Error fetching plants:', error);
      toast.error('Failed to load plants');
    } finally {
      setLoading(false);
    }
  };

  const handleWaterPlant = async (plantId: string) => {
    try {
      const { error } = await supabase
        .from('plants')
        .update({ last_watered_at: new Date().toISOString() })
        .eq('id', plantId);

      if (error) throw error;

      toast.success('Plant watered!');
      fetchPlants();
    } catch (error) {
      console.error('Error watering plant:', error);
      toast.error('Failed to update watering');
    }
  };

  const handleDeletePlant = async (plantId: string) => {
    try {
      const { error } = await supabase
        .from('plants')
        .delete()
        .eq('id', plantId);

      if (error) throw error;

      toast.success('Plant removed');
      fetchPlants();
    } catch (error) {
      console.error('Error deleting plant:', error);
      toast.error('Failed to delete plant');
    }
  };

  const getDaysUntilWatering = (lastWatered: string, frequency: number) => {
    const lastWateredDate = new Date(lastWatered);
    const nextWateringDate = new Date(lastWateredDate);
    nextWateringDate.setDate(nextWateringDate.getDate() + frequency);
    
    const today = new Date();
    const diffTime = nextWateringDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Leaf className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-2">
            <Leaf className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">My Plants</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {plants.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <Leaf className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No plants yet</h2>
            <p className="text-muted-foreground mb-6">
              Start by identifying your first plant!
            </p>
            <Button onClick={() => navigate('/')}>Identify a Plant</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plants.map((plant) => {
              const daysUntilWatering = getDaysUntilWatering(
                plant.last_watered_at,
                plant.watering_frequency_days
              );
              const needsWater = daysUntilWatering <= 0;

              return (
                <Card key={plant.id} className="overflow-hidden animate-scale-in">
                  <img
                    src={plant.image_url}
                    alt={plant.common_name}
                    className="w-full h-48 object-cover"
                  />
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="text-xl font-semibold">{plant.common_name}</h3>
                      <p className="text-sm text-muted-foreground italic">
                        {plant.scientific_name}
                      </p>
                    </div>

                    <div className={`text-sm ${needsWater ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      {needsWater
                        ? '🚨 Needs watering!'
                        : `💧 Water in ${daysUntilWatering} day${daysUntilWatering === 1 ? '' : 's'}`}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleWaterPlant(plant.id)}
                      >
                        <Droplet className="h-4 w-4 mr-2" />
                        Water
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePlant(plant.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyPlants;
