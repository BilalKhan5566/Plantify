import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Leaf, LogOut, Library, Calendar } from 'lucide-react';
import PlantIdentifier from '@/components/PlantIdentifier';
import { toast } from 'sonner';

interface IdentificationResult {
  commonName: string;
  scientificName: string;
  description: string;
  wateringFrequencyDays: number;
  probability: number;
  imageUrl: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        navigate('/auth');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleSavePlant = async () => {
    if (!result || !session) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('plants').insert({
        user_id: session.user.id,
        common_name: result.commonName,
        scientific_name: result.scientificName,
        description: result.description,
        image_url: result.imageUrl,
        watering_frequency_days: result.wateringFrequencyDays,
        last_watered_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Plant saved to your collection!');
      setResult(null);
      navigate('/my-plants');
    } catch (error) {
      console.error('Error saving plant:', error);
      toast.error('Failed to save plant');
    } finally {
      setSaving(false);
    }
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
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Leaf className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Plantify</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/my-plants')}
            >
              <Library className="h-4 w-4 mr-2" />
              My Plants
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2 animate-fade-in">
            <h2 className="text-4xl font-bold text-foreground">
              Discover Your Plants
            </h2>
            <p className="text-muted-foreground">
              Identify plants instantly and manage their care schedule
            </p>
          </div>

          {!result ? (
            <PlantIdentifier onIdentified={setResult} />
          ) : (
            <div className="space-y-4 animate-scale-in">
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <img
                  src={result.imageUrl}
                  alt={result.commonName}
                  className="w-full h-64 object-cover rounded-lg"
                />
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">{result.commonName}</h3>
                  <p className="text-sm text-muted-foreground italic">
                    {result.scientificName}
                  </p>
                  <p className="text-sm text-foreground">{result.description}</p>
                  <div className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Watering Schedule</p>
                      <p className="font-semibold">Every {result.wateringFrequencyDays} days</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="font-semibold">{Math.round(result.probability * 100)}%</p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={handleSavePlant}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? 'Saving...' : 'Add to My Plants'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                  >
                    Identify Another
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
