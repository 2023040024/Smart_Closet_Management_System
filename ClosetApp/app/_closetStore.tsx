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

const ClosetContext = createContext<any>(null);

export const ClosetProvider = ({ children }: any) => {
  const [clothes, setClothes] = useState<Clothes[]>([]);

  useEffect(() => {
    loadClothes();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('clothes', JSON.stringify(clothes));
  }, [clothes]);

  const loadClothes = async () => {
    const data = await AsyncStorage.getItem('clothes');
    if (data) setClothes(JSON.parse(data));
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

export const useCloset = () => useContext(ClosetContext);