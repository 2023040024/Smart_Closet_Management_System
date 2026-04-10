import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

type Tags = {
  type: string;
  style: string;
  mood: string;
  thickness: string;
  fit: string;
  material: string;
  point: string;
  color: string;
  season: string;
};

type Clothes = {
  id: string;
  image: string;
  tags: Tags;
};

type ClosetContextType = {
  clothes: Clothes[];
  addClothes: (item: Clothes) => void;
  deleteClothes: (id: string) => void;
};

const ClosetContext = createContext<ClosetContextType | null>(null);

export const ClosetProvider = ({ children }: { children: React.ReactNode }) => {
  const [clothes, setClothes] = useState<Clothes[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadClothes();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem('clothes', JSON.stringify(clothes));
  }, [clothes, loaded]);

  const loadClothes = async () => {
    try {
      const data = await AsyncStorage.getItem('clothes');
      if (data) {
        setClothes(JSON.parse(data));
      }
    } catch (error) {
      console.log('불러오기 오류:', error);
    } finally {
      setLoaded(true);
    }
  };

  const addClothes = (item: Clothes) => {
    setClothes((prev) => [...prev, item]);
  };

  const deleteClothes = (id: string) => {
    setClothes((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <ClosetContext.Provider value={{ clothes, addClothes, deleteClothes }}>
      {children}
    </ClosetContext.Provider>
  );
};

export const useCloset = () => {
  const context = useContext(ClosetContext);
  if (!context) {
    throw new Error('useCloset must be used within a ClosetProvider');
  }
  return context;
};