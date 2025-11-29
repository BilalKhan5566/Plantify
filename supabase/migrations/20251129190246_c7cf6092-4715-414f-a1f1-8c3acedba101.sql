-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create plants table
CREATE TABLE public.plants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  description TEXT,
  image_url TEXT,
  watering_frequency_days INTEGER DEFAULT 7,
  last_watered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on plants
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

-- Plants policies
CREATE POLICY "Users can view their own plants"
  ON public.plants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plants"
  ON public.plants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plants"
  ON public.plants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plants"
  ON public.plants FOR DELETE
  USING (auth.uid() = user_id);

-- Create care tasks table
CREATE TABLE public.care_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL DEFAULT 'watering',
  scheduled_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on care_tasks
ALTER TABLE public.care_tasks ENABLE ROW LEVEL SECURITY;

-- Care tasks policies
CREATE POLICY "Users can view care tasks for their plants"
  ON public.care_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.plants
    WHERE plants.id = care_tasks.plant_id
    AND plants.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert care tasks for their plants"
  ON public.care_tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.plants
    WHERE plants.id = care_tasks.plant_id
    AND plants.user_id = auth.uid()
  ));

CREATE POLICY "Users can update care tasks for their plants"
  ON public.care_tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.plants
    WHERE plants.id = care_tasks.plant_id
    AND plants.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete care tasks for their plants"
  ON public.care_tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.plants
    WHERE plants.id = care_tasks.plant_id
    AND plants.user_id = auth.uid()
  ));

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_plants_updated_at
  BEFORE UPDATE ON public.plants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();