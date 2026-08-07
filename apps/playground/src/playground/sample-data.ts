export type ThroughputRow = {
  month: string;
  melange: number;
  water: number;
  thrift: number;
  wind: number;
  silica: number;
};

export const throughput: ThroughputRow[] = [
  { month: 'Jan', melange: 42, water: 28, thrift: 18, wind: 22, silica: 14 },
  { month: 'Feb', melange: 48, water: 26, thrift: 21, wind: 25, silica: 16 },
  { month: 'Mar', melange: 55, water: 31, thrift: 24, wind: 19, silica: 18 },
  { month: 'Apr', melange: 61, water: 29, thrift: 27, wind: 28, silica: 20 },
  { month: 'May', melange: 58, water: 34, thrift: 30, wind: 24, silica: 22 },
  { month: 'Jun', melange: 67, water: 33, thrift: 29, wind: 31, silica: 19 },
  { month: 'Jul', melange: 72, water: 38, thrift: 33, wind: 27, silica: 25 },
  { month: 'Aug', melange: 69, water: 36, thrift: 35, wind: 34, silica: 23 },
  { month: 'Sep', melange: 76, water: 41, thrift: 38, wind: 30, silica: 27 },
  { month: 'Oct', melange: 81, water: 39, thrift: 42, wind: 36, silica: 29 },
  { month: 'Nov', melange: 74, water: 44, thrift: 40, wind: 33, silica: 26 },
  { month: 'Dec', melange: 88, water: 47, thrift: 45, wind: 38, silica: 31 },
];

export const THROUGHPUT_KEYS = ['melange', 'water', 'thrift', 'wind', 'silica'] as const;

export const throughputConfig = {
  melange: { label: 'Melange' },
  water: { label: 'Water' },
  thrift: { label: 'Thrift' },
  wind: { label: 'Wind' },
  silica: { label: 'Silica' },
} as const;

export type ShareSlice = { name: string; value: number };

export const shareSlices: ShareSlice[] = [
  { name: 'melange', value: 42 },
  { name: 'water', value: 28 },
  { name: 'thrift', value: 18 },
  { name: 'wind', value: 8 },
  { name: 'silica', value: 4 },
];

export type RadarRow = {
  axis: string;
  melange: number;
  water: number;
  thrift: number;
};

export const radarData: RadarRow[] = [
  { axis: 'Yield', melange: 86, water: 62, thrift: 54 },
  { axis: 'Purity', melange: 72, water: 88, thrift: 60 },
  { axis: 'Reach', melange: 64, water: 58, thrift: 90 },
  { axis: 'Speed', melange: 78, water: 70, thrift: 66 },
  { axis: 'Risk', melange: 48, water: 74, thrift: 52 },
  { axis: 'Stock', melange: 90, water: 55, thrift: 70 },
];
