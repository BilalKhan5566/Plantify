import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Leaf, LogOut, Calendar, Menu, User, Flower2 } from 'lucide-react';
import PlantIdentifier from '@/components/PlantIdentifier';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface IdentificationResult {
  commonName: string;
  scientificName: string;
  about: string;
  explanation: string;
  additionalInfo: string[];
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        description: `${result.about}\n\n${result.explanation}\n\n${result.additionalInfo.join('\n')}`,
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Video */}
      <div className="fixed inset-0 -z-10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        >
          <source src="https://cdn.pixabay.com/video/2022/11/07/138314-770049062_large.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-br from-background/50 via-secondary/10 to-accent/5" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover-scale" 
            onClick={() => setResult(null)}
          >
            <Leaf className="h-8 w-8 text-primary animate-pulse" style={{ animationDuration: '3s' }} />
            <h1 className="text-2xl font-bold text-foreground">Plantify</h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/my-plants')}
              className="hover-scale"
            >
              <Flower2 className="h-4 w-4 mr-2" />
              My Plants
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="hover-scale"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            
            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hover-scale">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-md border-border z-50">
                <DropdownMenuItem onClick={() => toast.info('Profile feature coming soon')}>
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('History feature coming soon')}>
                  Delete History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Navigation */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col space-y-4 mt-8">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    navigate('/my-plants');
                    setMobileMenuOpen(false);
                  }}
                >
                  <Flower2 className="h-5 w-5 mr-3" />
                  My Plants
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    navigate('/dashboard');
                    setMobileMenuOpen(false);
                  }}
                >
                  <Calendar className="h-5 w-5 mr-3" />
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    toast.info('Profile feature coming soon');
                    setMobileMenuOpen(false);
                  }}
                >
                  <User className="h-5 w-5 mr-3" />
                  View Profile
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    toast.info('History feature coming soon');
                    setMobileMenuOpen(false);
                  }}
                >
                  Delete History
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary to-accent">
              Discover Your Plants
            </h2>
            <p className="text-muted-foreground text-lg">
              Identify plants instantly and manage their care schedule
            </p>
          </div>

          {!result ? (
            <PlantIdentifier onIdentified={setResult} />
          ) : (
            <div className="space-y-4 animate-scale-in">
              <div className="bg-card/90 backdrop-blur-md border border-border rounded-xl p-6 md:p-8 space-y-6 shadow-xl hover-scale">
                <img
                  src={result.imageUrl}
                  alt={result.commonName}
                  className="w-full h-64 md:h-80 object-cover rounded-xl shadow-lg"
                />
                
                <div className="space-y-5">
                  {/* Header */}
                  <div className="space-y-2 border-b border-border pb-4">
                    <h3 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                      {result.commonName}
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground italic">
                      {result.scientificName}
                    </p>
                    <div className="flex items-center gap-4 pt-2">
                      <div className="bg-primary/10 px-3 py-1 rounded-full">
                        <p className="text-xs text-primary font-medium">
                          {Math.round(result.probability * 100)}% Match
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* About Section */}
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-primary">About</h4>
                    <p className="text-sm md:text-base text-foreground leading-relaxed">
                      {result.about}
                    </p>
                  </div>

                  {/* Explanation Section */}
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-primary">Explanation</h4>
                    <p className="text-sm md:text-base text-foreground leading-relaxed">
                      {result.explanation}
                    </p>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-primary">Additional Information</h4>
                    <ul className="space-y-2">
                      {result.additionalInfo.map((info, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm md:text-base text-foreground">
                          <span className="text-accent mt-1">•</span>
                          <span className="leading-relaxed">{info}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                  <Button
                    onClick={handleSavePlant}
                    disabled={saving}
                    className="flex-1 hover-scale"
                  >
                    {saving ? 'Saving...' : 'Add to My Plants'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                    className="hover-scale"
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
