import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, ArrowLeft, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Plant {
  id: string;
  common_name: string;
  scientific_name: string;
  watering_frequency_days: number;
  last_watered_at: string;
}

interface Task {
  plant: Plant;
  daysUntilWatering: number;
  needsWater: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .order('last_watered_at', { ascending: true });

      if (error) throw error;

      const tasksData = (data || []).map((plant) => {
        const daysUntilWatering = getDaysUntilWatering(
          plant.last_watered_at,
          plant.watering_frequency_days
        );
        return {
          plant,
          daysUntilWatering,
          needsWater: daysUntilWatering <= 0,
        };
      });

      // Sort: overdue first, then by days until watering
      tasksData.sort((a, b) => a.daysUntilWatering - b.daysUntilWatering);

      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load care schedule');
    } finally {
      setLoading(false);
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

  const handleCompleteTask = async (plantId: string) => {
    try {
      const { error } = await supabase
        .from('plants')
        .update({ last_watered_at: new Date().toISOString() })
        .eq('id', plantId);

      if (error) throw error;

      toast.success('Task completed!');
      fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Leaf className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  const overdueCount = tasks.filter((t) => t.needsWater).length;

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
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Care Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {overdueCount > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 animate-fade-in">
              <p className="text-destructive font-semibold">
                🚨 {overdueCount} plant{overdueCount === 1 ? '' : 's'} need{overdueCount === 1 ? 's' : ''} watering!
              </p>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="text-center py-12 animate-fade-in">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No care tasks yet</h2>
              <p className="text-muted-foreground mb-6">
                Add plants to see their care schedule
              </p>
              <Button onClick={() => navigate('/')}>Identify a Plant</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.plant.id} className="animate-scale-in">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{task.plant.common_name}</span>
                      {task.needsWater ? (
                        <span className="text-sm text-destructive font-semibold">
                          Overdue by {Math.abs(task.daysUntilWatering)} day{Math.abs(task.daysUntilWatering) === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground font-normal">
                          In {task.daysUntilWatering} day{task.daysUntilWatering === 1 ? '' : 's'}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground italic">
                      {task.plant.scientific_name}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Watering every {task.plant.watering_frequency_days} days
                      </div>
                      <Button
                        size="sm"
                        variant={task.needsWater ? 'default' : 'outline'}
                        onClick={() => handleCompleteTask(task.plant.id)}
                      >
                        Mark as Watered
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
