import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const TAG_OPTIONS = {
  category: ['상의', '하의', '아우터', '신발', '악세사리'] as const,
  topFit: ['슬림', '레귤러', '오버핏', '크롭'] as const,
  bottomFit: ['슬림', '스트레이트', '와이드', '조거', '테이퍼드'] as const,
  color: [
    '블랙',
    '화이트',
    '그레이',
    '차콜',
    '네이비',
    '베이지',
    '아이보리',
    '브라운',
    '카멜',
    '카키',
    '올리브',
    '블루',
    '스카이블루',
    '레드',
    '핑크',
  ] as const,
  season: ['봄', '여름', '가을', '겨울', '사계절'] as const,
  tone: ['화사한', '선명한', '차분한', '진한'] as const,
  style: [
    '캐주얼',
    '세미캐주얼',
    '포멀',
    '미니멀',
    '스트릿',
    '댄디',
    '스포티',
    '빈티지',
    '아메카지',
    '고프코어',
  ] as const,
  mood: ['활동적인', '세련된', '귀여운', '힙한', '차분한', '고급스러운'] as const,
  material: ['니트', '데님', '코튼', '래더', '나일론', '패딩'] as const,
  thickness: ['얇음', '보통', '두꺼움'] as const,
  point: ['프린팅', '레이어드', '컬러포인트', '무지', '스트라이프', '체크'] as const,
  tpo: ['데일리', '비즈니스', '면접', '결혼식', '장례식', '운동', '데이트', '모임', '여행'] as const,
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
  image: string;
  createdAt: string;
  tags: ClothesTags;
};

export const EMPTY_TAGS: ClothesTags = {
  category: '',
  topFit: '',
  bottomFit: '',
  color: '',
  season: '',
  tone: '',
  style: '',
  mood: '',
  material: '',
  thickness: '',
  point: '',
  tpo: '',
};

type ClosetContextType = {
  clothes: ClothesItem[];
  addClothes: (item: ClothesItem) => void;
  deleteClothes: (id: string) => void;
  updateClothes: (id: string, updated: Partial<ClothesItem>) => void;
};

const STORAGE_KEY = 'clothes-v2';

const ClosetContext = createContext<ClosetContextType | null>(null);

function normalizeLegacyTags(rawTags: Record<string, unknown> | undefined): ClothesTags {
  const tags = rawTags ?? {};

  const legacyType = typeof tags.type === 'string' ? tags.type : '';
  const legacyFit = typeof tags.fit === 'string' ? tags.fit : '';

  const category = (typeof tags.category === 'string' ? tags.category : legacyType) as ClothesTags['category'];

  const normalized: ClothesTags = {
    category: TAG_OPTIONS.category.includes(category as Category) ? category : '',
    topFit: '',
    bottomFit: '',
    color: '',
    season: '',
    tone: '',
    style: '',
    mood: '',
    material: '',
    thickness: '',
    point: '',
    tpo: '',
  };

  const setIfValid = <K extends keyof ClothesTags>(
    key: K,
    value: unknown,
    options: readonly string[],
  ) => {
    if (typeof value === 'string' && options.includes(value)) {
      normalized[key] = value as ClothesTags[K];
    }
  };

  setIfValid('color', tags.color, TAG_OPTIONS.color);
  setIfValid('season', tags.season, TAG_OPTIONS.season);
  setIfValid('tone', tags.tone, TAG_OPTIONS.tone);
  setIfValid('style', tags.style, TAG_OPTIONS.style);
  setIfValid('mood', tags.mood, TAG_OPTIONS.mood);
  setIfValid('material', tags.material, TAG_OPTIONS.material);
  setIfValid('thickness', tags.thickness, TAG_OPTIONS.thickness);
  setIfValid('point', tags.point, TAG_OPTIONS.point);
  setIfValid('tpo', tags.tpo, TAG_OPTIONS.tpo);
  setIfValid('topFit', tags.topFit, TAG_OPTIONS.topFit);
  setIfValid('bottomFit', tags.bottomFit, TAG_OPTIONS.bottomFit);

  if (!normalized.topFit && TAG_OPTIONS.topFit.includes(legacyFit as (typeof TAG_OPTIONS.topFit)[number])) {
    normalized.topFit = legacyFit as ClothesTags['topFit'];
  }

  if (!normalized.bottomFit && TAG_OPTIONS.bottomFit.includes(legacyFit as (typeof TAG_OPTIONS.bottomFit)[number])) {
    normalized.bottomFit = legacyFit as ClothesTags['bottomFit'];
  }

  return normalized;
}

function normalizeClothesItem(raw: any): ClothesItem | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || typeof raw.image !== 'string') return null;

  return {
    id: raw.id,
    image: raw.image,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    tags: normalizeLegacyTags(raw.tags),
  };
}

export function getVisibleTagEntries(tags: ClothesTags) {
  const entries: Array<{ label: string; value: string }> = [{ label: '카테고리', value: tags.category }];

  if (tags.category === '상의' && tags.topFit) {
    entries.push({ label: '상의 핏', value: tags.topFit });
  }

  if (tags.category === '하의' && tags.bottomFit) {
    entries.push({ label: '하의 핏', value: tags.bottomFit });
  }

  const orderedFields: Array<{ label: string; value: string }> = [
    { label: '색', value: tags.color },
    { label: '계절', value: tags.season },
    { label: '톤', value: tags.tone },
    { label: '스타일', value: tags.style },
    { label: '분위기', value: tags.mood },
    { label: '소재', value: tags.material },
    { label: '두께', value: tags.thickness },
    { label: '포인트', value: tags.point },
    { label: 'TPO', value: tags.tpo },
  ];

  return [...entries, ...orderedFields].filter((entry) => entry.value);
}

export function ClosetProvider({ children }: { children: React.ReactNode }) {
  const [clothes, setClothes] = useState<ClothesItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadClothes = async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (!data) return;

        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setClothes(parsed.map(normalizeClothesItem).filter(Boolean) as ClothesItem[]);
        }
      } catch (error) {
        console.log('불러오기 오류:', error);
      } finally {
        setLoaded(true);
      }
    };

    loadClothes();
  }, []);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clothes)).catch((error) => {
      console.log('저장 오류:', error);
    });
  }, [clothes, loaded]);

  const value = useMemo<ClosetContextType>(
    () => ({
      clothes,
      addClothes: (item) => setClothes((prev) => [item, ...prev]),
      deleteClothes: (id) => setClothes((prev) => prev.filter((item) => item.id !== id)),
      updateClothes: (id, updated) =>
        setClothes((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...updated } : item)),
        ),
    }),
    [clothes],
  );

  return <ClosetContext.Provider value={value}>{children}</ClosetContext.Provider>;
}

export function useCloset() {
  const context = useContext(ClosetContext);
  if (!context) {
    throw new Error('useCloset must be used within a ClosetProvider');
  }
  return context;
}