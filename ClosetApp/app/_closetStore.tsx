import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from './_api';

export const TAG_OPTIONS = {
  category: ['상의', '하의', '아우터', '신발', '악세사리'] as const,
  topFit: ['슬림', '레귤러', '오버핏', '크롭'] as const,
  bottomFit: ['슬림', '스트레이트', '와이드', '조거', '테이퍼드'] as const,
  color: [
    '블랙', '화이트', '그레이', '차콜', '네이비', '베이지', '아이보리', 
    '브라운', '카멜', '카키', '올리브', '블루', '스카이블루', '레드', '핑크',
  ] as const,
  season: ['봄', '여름', '가을', '겨울', '사계절'] as const,
  tone: ['화사한', '선명한', '차분한', '진한'] as const,
  style: [
    '캐주얼', '세미캐주얼', '포멀', '미니멀', '스트릿', '댄디', 
    '스포티', '빈티지', '아메카지', '고프코어',
  ] as const,
  mood: ['활동적인', '세련된', '귀여운', '힙한', '차분한', '고급스러운'] as const,
  material: ['니트', '데님', '코튼', '래더', '나일론', '패딩'] as const,
  thickness: ['얇음', '보통', '두꺼움'] as const,
  point: ['프린팅', '레이어드', '컬러포인트', '무지', '스트라이프', '체크'] as const,
  tpo: ['데일리', '비즈니스', '면접', '결혼식', '장례식', '운동', '데이트', '미팅', '여행'] as const,
} as const;

export type Category = (typeof TAG_OPTIONS.category)[number];

export type ClothesTags = {
  category: Category | '';
  topFit: '' | (typeof TAG_OPTIONS.topFit)[number];
  bottomFit: '' | (typeof TAG_OPTIONS.bottomFit)[number];
  color: '' | (typeof TAG_OPTIONS.color)[number];
  season: '' | (typeof TAG_OPTIONS.season)[number];
  tone: '' | (typeof TAG_OPTIONS.tone)[number];
  style: '' | (typeof TAG_OPTIONS.style)[number];
  mood: '' | (typeof TAG_OPTIONS.mood)[number];
  material: '' | (typeof TAG_OPTIONS.material)[number];
  thickness: '' | (typeof TAG_OPTIONS.thickness)[number];
  point: '' | (typeof TAG_OPTIONS.point)[number];
  tpo: '' | (typeof TAG_OPTIONS.tpo)[number];
};

export type ClothesItem = {
  id: string;
  name: string;
  image: string;
  createdAt: string;
  tags: ClothesTags;
};

export const EMPTY_TAGS: ClothesTags = {
  category: '', topFit: '', bottomFit: '', color: '', season: '',
  tone: '', style: '', mood: '', material: '', thickness: '',
  point: '', tpo: '',
};

type ClosetContextType = {
  clothes: ClothesItem[];
  addClothes: (item: ClothesItem) => void;
  deleteClothes: (id: string) => void;
  updateClothes: (id: string, updated: Partial<ClothesItem>) => void;
  fetchClothes: (forceRefresh?: boolean) => Promise<void>;
};

const STORAGE_KEY = 'clothes-v3'; 
const ClosetContext = createContext<ClosetContextType | null>(null);

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

// ✅ 하얗게 뜨는 이미지 문제 해결을 위한 URL 변환 함수
function resolveImageUri(image?: string | null) {
  if (!image) return '';
  if (image.startsWith('http') || image.startsWith('file://')) return image;
  return image.startsWith('/') ? `${API_BASE_URL}${image}` : `${API_BASE_URL}/${image}`;
}

function normalizeClothesItem(raw: any): ClothesItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(raw.id || raw.clothes_id || '');
  const image = raw.image || raw.image_url;

  if (!id || typeof image !== 'string') return null;

  const s = raw.tags || {}; 

  const tags: ClothesTags = {
    category: s.category || raw.category || '',
    topFit: s.top_fit || s.topFit || raw.top_fit || raw.topFit || '',
    bottomFit: s.bottom_fit || s.bottomFit || raw.bottom_fit || raw.bottomFit || '',
    color: s.color || raw.color || '',
    season: s.season || raw.season || '',
    tone: s.tone || raw.tone || '',
    style: s.style || raw.style || '',
    mood: s.mood || raw.mood || '',
    material: s.material || raw.material || '',
    thickness: s.thickness || raw.thickness || '',
    point: s.point || raw.point || '',
    tpo: s.situation || s.tpo || raw.situation || raw.tpo || '',
  };

  return {
    id,
    name: raw.name || '이름 없음',
    image: resolveImageUri(image), // 이미지 경로 정상화
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    tags: tags,
  };
}

export function ClosetProvider({ children }: { children: React.ReactNode }) {
  const [clothes, setClothes] = useState<ClothesItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchClothes = async (forceRefresh = false) => {
    try {
      const response = await api.get('/clothes');
      if (response.data && Array.isArray(response.data)) {
        const normalized = response.data.map(normalizeClothesItem).filter(Boolean) as ClothesItem[];
        setClothes(normalized);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch (error) {
      console.log('❌ 옷 동기화 실패:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          setClothes(parsed.map(normalizeClothesItem).filter(Boolean));
        }
        await fetchClothes();
      } catch (e) {
        console.log('로드 실패:', e);
      } finally {
        setLoaded(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clothes));
    }
  }, [clothes, loaded]);

  const value = useMemo<ClosetContextType>(() => ({
    clothes,
    addClothes: (item: ClothesItem) => setClothes(prev => [item, ...prev]),
    deleteClothes: (id: string) => setClothes(prev => prev.filter(i => i.id !== id)),
    updateClothes: (id: string, updated: Partial<ClothesItem>) =>
      setClothes(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i)),
    fetchClothes,
  }), [clothes]);

  return <ClosetContext.Provider value={value}>{children}</ClosetContext.Provider>;
}

export function useCloset() {
  const context = useContext(ClosetContext);
  if (!context) throw new Error('useCloset must be used within a ClosetProvider');
  return context;
}

export default function ClosetStorePlaceholder() {
  return null;
}